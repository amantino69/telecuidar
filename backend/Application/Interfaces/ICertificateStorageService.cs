using Application.DTOs.Certificates;

namespace Application.Interfaces;

public interface ICertificateStorageService
{
    /// <summary>
    /// Lista todos os certificados salvos de um profissional
    /// </summary>
    Task<IEnumerable<SavedCertificateDto>> GetSavedCertificatesAsync(Guid professionalId);
    
    /// <summary>
    /// Valida um arquivo PFX e retorna suas informações
    /// </summary>
    Task<PfxValidationResultDto> ValidatePfxAsync(string pfxBase64, string password);
    
    /// <summary>
    /// Salva um novo certificado para o profissional
    /// </summary>
    Task<SavedCertificateDto> SaveCertificateAsync(Guid professionalId, SaveCertificateRequestDto request);
    
    /// <summary>
    /// Remove um certificado salvo
    /// </summary>
    Task DeleteCertificateAsync(Guid professionalId, Guid certificateId);
    
    /// <summary>
    /// Atualiza configurações de um certificado
    /// </summary>
    Task<SavedCertificateDto> UpdateCertificateAsync(Guid professionalId, Guid certificateId, UpdateCertificateRequestDto request);
    
    /// <summary>
    /// Obtém os bytes do PFX descriptografado para uso em assinatura
    /// </summary>
    Task<(byte[] pfxBytes, string password)> GetCertificateForSigningAsync(Guid professionalId, Guid certificateId, string? password = null);

    /// <summary>
    /// Valida a senha de um certificado salvo
    /// </summary>
    Task<bool> ValidateSavedCertificatePasswordAsync(Guid professionalId, Guid certificateId, string password);
}
