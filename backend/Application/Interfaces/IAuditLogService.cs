using Application.DTOs.AuditLogs;

namespace Application.Interfaces;

public interface IAuditLogService
{
    Task<PaginatedAuditLogsDto> GetAuditLogsAsync(int page, int pageSize, string? entityType, Guid? userId, DateTime? startDate, DateTime? endDate);
    Task<AuditLogDto?> GetAuditLogByIdAsync(Guid id);
    Task CreateAuditLogAsync(Guid? userId, string action, string entityType, string entityId, string? oldValues, string? newValues, string? ipAddress, string? userAgent);
}
