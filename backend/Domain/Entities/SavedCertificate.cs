using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Certificado digital salvo na plataforma (PFX criptografado)
/// Pertence a um profissional específico
/// </summary>
public class SavedCertificate : BaseEntity
{
    /// <summary>
    /// Nome amigável dado pelo usuário
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// ID do profissional dono do certificado
    /// </summary>
    public Guid ProfessionalId { get; set; }
    
    /// <summary>
    /// Subject Name do certificado (CN, O, etc)
    /// </summary>
    public string SubjectName { get; set; } = string.Empty;
    
    /// <summary>
    /// Issuer Name (quem emitiu o certificado)
    /// </summary>
    public string IssuerName { get; set; } = string.Empty;
    
    /// <summary>
    /// Data de início da validade
    /// </summary>
    public DateTime ValidFrom { get; set; }
    
    /// <summary>
    /// Data de fim da validade
    /// </summary>
    public DateTime ValidTo { get; set; }
    
    /// <summary>
    /// Thumbprint (impressão digital) do certificado
    /// </summary>
    public string Thumbprint { get; set; } = string.Empty;
    
    /// <summary>
    /// Arquivo PFX criptografado (base64)
    /// A senha original é usada para re-criptografar com uma chave do sistema
    /// </summary>
    public string EncryptedPfxData { get; set; } = string.Empty;
    
    /// <summary>
    /// Se true, pede senha toda vez que for usar o certificado
    /// Se false, usa automaticamente sem pedir senha
    /// </summary>
    public bool RequirePasswordOnUse { get; set; }
    
    /// <summary>
    /// Senha criptografada (só armazenada se RequirePasswordOnUse = false)
    /// </summary>
    public string? EncryptedPassword { get; set; }
    
    // Navegação
    public User? Professional { get; set; }
}
