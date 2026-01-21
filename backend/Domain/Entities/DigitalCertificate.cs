using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Representa um certificado digital A1 (.pfx) armazenado pelo profissional
/// para uso em assinaturas digitais de documentos médicos
/// </summary>
public class DigitalCertificate : BaseEntity
{
    /// <summary>
    /// ID do profissional dono do certificado
    /// </summary>
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Nome amigável dado pelo usuário para identificar o certificado
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;
    
    /// <summary>
    /// Subject (CN) do certificado
    /// </summary>
    public string Subject { get; set; } = string.Empty;
    
    /// <summary>
    /// Emissor do certificado
    /// </summary>
    public string Issuer { get; set; } = string.Empty;
    
    /// <summary>
    /// Thumbprint (impressão digital) único do certificado
    /// </summary>
    public string Thumbprint { get; set; } = string.Empty;
    
    /// <summary>
    /// CPF extraído do certificado (quando disponível)
    /// </summary>
    public string? CpfFromCertificate { get; set; }
    
    /// <summary>
    /// Nome extraído do certificado (quando disponível)
    /// </summary>
    public string? NameFromCertificate { get; set; }
    
    /// <summary>
    /// Data de validade do certificado
    /// </summary>
    public DateTime ExpirationDate { get; set; }
    
    /// <summary>
    /// Data de emissão do certificado
    /// </summary>
    public DateTime IssuedDate { get; set; }
    
    /// <summary>
    /// Arquivo .pfx criptografado em Base64
    /// A senha usada para criptografar é derivada da senha do certificado + chave do sistema
    /// </summary>
    public string EncryptedPfxBase64 { get; set; } = string.Empty;
    
    /// <summary>
    /// Se true, o sistema armazena a senha criptografada para uso rápido.
    /// Se false, o usuário precisa informar a senha sempre que for assinar.
    /// </summary>
    public bool QuickUseEnabled { get; set; } = false;
    
    /// <summary>
    /// Senha criptografada (apenas se QuickUseEnabled = true)
    /// </summary>
    public string? EncryptedPassword { get; set; }
    
    /// <summary>
    /// IV (Initialization Vector) usado na criptografia
    /// </summary>
    public string EncryptionIV { get; set; } = string.Empty;
    
    /// <summary>
    /// Se o certificado está ativo (pode ser desativado sem excluir)
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// Última vez que o certificado foi usado para assinar
    /// </summary>
    public DateTime? LastUsedAt { get; set; }
    
    // Navigation property
    public User User { get; set; } = null!;
}
