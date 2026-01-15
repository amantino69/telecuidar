using Application.DTOs.ClinicalTimeline;

namespace Application.Interfaces;

/// <summary>
/// Serviço para consulta de timeline clínica do paciente
/// </summary>
public interface IClinicalTimelineService
{
    /// <summary>
    /// Busca a timeline clínica completa de um paciente por CPF
    /// </summary>
    /// <param name="cpf">CPF do paciente (com ou sem formatação)</param>
    /// <param name="includeDetails">Se deve incluir detalhes de prescrições, exames, etc.</param>
    /// <returns>Timeline clínica ou null se paciente não encontrado</returns>
    Task<ClinicalTimelineDto?> GetTimelineByCpfAsync(string cpf, bool includeDetails = false);
    
    /// <summary>
    /// Busca a timeline clínica completa de um paciente por ID
    /// </summary>
    /// <param name="patientId">ID do paciente</param>
    /// <param name="includeDetails">Se deve incluir detalhes de prescrições, exames, etc.</param>
    /// <returns>Timeline clínica ou null se paciente não encontrado</returns>
    Task<ClinicalTimelineDto?> GetTimelineByPatientIdAsync(Guid patientId, bool includeDetails = false);
    
    /// <summary>
    /// Busca detalhes de uma consulta específica para a timeline
    /// </summary>
    /// <param name="appointmentId">ID da consulta</param>
    /// <returns>Detalhes da consulta ou null se não encontrada</returns>
    Task<TimelineEntryDto?> GetAppointmentDetailsAsync(Guid appointmentId);
}
