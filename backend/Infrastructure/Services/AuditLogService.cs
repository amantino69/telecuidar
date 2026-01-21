using Application.DTOs.AuditLogs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;

    public AuditLogService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedAuditLogsDto> GetAuditLogsAsync(int page, int pageSize, string? entityType, Guid? userId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.AuditLogs
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(entityType))
        {
            query = query.Where(a => a.EntityType == entityType);
        }

        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt <= endDate.Value);
        }

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.User != null ? a.User.Name + " " + a.User.LastName : null,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                OldValues = a.OldValues,
                NewValues = a.NewValues,
                IpAddress = a.IpAddress,
                UserAgent = a.UserAgent,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return new PaginatedAuditLogsDto
        {
            Data = logs,
            Total = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<AuditLogDto?> GetAuditLogByIdAsync(Guid id)
    {
        var log = await _context.AuditLogs
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (log == null) return null;

        return new AuditLogDto
        {
            Id = log.Id,
            UserId = log.UserId,
            UserName = log.User != null ? log.User.Name + " " + log.User.LastName : null,
            Action = log.Action,
            EntityType = log.EntityType,
            EntityId = log.EntityId,
            OldValues = log.OldValues,
            NewValues = log.NewValues,
            IpAddress = log.IpAddress,
            UserAgent = log.UserAgent,
            CreatedAt = log.CreatedAt
        };
    }

    public async Task CreateAuditLogAsync(Guid? userId, string action, string entityType, string entityId, string? oldValues, string? newValues, string? ipAddress, string? userAgent)
    {
        var auditLog = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValues = oldValues,
            NewValues = newValues,
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }

    public async Task LogAsync(
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
        string? accessReason = null)
    {
        var auditLog = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entity,
            EntityId = entityId,
            OldValues = oldValue,
            NewValues = newValue,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            PatientId = patientId,
            PatientCpf = patientCpf,
            DataCategory = dataCategory,
            AccessReason = accessReason
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }

    public async Task<PaginatedAuditLogsDto> GetAuditLogsByPatientAsync(Guid patientId, int page, int pageSize, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.AuditLogs
            .Include(a => a.User)
            .Where(a => a.PatientId == patientId);

        if (startDate.HasValue)
            query = query.Where(a => a.CreatedAt >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(a => a.CreatedAt <= endDate.Value);

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.User != null ? a.User.Name + " " + a.User.LastName : null,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                OldValues = a.OldValues,
                NewValues = a.NewValues,
                IpAddress = a.IpAddress,
                UserAgent = a.UserAgent,
                CreatedAt = a.CreatedAt,
                PatientId = a.PatientId,
                PatientCpf = a.PatientCpf,
                DataCategory = a.DataCategory,
                AccessReason = a.AccessReason
            })
            .ToListAsync();

        return new PaginatedAuditLogsDto
        {
            Data = logs,
            Total = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<PaginatedAuditLogsDto> GetAuditLogsByPatientCpfAsync(string cpf, int page, int pageSize, DateTime? startDate = null, DateTime? endDate = null)
    {
        var normalizedCpf = cpf.Replace(".", "").Replace("-", "").Replace(" ", "").Trim();
        
        var query = _context.AuditLogs
            .Include(a => a.User)
            .Where(a => a.PatientCpf != null && 
                       a.PatientCpf.Replace(".", "").Replace("-", "") == normalizedCpf);

        if (startDate.HasValue)
            query = query.Where(a => a.CreatedAt >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(a => a.CreatedAt <= endDate.Value);

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.User != null ? a.User.Name + " " + a.User.LastName : null,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                OldValues = a.OldValues,
                NewValues = a.NewValues,
                IpAddress = a.IpAddress,
                UserAgent = a.UserAgent,
                CreatedAt = a.CreatedAt,
                PatientId = a.PatientId,
                PatientCpf = a.PatientCpf,
                DataCategory = a.DataCategory,
                AccessReason = a.AccessReason
            })
            .ToListAsync();

        return new PaginatedAuditLogsDto
        {
            Data = logs,
            Total = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<byte[]> ExportAuditLogsCsvAsync(Guid? userId = null, Guid? patientId = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.AuditLogs
            .Include(a => a.User)
            .Include(a => a.Patient)
            .AsQueryable();

        if (userId.HasValue)
            query = query.Where(a => a.UserId == userId.Value);

        if (patientId.HasValue)
            query = query.Where(a => a.PatientId == patientId.Value);

        if (startDate.HasValue)
            query = query.Where(a => a.CreatedAt >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(a => a.CreatedAt <= endDate.Value);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        // Gera CSV
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Data/Hora;Usuario;Acao;Entidade;ID Entidade;Paciente;CPF Paciente;Categoria;Motivo;IP;User Agent");

        foreach (var log in logs)
        {
            var userName = log.User != null ? $"{log.User.Name} {log.User.LastName}" : "N/A";
            var patientName = log.Patient != null ? $"{log.Patient.Name} {log.Patient.LastName}" : "N/A";
            
            sb.AppendLine($"{log.CreatedAt:dd/MM/yyyy HH:mm:ss};{EscapeCsv(userName)};{EscapeCsv(log.Action)};{EscapeCsv(log.EntityType)};{log.EntityId};{EscapeCsv(patientName)};{log.PatientCpf ?? "N/A"};{log.DataCategory ?? "N/A"};{EscapeCsv(log.AccessReason ?? "N/A")};{log.IpAddress ?? "N/A"};{EscapeCsv(log.UserAgent ?? "N/A")}");
        }

        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(';') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}

