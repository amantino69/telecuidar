using Application.DTOs.Appointments;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebAPI.Extensions;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly IAuditLogService _auditLogService;

    public AppointmentsController(IAppointmentService appointmentService, IAuditLogService auditLogService)
    {
        _appointmentService = appointmentService;
        _auditLogService = auditLogService;
    }
    
    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedAppointmentsDto>> GetAppointments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _appointmentService.GetAppointmentsAsync(page, pageSize, search, status, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AppointmentDto>> GetAppointment(Guid id)
    {
        var appointment = await _appointmentService.GetAppointmentByIdAsync(id);
        if (appointment == null)
            return NotFound();

        return Ok(appointment);
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> CreateAppointment([FromBody] CreateAppointmentDto dto)
    {
        try
        {
            var appointment = await _appointmentService.CreateAppointmentAsync(dto);
            
            // Audit log
            await _auditLogService.CreateAuditLogAsync(
                GetCurrentUserId(),
                "create",
                "Appointment",
                appointment.Id.ToString(),
                null,
                HttpContextExtensions.SerializeToJson(new { appointment.PatientId, appointment.ProfessionalId, appointment.Date, appointment.Time, appointment.Status }),
                HttpContext.GetIpAddress(),
                HttpContext.GetUserAgent()
            );
            
            return CreatedAtAction(nameof(GetAppointment), new { id = appointment.Id }, appointment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<AppointmentDto>> UpdateAppointment(Guid id, [FromBody] UpdateAppointmentDto dto)
    {
        var oldAppointment = await _appointmentService.GetAppointmentByIdAsync(id);
        if (oldAppointment == null)
            return NotFound();
        
        var appointment = await _appointmentService.UpdateAppointmentAsync(id, dto);
        
        // Audit log with differences
        var oldValues = oldAppointment != null ? HttpContextExtensions.SerializeToJson(new { oldAppointment.Date, oldAppointment.Time, oldAppointment.Status, oldAppointment.Observation }) : null;
        var newValues = HttpContextExtensions.SerializeToJson(new { appointment.Date, appointment.Time, appointment.Status, appointment.Observation });
        
        await _auditLogService.CreateAuditLogAsync(
            GetCurrentUserId(),
            "update",
            "Appointment",
            id.ToString(),
            oldValues,
            newValues,
            HttpContext.GetIpAddress(),
            HttpContext.GetUserAgent()
        );

        return Ok(appointment);
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult> CancelAppointment(Guid id)
    {
        var appointment = await _appointmentService.GetAppointmentByIdAsync(id);
        if (appointment == null)
            return NotFound();
        
        var result = await _appointmentService.CancelAppointmentAsync(id);
        
        // Audit log
        await _auditLogService.CreateAuditLogAsync(
            GetCurrentUserId(),
            "update",
            "Appointment",
            id.ToString(),
            HttpContextExtensions.SerializeToJson(new { Status = appointment.Status }),
            HttpContextExtensions.SerializeToJson(new { Status = "CANCELLED" }),
            HttpContext.GetIpAddress(),
            HttpContext.GetUserAgent()
        );

        return Ok(new { message = "Appointment cancelled successfully" });
    }

    [HttpPost("{id}/finish")]
    public async Task<ActionResult> FinishAppointment(Guid id)
    {
        var appointment = await _appointmentService.GetAppointmentByIdAsync(id);
        if (appointment == null)
            return NotFound();
        
        var result = await _appointmentService.FinishAppointmentAsync(id);
        
        // Audit log
        await _auditLogService.CreateAuditLogAsync(
            GetCurrentUserId(),
            "update",
            "Appointment",
            id.ToString(),
            HttpContextExtensions.SerializeToJson(new { Status = appointment.Status }),
            HttpContextExtensions.SerializeToJson(new { Status = "FINISHED" }),
            HttpContext.GetIpAddress(),
            HttpContext.GetUserAgent()
        );

        return Ok(new { message = "Appointment finished successfully" });
    }
}
