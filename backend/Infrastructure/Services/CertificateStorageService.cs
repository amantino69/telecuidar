using Application.DTOs.Certificates;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Org.BouncyCastle.Pkcs;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace Infrastructure.Services;

public class CertificateStorageService : ICertificateStorageService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CertificateStorageService> _logger;
    private readonly byte[] _encryptionKey;

    public CertificateStorageService(
        ApplicationDbContext context,
        ILogger<CertificateStorageService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        
        // Usar uma chave de criptografia do configuration
        var keyString = configuration["CertificateEncryption:Key"] 
            ?? "TeleCuidarCertificateStorageKey!2024";
        _encryptionKey = SHA256.HashData(Encoding.UTF8.GetBytes(keyString));
    }

    public async Task<IEnumerable<SavedCertificateDto>> GetSavedCertificatesAsync(Guid professionalId)
    {
        var certificates = await _context.SavedCertificates
            .Where(c => c.ProfessionalId == professionalId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return certificates.Select(c => new SavedCertificateDto
        {
            Id = c.Id,
            Name = c.Name,
            SubjectName = c.SubjectName,
            IssuerName = c.IssuerName,
            ValidFrom = c.ValidFrom,
            ValidTo = c.ValidTo,
            Thumbprint = c.Thumbprint,
            RequirePasswordOnUse = c.RequirePasswordOnUse,
            CreatedAt = c.CreatedAt
        });
    }

    public Task<PfxValidationResultDto> ValidatePfxAsync(string pfxBase64, string password)
    {
        try
        {
            var pfxBytes = Convert.FromBase64String(pfxBase64);
            using var cert = X509CertificateLoader.LoadPkcs12(pfxBytes, password);

            var now = DateTime.UtcNow;
            var isValid = now >= cert.NotBefore && now <= cert.NotAfter;

            return Task.FromResult(new PfxValidationResultDto
            {
                SubjectName = cert.Subject,
                IssuerName = cert.Issuer,
                ValidFrom = cert.NotBefore,
                ValidTo = cert.NotAfter,
                Thumbprint = cert.Thumbprint,
                IsValid = isValid,
                ErrorMessage = isValid ? null : "Certificado expirado ou ainda nao valido"
            });
        }
        catch (CryptographicException ex)
        {
            _logger.LogWarning(ex, "Erro ao validar PFX - senha incorreta ou arquivo invalido");
            return Task.FromResult(new PfxValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Senha incorreta ou arquivo PFX invalido"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao validar PFX");
            return Task.FromResult(new PfxValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Erro ao processar o arquivo PFX"
            });
        }
    }

    public async Task<SavedCertificateDto> SaveCertificateAsync(Guid professionalId, SaveCertificateRequestDto request)
    {
        // Validar o PFX primeiro
        var validation = await ValidatePfxAsync(request.PfxBase64, request.Password);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage ?? "Certificado invalido");
        }

        // Verificar se já existe um certificado com o mesmo thumbprint
        var existing = await _context.SavedCertificates
            .FirstOrDefaultAsync(c => c.ProfessionalId == professionalId && c.Thumbprint == validation.Thumbprint);
        
        if (existing != null)
        {
            throw new InvalidOperationException("Este certificado ja esta salvo na plataforma");
        }

        // Criptografar o PFX e a senha
        var encryptedPfx = Encrypt(request.PfxBase64);
        string? encryptedPassword = null;
        
        if (!request.RequirePasswordOnUse)
        {
            // Só salva a senha se não for pedir toda vez
            encryptedPassword = Encrypt(request.Password);
        }

        var savedCert = new SavedCertificate
        {
            Id = Guid.NewGuid(),
            ProfessionalId = professionalId,
            Name = string.IsNullOrWhiteSpace(request.Name) 
                ? ExtractCommonName(validation.SubjectName) 
                : request.Name,
            SubjectName = validation.SubjectName,
            IssuerName = validation.IssuerName,
            ValidFrom = validation.ValidFrom,
            ValidTo = validation.ValidTo,
            Thumbprint = validation.Thumbprint,
            EncryptedPfxData = encryptedPfx,
            EncryptedPassword = encryptedPassword,
            RequirePasswordOnUse = request.RequirePasswordOnUse,
            CreatedAt = DateTime.UtcNow
        };

        _context.SavedCertificates.Add(savedCert);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Certificado salvo para profissional {ProfessionalId}: {Thumbprint}", 
            professionalId, validation.Thumbprint);

        return new SavedCertificateDto
        {
            Id = savedCert.Id,
            Name = savedCert.Name,
            SubjectName = savedCert.SubjectName,
            IssuerName = savedCert.IssuerName,
            ValidFrom = savedCert.ValidFrom,
            ValidTo = savedCert.ValidTo,
            Thumbprint = savedCert.Thumbprint,
            RequirePasswordOnUse = savedCert.RequirePasswordOnUse,
            CreatedAt = savedCert.CreatedAt
        };
    }

    public async Task DeleteCertificateAsync(Guid professionalId, Guid certificateId)
    {
        var cert = await _context.SavedCertificates
            .FirstOrDefaultAsync(c => c.Id == certificateId && c.ProfessionalId == professionalId);

        if (cert == null)
        {
            throw new KeyNotFoundException("Certificado nao encontrado");
        }

        _context.SavedCertificates.Remove(cert);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Certificado removido: {CertificateId}", certificateId);
    }

    public async Task<SavedCertificateDto> UpdateCertificateAsync(
        Guid professionalId, 
        Guid certificateId, 
        UpdateCertificateRequestDto request)
    {
        var cert = await _context.SavedCertificates
            .FirstOrDefaultAsync(c => c.Id == certificateId && c.ProfessionalId == professionalId);

        if (cert == null)
        {
            throw new KeyNotFoundException("Certificado nao encontrado");
        }

        if (request.Name != null)
        {
            cert.Name = request.Name;
        }

        if (request.RequirePasswordOnUse.HasValue)
        {
            // Se está mudando para pedir senha, limpar a senha salva
            if (request.RequirePasswordOnUse.Value && !cert.RequirePasswordOnUse)
            {
                cert.EncryptedPassword = null;
            }
            cert.RequirePasswordOnUse = request.RequirePasswordOnUse.Value;
        }

        cert.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new SavedCertificateDto
        {
            Id = cert.Id,
            Name = cert.Name,
            SubjectName = cert.SubjectName,
            IssuerName = cert.IssuerName,
            ValidFrom = cert.ValidFrom,
            ValidTo = cert.ValidTo,
            Thumbprint = cert.Thumbprint,
            RequirePasswordOnUse = cert.RequirePasswordOnUse,
            CreatedAt = cert.CreatedAt
        };
    }

    public async Task<(byte[] pfxBytes, string password)> GetCertificateForSigningAsync(
        Guid professionalId, 
        Guid certificateId, 
        string? password = null)
    {
        var cert = await _context.SavedCertificates
            .FirstOrDefaultAsync(c => c.Id == certificateId && c.ProfessionalId == professionalId);

        if (cert == null)
        {
            throw new KeyNotFoundException("Certificado nao encontrado");
        }

        // Descriptografar o PFX
        var pfxBase64 = Decrypt(cert.EncryptedPfxData);
        var pfxBytes = Convert.FromBase64String(pfxBase64);

        // Obter a senha
        string certPassword;
        if (cert.RequirePasswordOnUse)
        {
            if (string.IsNullOrEmpty(password))
            {
                throw new InvalidOperationException("Senha do certificado e obrigatoria");
            }
            certPassword = password;
            
            // Validar a senha
            try
            {
                using var _ = X509CertificateLoader.LoadPkcs12(pfxBytes, certPassword);
            }
            catch
            {
                throw new InvalidOperationException("Senha do certificado incorreta");
            }
        }
        else
        {
            if (string.IsNullOrEmpty(cert.EncryptedPassword))
            {
                throw new InvalidOperationException("Senha do certificado nao encontrada");
            }
            certPassword = Decrypt(cert.EncryptedPassword);
        }

        return (pfxBytes, certPassword);
    }

    #region Encryption Helpers

    private string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = _encryptionKey;
        aes.GenerateIV();

        var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        var plainBytes = Encoding.UTF8.GetBytes(plainText);

        using var ms = new MemoryStream();
        // Escrever o IV no início
        ms.Write(aes.IV, 0, aes.IV.Length);
        
        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        {
            cs.Write(plainBytes, 0, plainBytes.Length);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    private string Decrypt(string cipherText)
    {
        var cipherBytes = Convert.FromBase64String(cipherText);

        using var aes = Aes.Create();
        aes.Key = _encryptionKey;

        // Ler o IV do início dos dados
        var iv = new byte[aes.BlockSize / 8];
        Array.Copy(cipherBytes, 0, iv, 0, iv.Length);
        aes.IV = iv;

        var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);

        using var ms = new MemoryStream(cipherBytes, iv.Length, cipherBytes.Length - iv.Length);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var reader = new StreamReader(cs);
        
        return reader.ReadToEnd();
    }

    private static string ExtractCommonName(string subjectName)
    {
        var parts = subjectName.Split(',');
        foreach (var part in parts)
        {
            var trimmed = part.Trim();
            if (trimmed.StartsWith("CN=", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed.Substring(3).Trim();
            }
        }
        return subjectName;
    }

    #endregion

    public async Task<bool> ValidateSavedCertificatePasswordAsync(Guid professionalId, Guid certificateId, string password)
    {
        var cert = await _context.SavedCertificates
            .FirstOrDefaultAsync(c => c.Id == certificateId && c.ProfessionalId == professionalId);

        if (cert == null)
        {
            throw new KeyNotFoundException("Certificado nao encontrado");
        }

        try
        {
            // Descriptografar o PFX
            var pfxBase64 = Decrypt(cert.EncryptedPfxData);
            var pfxBytes = Convert.FromBase64String(pfxBase64);

            // Tentar carregar o certificado com a senha fornecida
            var builder = new Pkcs12StoreBuilder();
            var store = builder.Build();
            store.Load(new MemoryStream(pfxBytes), password.ToCharArray());
            
            // Se chegou aqui, a senha está correta
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Falha na validacao de senha do certificado {CertificateId}: {Error}", certificateId, ex.Message);
            return false;
        }
    }
}
