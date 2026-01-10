using Application.DTOs.Certificates;

namespace Application.Interfaces;

public interface IDigitalCertificateService
{
    /// <summary>
    /// Obtém todos os certificados de um usuário
    /// </summary>
    Task<List<DigitalCertificateDto>> GetCertificatesByUserIdAsync(Guid userId);
    
    /// <summary>
    /// Obtém um certificado pelo ID
    /// </summary>
    Task<DigitalCertificateDto?> GetCertificateByIdAsync(Guid id, Guid userId);
    
    /// <summary>
    /// Valida um certificado PFX sem salvar
    /// </summary>
    Task<CertificateValidationResult> ValidateCertificateAsync(ValidateCertificateDto dto);
    
    /// <summary>
    /// Salva um novo certificado
    /// </summary>
    Task<DigitalCertificateDto> SaveCertificateAsync(SaveCertificateDto dto, Guid userId);
    
    /// <summary>
    /// Atualiza um certificado existente
    /// </summary>
    Task<DigitalCertificateDto?> UpdateCertificateAsync(Guid id, UpdateCertificateDto dto, Guid userId);
    
    /// <summary>
    /// Remove um certificado
    /// </summary>
    Task<bool> DeleteCertificateAsync(Guid id, Guid userId);
    
    /// <summary>
    /// Assina um documento (receita ou atestado)
    /// </summary>
    Task<SignDocumentResult> SignDocumentAsync(SignDocumentRequestDto dto, Guid userId);
    
    /// <summary>
    /// Salva certificado e assina documento em uma operação
    /// </summary>
    Task<(DigitalCertificateDto Certificate, SignDocumentResult SignResult)> SaveCertificateAndSignAsync(
        SaveCertificateAndSignDto dto, Guid userId);
}
