using Application.DTOs.ClinicalTimeline;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Domain.Enums;

namespace WebAPI.Controllers;

/// <summary>
/// Controller para acesso ao prontuário/histórico clínico do paciente
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly IClinicalTimelineService _timelineService;
    private readonly IAuditLogService _auditLogService;
    private readonly IUserService _userService;

    public PatientsController(
        IClinicalTimelineService timelineService,
        IAuditLogService auditLogService,
        IUserService userService)
    {
        _timelineService = timelineService;
        _auditLogService = auditLogService;
        _userService = userService;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    private string? GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value;
    }

    /// <summary>
    /// Busca timeline clínica do paciente por CPF
    /// </summary>
    /// <param name="cpf">CPF do paciente (com ou sem formatação)</param>
    /// <param name="includeDetails">Se true, inclui detalhes de prescrições, exames, etc.</param>
    /// <param name="reason">Motivo do acesso (obrigatório para auditoria)</param>
    [HttpGet("cpf/{cpf}/clinical-timeline")]
    [Authorize(Roles = "ADMIN,PROFESSIONAL")]
    public async Task<ActionResult<ClinicalTimelineDto>> GetTimelineByCpf(
        string cpf,
        [FromQuery] bool includeDetails = false,
        [FromQuery] string? reason = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userRole = GetCurrentUserRole();

            if (userId == null)
                return Unauthorized(new { message = "Usuário não autenticado" });

            // Busca timeline
            var timeline = await _timelineService.GetTimelineByCpfAsync(cpf, includeDetails);
            
            if (timeline == null)
                return NotFound(new { message = "Paciente não encontrado" });

            // Registra acesso para auditoria
            await _auditLogService.LogAsync(
                userId: userId.Value,
                action: "VIEW_CLINICAL_TIMELINE",
                entity: "Patient",
                entityId: timeline.PatientId.ToString(),
                oldValue: null,
                newValue: null,
                ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers["User-Agent"].ToString(),
                patientId: timeline.PatientId,
                patientCpf: timeline.PatientCpf,
                dataCategory: "PRONTUARIO",
                accessReason: reason ?? "Consulta de histórico clínico"
            );

            return Ok(timeline);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro ao buscar timeline clínica", error = ex.Message });
        }
    }

    /// <summary>
    /// Busca timeline clínica do paciente por ID
    /// </summary>
    /// <param name="patientId">ID do paciente</param>
    /// <param name="includeDetails">Se true, inclui detalhes de prescrições, exames, etc.</param>
    /// <param name="reason">Motivo do acesso (obrigatório para auditoria)</param>
    [HttpGet("{patientId}/clinical-timeline")]
    [Authorize(Roles = "ADMIN,PROFESSIONAL")]
    public async Task<ActionResult<ClinicalTimelineDto>> GetTimelineByPatientId(
        Guid patientId,
        [FromQuery] bool includeDetails = false,
        [FromQuery] string? reason = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized(new { message = "Usuário não autenticado" });

            // Busca timeline
            var timeline = await _timelineService.GetTimelineByPatientIdAsync(patientId, includeDetails);
            
            if (timeline == null)
                return NotFound(new { message = "Paciente não encontrado" });

            // Registra acesso para auditoria
            await _auditLogService.LogAsync(
                userId: userId.Value,
                action: "VIEW_CLINICAL_TIMELINE",
                entity: "Patient",
                entityId: patientId.ToString(),
                oldValue: null,
                newValue: null,
                ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers["User-Agent"].ToString(),
                patientId: patientId,
                patientCpf: timeline.PatientCpf,
                dataCategory: "PRONTUARIO",
                accessReason: reason ?? "Consulta de histórico clínico"
            );

            return Ok(timeline);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro ao buscar timeline clínica", error = ex.Message });
        }
    }

    /// <summary>
    /// Busca detalhes de uma consulta específica
    /// </summary>
    /// <param name="appointmentId">ID da consulta</param>
    /// <param name="reason">Motivo do acesso (para auditoria)</param>
    [HttpGet("appointments/{appointmentId}/details")]
    [Authorize(Roles = "ADMIN,PROFESSIONAL")]
    public async Task<ActionResult<TimelineEntryDto>> GetAppointmentDetails(
        Guid appointmentId,
        [FromQuery] string? reason = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized(new { message = "Usuário não autenticado" });

            var details = await _timelineService.GetAppointmentDetailsAsync(appointmentId);
            
            if (details == null)
                return NotFound(new { message = "Consulta não encontrada" });

            // Registra acesso para auditoria
            await _auditLogService.LogAsync(
                userId: userId.Value,
                action: "VIEW_APPOINTMENT_DETAILS",
                entity: "Appointment",
                entityId: appointmentId.ToString(),
                oldValue: null,
                newValue: null,
                ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers["User-Agent"].ToString(),
                dataCategory: "PRONTUARIO",
                accessReason: reason ?? "Consulta de detalhes de atendimento"
            );

            return Ok(details);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro ao buscar detalhes da consulta", error = ex.Message });
        }
    }

    /// <summary>
    /// Paciente visualiza seu próprio histórico clínico
    /// </summary>
    [HttpGet("me/clinical-timeline")]
    public async Task<ActionResult<ClinicalTimelineDto>> GetMyTimeline(
        [FromQuery] bool includeDetails = false)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized(new { message = "Usuário não autenticado" });

            var timeline = await _timelineService.GetTimelineByPatientIdAsync(userId.Value, includeDetails);
            
            if (timeline == null)
                return NotFound(new { message = "Histórico clínico não encontrado" });

            // Registra acesso (próprio paciente)
            await _auditLogService.LogAsync(
                userId: userId.Value,
                action: "VIEW_OWN_CLINICAL_TIMELINE",
                entity: "Patient",
                entityId: userId.Value.ToString(),
                oldValue: null,
                newValue: null,
                ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers["User-Agent"].ToString(),
                patientId: userId.Value,
                patientCpf: timeline.PatientCpf,
                dataCategory: "PRONTUARIO",
                accessReason: "Paciente consultando próprio histórico"
            );

            return Ok(timeline);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro ao buscar seu histórico clínico", error = ex.Message });
        }
    }
}
