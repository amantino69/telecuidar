using Application.DTOs.Reports;

namespace Application.Interfaces;

public interface IReportService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync(Guid? userId = null);
    Task<ReportDto> GenerateAppointmentsReportAsync(DateTime startDate, DateTime endDate);
    Task<List<SpecialtyStatsDto>> GetSpecialtyStatsAsync();
}
