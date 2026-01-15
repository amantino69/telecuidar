namespace Application.DTOs.AuditLogs;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Campos para auditoria LGPD
    public Guid? PatientId { get; set; }
    public string? PatientCpf { get; set; }
    public string? PatientName { get; set; }
    public string? DataCategory { get; set; }
    public string? AccessReason { get; set; }
}

public class PaginatedAuditLogsDto
{
    public List<AuditLogDto> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
