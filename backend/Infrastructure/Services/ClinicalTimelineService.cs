using Application.DTOs.ClinicalTimeline;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Infrastructure.Services;

/// <summary>
/// Serviço para consulta de timeline clínica do paciente
/// </summary>
public class ClinicalTimelineService : IClinicalTimelineService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public ClinicalTimelineService(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<ClinicalTimelineDto?> GetTimelineByCpfAsync(string cpf, bool includeDetails = false)
    {
        // Normaliza CPF (remove formatação)
        var normalizedCpf = cpf.Replace(".", "").Replace("-", "").Replace(" ", "").Trim();
        
        // Busca paciente por CPF
        var patient = await _context.Users
            .Include(u => u.PatientProfile)
            .FirstOrDefaultAsync(u => u.Cpf.Replace(".", "").Replace("-", "") == normalizedCpf);
        
        if (patient == null)
            return null;
        
        return await GetTimelineByPatientIdAsync(patient.Id, includeDetails);
    }

    public async Task<ClinicalTimelineDto?> GetTimelineByPatientIdAsync(Guid patientId, bool includeDetails = false)
    {
        // Busca dados do paciente
        var patient = await _context.Users
            .Include(u => u.PatientProfile)
            .FirstOrDefaultAsync(u => u.Id == patientId);
        
        if (patient == null)
            return null;
        
        // Busca todas as consultas do paciente (apenas concluídas ou em atendimento)
        // Nota: SQLite não suporta TimeSpan em ORDER BY, então ordenamos apenas por Date
        // e depois ordenamos em memória por Time
        var appointmentsQuery = _context.Appointments
            .Include(a => a.Professional)
                .ThenInclude(p => p.ProfessionalProfile!)
                    .ThenInclude(pp => pp.Council)
            .Include(a => a.Specialty)
            .Where(a => a.PatientId == patientId)
            .Where(a => a.Status == AppointmentStatus.Completed || 
                       a.Status == AppointmentStatus.InProgress)
            .OrderByDescending(a => a.Date);
        
        var appointments = (await appointmentsQuery.ToListAsync())
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.Time)
            .ToList();
        
        // Busca contagens de documentos por consulta
        var appointmentIds = appointments.Select(a => a.Id).ToList();
        
        var prescriptionCounts = await _context.Prescriptions
            .Where(p => appointmentIds.Contains(p.AppointmentId))
            .GroupBy(p => p.AppointmentId)
            .Select(g => new { AppointmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AppointmentId, x => x.Count);
        
        var examRequestCounts = await _context.ExamRequests
            .Where(e => appointmentIds.Contains(e.AppointmentId))
            .GroupBy(e => e.AppointmentId)
            .Select(g => new { AppointmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AppointmentId, x => x.Count);
        
        var medicalCertificateCounts = await _context.MedicalCertificates
            .Where(m => appointmentIds.Contains(m.AppointmentId))
            .GroupBy(m => m.AppointmentId)
            .Select(g => new { AppointmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AppointmentId, x => x.Count);
        
        var medicalReportCounts = await _context.MedicalReports
            .Where(m => appointmentIds.Contains(m.AppointmentId))
            .GroupBy(m => m.AppointmentId)
            .Select(g => new { AppointmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AppointmentId, x => x.Count);
        
        var attachmentCounts = await _context.Attachments
            .Where(a => appointmentIds.Contains(a.AppointmentId))
            .GroupBy(a => a.AppointmentId)
            .Select(g => new { AppointmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AppointmentId, x => x.Count);
        
        // Monta as entradas da timeline
        var entries = new List<TimelineEntryDto>();
        
        foreach (var appointment in appointments)
        {
            var entry = new TimelineEntryDto
            {
                AppointmentId = appointment.Id,
                Date = appointment.Date,
                Time = appointment.Time.ToString(@"hh\:mm"),
                Status = appointment.Status.ToString(),
                Type = appointment.Type.ToString(),
                ProfessionalId = appointment.ProfessionalId,
                ProfessionalName = $"{appointment.Professional.Name} {appointment.Professional.LastName}",
                SpecialtyName = appointment.Specialty?.Name ?? "Não especificada",
                AISummary = appointment.AISummary,
                PrescriptionsCount = prescriptionCounts.GetValueOrDefault(appointment.Id, 0),
                ExamRequestsCount = examRequestCounts.GetValueOrDefault(appointment.Id, 0),
                MedicalCertificatesCount = medicalCertificateCounts.GetValueOrDefault(appointment.Id, 0),
                MedicalReportsCount = medicalReportCounts.GetValueOrDefault(appointment.Id, 0),
                AttachmentsCount = attachmentCounts.GetValueOrDefault(appointment.Id, 0)
            };
            
            // Dados do conselho profissional
            if (appointment.Professional.ProfessionalProfile?.Council != null)
            {
                entry.CouncilAcronym = appointment.Professional.ProfessionalProfile.Council.Acronym;
                entry.CouncilRegistration = appointment.Professional.ProfessionalProfile.CouncilRegistration;
                entry.CouncilState = appointment.Professional.ProfessionalProfile.CouncilState;
            }
            else if (!string.IsNullOrEmpty(appointment.Professional.ProfessionalProfile?.Crm))
            {
                // Fallback para CRM legado
                entry.CouncilAcronym = "CRM";
                entry.CouncilRegistration = appointment.Professional.ProfessionalProfile.Crm;
            }
            
            // Parse SOAP JSON
            if (!string.IsNullOrEmpty(appointment.SoapJson))
            {
                try
                {
                    var soapData = JsonSerializer.Deserialize<JsonElement>(appointment.SoapJson);
                    entry.Soap = new TimelineSoapDto
                    {
                        Subjective = GetJsonStringValue(soapData, "subjective") ?? GetJsonStringValue(soapData, "queixaPrincipal"),
                        Objective = GetJsonStringValue(soapData, "objective") ?? GetJsonStringValue(soapData, "exameFisico"),
                        Assessment = GetJsonStringValue(soapData, "assessment") ?? GetJsonStringValue(soapData, "avaliacao"),
                        Plan = GetJsonStringValue(soapData, "plan") ?? GetJsonStringValue(soapData, "plano")
                    };
                }
                catch { /* Ignora erro de parse */ }
            }
            
            // Parse Biometrics JSON (suporta camelCase, PascalCase e português)
            if (!string.IsNullOrEmpty(appointment.BiometricsJson))
            {
                try
                {
                    var bioData = JsonSerializer.Deserialize<JsonElement>(appointment.BiometricsJson);
                    entry.Biometrics = new TimelineBiometricsDto
                    {
                        Weight = GetJsonDecimalValue(bioData, "Weight") ?? GetJsonDecimalValue(bioData, "weight") ?? GetJsonDecimalValue(bioData, "peso"),
                        Height = GetJsonDecimalValue(bioData, "Height") ?? GetJsonDecimalValue(bioData, "height") ?? GetJsonDecimalValue(bioData, "altura"),
                        Bmi = GetJsonDecimalValue(bioData, "Bmi") ?? GetJsonDecimalValue(bioData, "bmi") ?? GetJsonDecimalValue(bioData, "imc"),
                        BloodPressureSystolic = GetJsonIntValue(bioData, "BloodPressureSystolic") ?? GetJsonIntValue(bioData, "bloodPressureSystolic") ?? GetJsonIntValue(bioData, "pressaoSistolica"),
                        BloodPressureDiastolic = GetJsonIntValue(bioData, "BloodPressureDiastolic") ?? GetJsonIntValue(bioData, "bloodPressureDiastolic") ?? GetJsonIntValue(bioData, "pressaoDiastolica"),
                        HeartRate = GetJsonIntValue(bioData, "HeartRate") ?? GetJsonIntValue(bioData, "heartRate") ?? GetJsonIntValue(bioData, "frequenciaCardiaca"),
                        Temperature = GetJsonDecimalValue(bioData, "Temperature") ?? GetJsonDecimalValue(bioData, "temperature") ?? GetJsonDecimalValue(bioData, "temperatura"),
                        OxygenSaturation = GetJsonIntValue(bioData, "OxygenSaturation") ?? GetJsonIntValue(bioData, "oxygenSaturation") ?? GetJsonIntValue(bioData, "saturacaoOxigenio"),
                        RespiratoryRate = GetJsonIntValue(bioData, "RespiratoryRate") ?? GetJsonIntValue(bioData, "respiratoryRate") ?? GetJsonIntValue(bioData, "frequenciaRespiratoria"),
                        GlycemicIndex = GetJsonIntValue(bioData, "Glucose") ?? GetJsonIntValue(bioData, "glycemicIndex") ?? GetJsonIntValue(bioData, "glicemia")
                    };
                }
                catch { /* Ignora erro de parse */ }
            }
            
            // Carrega detalhes se solicitado
            if (includeDetails)
            {
                entry.Prescriptions = await GetPrescriptionsForAppointmentAsync(appointment.Id);
                entry.ExamRequests = await GetExamRequestsForAppointmentAsync(appointment.Id);
                entry.MedicalCertificates = await GetMedicalCertificatesForAppointmentAsync(appointment.Id);
                entry.MedicalReports = await GetMedicalReportsForAppointmentAsync(appointment.Id);
            }
            
            entries.Add(entry);
        }
        
        // Monta resumo
        var summary = new TimelineSummaryDto
        {
            TotalAppointments = appointments.Count,
            CompletedAppointments = appointments.Count(a => a.Status == AppointmentStatus.Completed),
            FirstAppointmentDate = appointments.LastOrDefault()?.Date,
            LastAppointmentDate = appointments.FirstOrDefault()?.Date,
            TotalPrescriptions = prescriptionCounts.Values.Sum(),
            TotalExamRequests = examRequestCounts.Values.Sum(),
            TotalMedicalCertificates = medicalCertificateCounts.Values.Sum(),
            TotalMedicalReports = medicalReportCounts.Values.Sum(),
            SpecialtiesAttended = appointments.Select(a => a.Specialty?.Name ?? "").Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList(),
            ProfessionalsAttended = appointments.Select(a => $"{a.Professional.Name} {a.Professional.LastName}").Distinct().ToList()
        };
        
        return new ClinicalTimelineDto
        {
            PatientId = patientId,
            PatientName = $"{patient.Name} {patient.LastName}",
            PatientCpf = patient.Cpf,
            Entries = entries,
            Summary = summary
        };
    }

    public async Task<TimelineEntryDto?> GetAppointmentDetailsAsync(Guid appointmentId)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Professional)
                .ThenInclude(p => p.ProfessionalProfile!)
                    .ThenInclude(pp => pp.Council)
            .Include(a => a.Specialty)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);
        
        if (appointment == null)
            return null;
        
        var entry = new TimelineEntryDto
        {
            AppointmentId = appointment.Id,
            Date = appointment.Date,
            Time = appointment.Time.ToString(@"hh\:mm"),
            Status = appointment.Status.ToString(),
            Type = appointment.Type.ToString(),
            ProfessionalId = appointment.ProfessionalId,
            ProfessionalName = $"{appointment.Professional.Name} {appointment.Professional.LastName}",
            SpecialtyName = appointment.Specialty?.Name ?? "Não especificada",
            AISummary = appointment.AISummary,
            Prescriptions = await GetPrescriptionsForAppointmentAsync(appointment.Id),
            ExamRequests = await GetExamRequestsForAppointmentAsync(appointment.Id),
            MedicalCertificates = await GetMedicalCertificatesForAppointmentAsync(appointment.Id),
            MedicalReports = await GetMedicalReportsForAppointmentAsync(appointment.Id)
        };
        
        // Dados do conselho profissional
        if (appointment.Professional.ProfessionalProfile?.Council != null)
        {
            entry.CouncilAcronym = appointment.Professional.ProfessionalProfile.Council.Acronym;
            entry.CouncilRegistration = appointment.Professional.ProfessionalProfile.CouncilRegistration;
            entry.CouncilState = appointment.Professional.ProfessionalProfile.CouncilState;
        }
        else if (!string.IsNullOrEmpty(appointment.Professional.ProfessionalProfile?.Crm))
        {
            // Fallback para CRM legado
            entry.CouncilAcronym = "CRM";
            entry.CouncilRegistration = appointment.Professional.ProfessionalProfile.Crm;
        }
        
        // Parse SOAP JSON
        if (!string.IsNullOrEmpty(appointment.SoapJson))
        {
            try
            {
                var soapData = JsonSerializer.Deserialize<JsonElement>(appointment.SoapJson);
                entry.Soap = new TimelineSoapDto
                {
                    Subjective = GetJsonStringValue(soapData, "subjective") ?? GetJsonStringValue(soapData, "queixaPrincipal"),
                    Objective = GetJsonStringValue(soapData, "objective") ?? GetJsonStringValue(soapData, "exameFisico"),
                    Assessment = GetJsonStringValue(soapData, "assessment") ?? GetJsonStringValue(soapData, "avaliacao"),
                    Plan = GetJsonStringValue(soapData, "plan") ?? GetJsonStringValue(soapData, "plano")
                };
            }
            catch { /* Ignora erro de parse */ }
        }
        
        // Parse Biometrics JSON (suporta camelCase, PascalCase e português)
        if (!string.IsNullOrEmpty(appointment.BiometricsJson))
        {
            try
            {
                var bioData = JsonSerializer.Deserialize<JsonElement>(appointment.BiometricsJson);
                entry.Biometrics = new TimelineBiometricsDto
                {
                    Weight = GetJsonDecimalValue(bioData, "Weight") ?? GetJsonDecimalValue(bioData, "weight") ?? GetJsonDecimalValue(bioData, "peso"),
                    Height = GetJsonDecimalValue(bioData, "Height") ?? GetJsonDecimalValue(bioData, "height") ?? GetJsonDecimalValue(bioData, "altura"),
                    Bmi = GetJsonDecimalValue(bioData, "Bmi") ?? GetJsonDecimalValue(bioData, "bmi") ?? GetJsonDecimalValue(bioData, "imc"),
                    BloodPressureSystolic = GetJsonIntValue(bioData, "BloodPressureSystolic") ?? GetJsonIntValue(bioData, "bloodPressureSystolic") ?? GetJsonIntValue(bioData, "pressaoSistolica"),
                    BloodPressureDiastolic = GetJsonIntValue(bioData, "BloodPressureDiastolic") ?? GetJsonIntValue(bioData, "bloodPressureDiastolic") ?? GetJsonIntValue(bioData, "pressaoDiastolica"),
                    HeartRate = GetJsonIntValue(bioData, "HeartRate") ?? GetJsonIntValue(bioData, "heartRate") ?? GetJsonIntValue(bioData, "frequenciaCardiaca"),
                    Temperature = GetJsonDecimalValue(bioData, "Temperature") ?? GetJsonDecimalValue(bioData, "temperature") ?? GetJsonDecimalValue(bioData, "temperatura"),
                    OxygenSaturation = GetJsonIntValue(bioData, "OxygenSaturation") ?? GetJsonIntValue(bioData, "oxygenSaturation") ?? GetJsonIntValue(bioData, "saturacaoOxigenio"),
                    RespiratoryRate = GetJsonIntValue(bioData, "RespiratoryRate") ?? GetJsonIntValue(bioData, "respiratoryRate") ?? GetJsonIntValue(bioData, "frequenciaRespiratoria"),
                    GlycemicIndex = GetJsonIntValue(bioData, "Glucose") ?? GetJsonIntValue(bioData, "glycemicIndex") ?? GetJsonIntValue(bioData, "glicemia")
                };
            }
            catch { /* Ignora erro de parse */ }
        }
        
        // Contagens
        entry.PrescriptionsCount = entry.Prescriptions?.Count ?? 0;
        entry.ExamRequestsCount = entry.ExamRequests?.Count ?? 0;
        entry.MedicalCertificatesCount = entry.MedicalCertificates?.Count ?? 0;
        entry.MedicalReportsCount = entry.MedicalReports?.Count ?? 0;
        entry.AttachmentsCount = await _context.Attachments.CountAsync(a => a.AppointmentId == appointmentId);
        
        return entry;
    }

    private async Task<List<TimelinePrescriptionDto>> GetPrescriptionsForAppointmentAsync(Guid appointmentId)
    {
        var prescriptions = await _context.Prescriptions
            .Where(p => p.AppointmentId == appointmentId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        
        return prescriptions.Select(p =>
        {
            var medications = new List<string>();
            try
            {
                var items = JsonSerializer.Deserialize<List<JsonElement>>(p.ItemsJson);
                if (items != null)
                {
                    medications = items.Select(i => GetJsonStringValue(i, "medicamento") ?? GetJsonStringValue(i, "Medicamento") ?? "").Where(m => !string.IsNullOrEmpty(m)).ToList();
                }
            }
            catch { }
            
            return new TimelinePrescriptionDto
            {
                Id = p.Id,
                CreatedAt = p.CreatedAt,
                IsSigned = !string.IsNullOrEmpty(p.DigitalSignature),
                Medications = medications
            };
        }).ToList();
    }

    private async Task<List<TimelineExamRequestDto>> GetExamRequestsForAppointmentAsync(Guid appointmentId)
    {
        return await _context.ExamRequests
            .Where(e => e.AppointmentId == appointmentId)
            .OrderByDescending(e => e.DataEmissao)
            .Select(e => new TimelineExamRequestDto
            {
                Id = e.Id,
                NomeExame = e.NomeExame,
                Categoria = e.Categoria.ToString(),
                Prioridade = e.Prioridade.ToString(),
                DataEmissao = e.DataEmissao,
                IsSigned = !string.IsNullOrEmpty(e.DigitalSignature)
            })
            .ToListAsync();
    }

    private async Task<List<TimelineMedicalCertificateDto>> GetMedicalCertificatesForAppointmentAsync(Guid appointmentId)
    {
        return await _context.MedicalCertificates
            .Where(m => m.AppointmentId == appointmentId)
            .OrderByDescending(m => m.DataEmissao)
            .Select(m => new TimelineMedicalCertificateDto
            {
                Id = m.Id,
                Tipo = m.Tipo.ToString(),
                DiasAfastamento = m.DiasAfastamento,
                DataEmissao = m.DataEmissao,
                IsSigned = !string.IsNullOrEmpty(m.DigitalSignature)
            })
            .ToListAsync();
    }

    private async Task<List<TimelineMedicalReportDto>> GetMedicalReportsForAppointmentAsync(Guid appointmentId)
    {
        return await _context.MedicalReports
            .Where(m => m.AppointmentId == appointmentId)
            .OrderByDescending(m => m.DataEmissao)
            .Select(m => new TimelineMedicalReportDto
            {
                Id = m.Id,
                Tipo = m.Tipo.ToString(),
                Titulo = m.Titulo,
                DataEmissao = m.DataEmissao,
                IsSigned = !string.IsNullOrEmpty(m.DigitalSignature)
            })
            .ToListAsync();
    }

    private static string? GetJsonStringValue(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String)
            return value.GetString();
        return null;
    }

    private static decimal? GetJsonDecimalValue(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var value))
        {
            if (value.ValueKind == JsonValueKind.Number)
                return value.GetDecimal();
            if (value.ValueKind == JsonValueKind.String && decimal.TryParse(value.GetString(), out var parsed))
                return parsed;
        }
        return null;
    }

    private static int? GetJsonIntValue(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var value))
        {
            if (value.ValueKind == JsonValueKind.Number)
                return value.GetInt32();
            if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var parsed))
                return parsed;
        }
        return null;
    }
}
