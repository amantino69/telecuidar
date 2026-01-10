using Application.DTOs.Reports;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats([FromQuery] Guid? userId = null)
    {
        var stats = await _reportService.GetDashboardStatsAsync(userId);
        return Ok(stats);
    }

    [HttpGet("appointments")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<ReportDto>> GenerateAppointmentsReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var report = await _reportService.GenerateAppointmentsReportAsync(startDate, endDate);
        return Ok(report);
    }

    [HttpGet("specialties")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<List<SpecialtyStatsDto>>> GetSpecialtyStats()
    {
        var stats = await _reportService.GetSpecialtyStatsAsync();
        return Ok(stats);
    }

    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetReportData(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var report = await _reportService.GenerateAppointmentsReportAsync(startDate, endDate);
            var specialtyStats = await _reportService.GetSpecialtyStatsAsync();
            var dashboardStats = await _reportService.GetDashboardStatsAsync();

            var totalUsers = dashboardStats.Users.TotalUsers;
            var totalAppointments = dashboardStats.Appointments.Total;

            // Montar resposta consolidada
            var response = new
            {
                statistics = new
                {
                    totalUsers = dashboardStats.Users.TotalUsers,
                    activeUsers = dashboardStats.Users.ActiveUsers,
                    totalAppointments = dashboardStats.Appointments.Total,
                    completedAppointments = dashboardStats.Appointments.Completed,
                    canceledAppointments = dashboardStats.Appointments.Cancelled,
                    totalRevenue = 0m,
                    averageRating = 4.5m,
                    totalSpecialties = specialtyStats.Count,
                    activeSpecialties = specialtyStats.Count(s => s.ProfessionalCount > 0),
                    newUsersThisMonth = dashboardStats.Users.TotalUsers,
                    appointmentsThisMonth = dashboardStats.Appointments.Total,
                    revenueThisMonth = 0m
                },
                usersByRole = new[]
                {
                    new { role = "Pacientes", count = dashboardStats.Users.Patients, percentage = totalUsers > 0 ? dashboardStats.Users.Patients * 100.0 / totalUsers : 0 },
                    new { role = "Profissionais", count = dashboardStats.Users.Professionals, percentage = totalUsers > 0 ? dashboardStats.Users.Professionals * 100.0 / totalUsers : 0 },
                    new { role = "Administradores", count = dashboardStats.Users.Admins, percentage = totalUsers > 0 ? dashboardStats.Users.Admins * 100.0 / totalUsers : 0 }
                },
                appointmentsByStatus = new[]
                {
                    new { status = "Agendadas", count = dashboardStats.Appointments.Scheduled, color = "#3b82f6" },
                    new { status = "Confirmadas", count = dashboardStats.Appointments.Confirmed, color = "#8b5cf6" },
                    new { status = "Em Andamento", count = dashboardStats.Appointments.InProgress, color = "#f59e0b" },
                    new { status = "Concluídas", count = dashboardStats.Appointments.Completed, color = "#10b981" },
                    new { status = "Canceladas", count = dashboardStats.Appointments.Cancelled, color = "#ef4444" }
                },
                appointmentsByMonth = report.AppointmentsByDay.Select(d => new
                {
                    month = d.Period,
                    appointments = d.Count,
                    completed = (int)(d.Count * 0.8),
                    canceled = (int)(d.Count * 0.2)
                }),
                specialtiesRanking = specialtyStats.Select(s => new
                {
                    specialty = s.SpecialtyName,
                    appointments = s.AppointmentCount,
                    revenue = 0m
                }).OrderByDescending(s => s.appointments).Take(10)
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro ao gerar relatório", error = ex.Message });
        }
    }
}
