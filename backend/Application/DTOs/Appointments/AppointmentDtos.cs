namespace Application.DTOs.Appointments;

public class SpecialtyBasicDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? CustomFieldsJson { get; set; }
}

public class AppointmentDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public Guid ProfessionalId { get; set; }
    public string ProfessionalName { get; set; } = string.Empty;
    public Guid SpecialtyId { get; set; }
    public string SpecialtyName { get; set; } = string.Empty;
    public SpecialtyBasicDto? Specialty { get; set; }
    public DateTime Date { get; set; }
    public string Time { get; set; } = string.Empty;
    public string? EndTime { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Observation { get; set; }
    public string? MeetLink { get; set; }
    public string? PreConsultationJson { get; set; }
    
    // Clinical Data (JSON)
    public string? AnamnesisJson { get; set; }
    public string? SoapJson { get; set; }
    public string? SpecialtyFieldsJson { get; set; }
    
    // AI Generated Data
    public string? AISummary { get; set; }
    public DateTime? AISummaryGeneratedAt { get; set; }
    public string? AIDiagnosticHypothesis { get; set; }
    public DateTime? AIDiagnosisGeneratedAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateAppointmentDto
{
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpecialtyId { get; set; }
    public DateTime Date { get; set; }
    public string Time { get; set; } = string.Empty;
    public string? EndTime { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Observation { get; set; }
    public string? MeetLink { get; set; }
}

public class UpdateAppointmentDto
{
    public string? Status { get; set; }
    public string? Observation { get; set; }
    public string? PreConsultationJson { get; set; }
    
    // Clinical Data (JSON)
    public string? AnamnesisJson { get; set; }
    public string? SoapJson { get; set; }
    public string? SpecialtyFieldsJson { get; set; }
}

public class PaginatedAppointmentsDto
{
    public List<AppointmentDto> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
