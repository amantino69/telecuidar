namespace Application.DTOs.Certificates;

/// <summary>
/// DTO para visualização de certificado digital (sem dados sensíveis)
/// </summary>
public class DigitalCertificateDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Thumbprint { get; set; } = string.Empty;
    public string? CpfFromCertificate { get; set; }
    public string? NameFromCertificate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public DateTime IssuedDate { get; set; }
    public bool QuickUseEnabled { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsExpired => DateTime.UtcNow > ExpirationDate;
    public int DaysUntilExpiration => (ExpirationDate - DateTime.UtcNow).Days;
}

/// <summary>
/// DTO para validar um certificado antes de salvar
/// </summary>
public class ValidateCertificateDto
{
    public string PfxBase64 { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Resultado da validação do certificado
/// </summary>
public class CertificateValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Thumbprint { get; set; } = string.Empty;
    public string? CpfFromCertificate { get; set; }
    public string? NameFromCertificate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public DateTime IssuedDate { get; set; }
    public bool IsExpired { get; set; }
    public int DaysUntilExpiration { get; set; }
}

/// <summary>
/// DTO para salvar um certificado digital
/// </summary>
public class SaveCertificateDto
{
    public string PfxBase64 { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool QuickUseEnabled { get; set; } = false;
}

/// <summary>
/// DTO para atualizar um certificado digital
/// </summary>
public class UpdateCertificateDto
{
    public string? DisplayName { get; set; }
    public bool? QuickUseEnabled { get; set; }
    /// <summary>
    /// Senha atual (necessária se mudar QuickUseEnabled para true)
    /// </summary>
    public string? Password { get; set; }
}

/// <summary>
/// DTO para solicitar assinatura de documento
/// </summary>
public class SignDocumentRequestDto
{
    /// <summary>
    /// ID do certificado salvo a usar (opcional se usar one-time)
    /// </summary>
    public Guid? CertificateId { get; set; }
    
    /// <summary>
    /// Senha do certificado (necessária se QuickUse não estiver habilitado)
    /// </summary>
    public string? Password { get; set; }
    
    /// <summary>
    /// Se usar certificado one-time (sem salvar), enviar o PFX aqui
    /// </summary>
    public string? OneTimePfxBase64 { get; set; }
    
    /// <summary>
    /// Tipo do documento: "prescription" ou "certificate"
    /// </summary>
    public string DocumentType { get; set; } = string.Empty;
    
    /// <summary>
    /// ID do documento a assinar
    /// </summary>
    public Guid DocumentId { get; set; }
}

/// <summary>
/// Resultado da assinatura
/// </summary>
public class SignDocumentResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? DocumentHash { get; set; }
    public string? CertificateSubject { get; set; }
    public DateTime? SignedAt { get; set; }
}

/// <summary>
/// DTO para salvar e assinar de uma vez
/// </summary>
public class SaveCertificateAndSignDto
{
    public string PfxBase64 { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool QuickUseEnabled { get; set; } = false;
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
}
