using Domain.Common;

namespace Domain.Entities;

public class Prescription : BaseEntity
{
    public Guid AppointmentId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid PatientId { get; set; }
    
    /// <summary>
    /// JSON array of PrescriptionItem objects
    /// </summary>
    public string ItemsJson { get; set; } = "[]";
    
    /// <summary>
    /// Digital signature in Base64 (ICP-Brasil)
    /// </summary>
    public string? DigitalSignature { get; set; }
    
    /// <summary>
    /// Certificate thumbprint used for signing
    /// </summary>
    public string? CertificateThumbprint { get; set; }
    
    /// <summary>
    /// Certificate subject (CN)
    /// </summary>
    public string? CertificateSubject { get; set; }
    
    /// <summary>
    /// When the document was signed
    /// </summary>
    public DateTime? SignedAt { get; set; }
    
    /// <summary>
    /// Unique hash of the document for validation
    /// </summary>
    public string? DocumentHash { get; set; }
    
    /// <summary>
    /// Signed PDF stored as Base64
    /// </summary>
    public string? SignedPdfBase64 { get; set; }
    
    // Navigation properties
    public Appointment Appointment { get; set; } = null!;
    public User Professional { get; set; } = null!;
    public User Patient { get; set; } = null!;
}

/// <summary>
/// Represents a single prescription item (medication)
/// </summary>
public class PrescriptionItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Medicamento { get; set; } = string.Empty;
    public string? CodigoAnvisa { get; set; }
    public string Dosagem { get; set; } = string.Empty;
    public string Frequencia { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public string Posologia { get; set; } = string.Empty;
    public string? Observacoes { get; set; }
}
