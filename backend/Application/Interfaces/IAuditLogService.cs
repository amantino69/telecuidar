using Application.DTOs.AuditLogs;

namespace Application.Interfaces;

public interface IAuditLogService
{
    Task<PaginatedAuditLogsDto> GetAuditLogsAsync(int page, int pageSize, string? entityType, Guid? userId, DateTime? startDate, DateTime? endDate);
    Task<AuditLogDto?> GetAuditLogByIdAsync(Guid id);
    Task CreateAuditLogAsync(Guid? userId, string action, string entityType, string entityId, string? oldValues, string? newValues, string? ipAddress, string? userAgent);
    
    /// <summary>
    /// Registra log de auditoria com campos expandidos para LGPD
    /// </summary>
    Task LogAsync(
        Guid userId,
        string action,
        string entity,
        string entityId,
        string? oldValue,
        string? newValue,
        string? ipAddress = null,
        string? userAgent = null,
        Guid? patientId = null,
        string? patientCpf = null,
        string? dataCategory = null,
        string? accessReason = null
    );
    
    /// <summary>
    /// Busca logs de auditoria por paciente (para relatório LGPD)
    /// </summary>
    Task<PaginatedAuditLogsDto> GetAuditLogsByPatientAsync(Guid patientId, int page, int pageSize, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Busca logs de auditoria por CPF do paciente
    /// </summary>
    Task<PaginatedAuditLogsDto> GetAuditLogsByPatientCpfAsync(string cpf, int page, int pageSize, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Exporta logs de auditoria em formato CSV
    /// </summary>
    Task<byte[]> ExportAuditLogsCsvAsync(Guid? userId = null, Guid? patientId = null, DateTime? startDate = null, DateTime? endDate = null);
}

