using Application.DTOs.Schedules;

namespace Application.Interfaces;

public interface IScheduleService
{
    Task<PaginatedSchedulesDto> GetSchedulesAsync(int page, int pageSize, string? search, string? status);
    Task<List<ScheduleDto>> GetSchedulesByProfessionalAsync(Guid professionalId);
    Task<ScheduleDto?> GetScheduleByIdAsync(Guid id);
    Task<ScheduleDto> CreateScheduleAsync(CreateScheduleDto dto);
    Task<ScheduleDto?> UpdateScheduleAsync(Guid id, UpdateScheduleDto dto);
    Task<bool> DeleteScheduleAsync(Guid id);
    Task<ProfessionalAvailabilityDto> GetAvailabilitySlotsAsync(Guid professionalId, DateTime startDate, DateTime endDate);
}
