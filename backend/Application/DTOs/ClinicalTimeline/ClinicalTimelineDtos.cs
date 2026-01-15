namespace Application.DTOs.ClinicalTimeline;

/// <summary>
/// Timeline clínica completa do paciente
/// </summary>
public class ClinicalTimelineDto
{
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCpf { get; set; } = string.Empty;
    public List<TimelineEntryDto> Entries { get; set; } = new();
    public TimelineSummaryDto Summary { get; set; } = new();
}

/// <summary>
/// Entrada individual na timeline (uma consulta)
/// </summary>
public class TimelineEntryDto
{
    public Guid AppointmentId { get; set; }
    public DateTime Date { get; set; }
    public string Time { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    
    // Profissional
    public Guid ProfessionalId { get; set; }
    public string ProfessionalName { get; set; } = string.Empty;
    public string? CouncilAcronym { get; set; }
    public string? CouncilRegistration { get; set; }
    public string? CouncilState { get; set; }
    
    // Especialidade
    public string SpecialtyName { get; set; } = string.Empty;
    
    // Dados clínicos (resumidos)
    public TimelineSoapDto? Soap { get; set; }
    public TimelineBiometricsDto? Biometrics { get; set; }
    public string? AISummary { get; set; }
    
    // Documentos emitidos
    public int PrescriptionsCount { get; set; }
    public int ExamRequestsCount { get; set; }
    public int MedicalCertificatesCount { get; set; }
    public int MedicalReportsCount { get; set; }
    public int AttachmentsCount { get; set; }
    
    // Listas detalhadas (opcional, carregado sob demanda)
    public List<TimelinePrescriptionDto>? Prescriptions { get; set; }
    public List<TimelineExamRequestDto>? ExamRequests { get; set; }
    public List<TimelineMedicalCertificateDto>? MedicalCertificates { get; set; }
    public List<TimelineMedicalReportDto>? MedicalReports { get; set; }
}

/// <summary>
/// SOAP resumido para timeline
/// </summary>
public class TimelineSoapDto
{
    public string? Subjective { get; set; }
    public string? Objective { get; set; }
    public string? Assessment { get; set; }
    public string? Plan { get; set; }
}

/// <summary>
/// Biométricos resumidos para timeline
/// </summary>
public class TimelineBiometricsDto
{
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }
    public decimal? Bmi { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? HeartRate { get; set; }
    public decimal? Temperature { get; set; }
    public int? OxygenSaturation { get; set; }
    public int? RespiratoryRate { get; set; }
    public int? GlycemicIndex { get; set; }
}

/// <summary>
/// Prescrição resumida para timeline
/// </summary>
public class TimelinePrescriptionDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsSigned { get; set; }
    public List<string> Medications { get; set; } = new();
}

/// <summary>
/// Exame solicitado resumido para timeline
/// </summary>
public class TimelineExamRequestDto
{
    public Guid Id { get; set; }
    public string NomeExame { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Prioridade { get; set; } = string.Empty;
    public DateTime DataEmissao { get; set; }
    public bool IsSigned { get; set; }
}

/// <summary>
/// Atestado resumido para timeline
/// </summary>
public class TimelineMedicalCertificateDto
{
    public Guid Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public int? DiasAfastamento { get; set; }
    public DateTime DataEmissao { get; set; }
    public bool IsSigned { get; set; }
}

/// <summary>
/// Laudo resumido para timeline
/// </summary>
public class TimelineMedicalReportDto
{
    public Guid Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public DateTime DataEmissao { get; set; }
    public bool IsSigned { get; set; }
}

/// <summary>
/// Resumo estatístico da timeline
/// </summary>
public class TimelineSummaryDto
{
    public int TotalAppointments { get; set; }
    public int CompletedAppointments { get; set; }
    public DateTime? FirstAppointmentDate { get; set; }
    public DateTime? LastAppointmentDate { get; set; }
    public int TotalPrescriptions { get; set; }
    public int TotalExamRequests { get; set; }
    public int TotalMedicalCertificates { get; set; }
    public int TotalMedicalReports { get; set; }
    public List<string> SpecialtiesAttended { get; set; } = new();
    public List<string> ProfessionalsAttended { get; set; } = new();
}
