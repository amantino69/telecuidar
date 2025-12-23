namespace Application.DTOs.Certificates;

/// <summary>
/// Informações de um certificado salvo (retornado ao frontend)
/// </summary>
public class SavedCertificateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string IssuerName { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public string Thumbprint { get; set; } = string.Empty;
    public bool RequirePasswordOnUse { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO para salvar um novo certificado
/// </summary>
public class SaveCertificateRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string PfxBase64 { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RequirePasswordOnUse { get; set; }
}

/// <summary>
/// DTO para validar um arquivo PFX
/// </summary>
public class ValidatePfxRequestDto
{
    public string PfxBase64 { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Resultado da validação de um PFX
/// </summary>
public class PfxValidationResultDto
{
    public string SubjectName { get; set; } = string.Empty;
    public string IssuerName { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public string Thumbprint { get; set; } = string.Empty;
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// DTO para atualizar um certificado
/// </summary>
public class UpdateCertificateRequestDto
{
    public string? Name { get; set; }
    public bool? RequirePasswordOnUse { get; set; }
}

/// <summary>
/// DTO para usar um certificado salvo para assinar
/// </summary>
public class UseSavedCertificateDto
{
    public Guid CertificateId { get; set; }
    public string? Password { get; set; } // Só necessário se RequirePasswordOnUse = true
}

/// <summary>
/// DTO para validar senha de um certificado salvo
/// </summary>
public class ValidatePasswordRequestDto
{
    public string Password { get; set; } = string.Empty;
}
