using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public class Appointment : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpecialtyId { get; set; }
    public DateTime Date { get; set; }
    public TimeSpan Time { get; set; }
    public TimeSpan? EndTime { get; set; }
    public AppointmentType Type { get; set; }
    public AppointmentStatus Status { get; set; }
    public string? Observation { get; set; }
    public string? MeetLink { get; set; }
    public string? PreConsultationJson { get; set; } // Store PreConsultationForm as JSON
    public string? BiometricsJson { get; set; } // Store BiometricsData as JSON
    public string? AttachmentsChatJson { get; set; } // Store AttachmentMessage[] as JSON
    
    // Clinical Data
    public string? AnamnesisJson { get; set; } // Store Anamnesis data as JSON
    public string? SoapJson { get; set; } // Store SOAP notes as JSON
    public string? SpecialtyFieldsJson { get; set; } // Store specialty-specific fields as JSON
    
    // AI Generated Data
    public string? AISummary { get; set; } // AI-generated summary of the consultation
    public DateTime? AISummaryGeneratedAt { get; set; }
    public string? AIDiagnosticHypothesis { get; set; } // AI-generated diagnostic hypothesis
    public DateTime? AIDiagnosisGeneratedAt { get; set; }
    
    // Navigation Properties
    public User Patient { get; set; } = null!;
    public User Professional { get; set; } = null!;
    public Specialty Specialty { get; set; } = null!;
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}
