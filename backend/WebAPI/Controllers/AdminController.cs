using Application.DTOs.Reference;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Claims;
using CsvHelper;
using CsvHelper.Configuration;

namespace WebAPI.Controllers;

/// <summary>
/// Controller de administração para importação de tabelas de referência
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public AdminController(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    #region Conselhos Profissionais

    /// <summary>
    /// Lista todos os conselhos profissionais
    /// </summary>
    [HttpGet("councils")]
    public async Task<ActionResult<List<ProfessionalCouncilDto>>> GetCouncils()
    {
        var councils = await _context.ProfessionalCouncils
            .Where(c => c.IsActive)
            .OrderBy(c => c.Acronym)
            .Select(c => new ProfessionalCouncilDto
            {
                Id = c.Id,
                Acronym = c.Acronym,
                Name = c.Name,
                Category = c.Category
            })
            .ToListAsync();

        return Ok(councils);
    }

    #endregion

    #region CBO - Classificação Brasileira de Ocupações

    /// <summary>
    /// Lista ocupações CBO
    /// </summary>
    [HttpGet("cbo")]
    [AllowAnonymous]
    public async Task<ActionResult<List<CboOccupationDto>>> GetCboOccupations(
        [FromQuery] string? search = null,
        [FromQuery] bool? teleconsultation = null)
    {
        var query = _context.CboOccupations
            .Where(c => c.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(c => c.Code.ToLower().Contains(searchLower) ||
                                    c.Name.ToLower().Contains(searchLower));
        }

        if (teleconsultation.HasValue)
        {
            query = query.Where(c => c.AllowsTeleconsultation == teleconsultation.Value);
        }

        var occupations = await query
            .OrderBy(c => c.Code)
            .Take(100)
            .Select(c => new CboOccupationDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                Family = c.Family,
                Subgroup = c.Subgroup,
                AllowsTeleconsultation = c.AllowsTeleconsultation
            })
            .ToListAsync();

        return Ok(occupations);
    }

    /// <summary>
    /// Importa ocupações CBO de arquivo CSV
    /// Formato esperado: Código;Nome;Família;Subgrupo;PermiteTeleconsulta
    /// </summary>
    [HttpPost("import/cbo")]
    public async Task<ActionResult<ImportResultDto>> ImportCbo(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Arquivo não fornecido" });

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = new ImportResultDto();

        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.GetCultureInfo("pt-BR"))
            {
                Delimiter = ";",
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            });

            var records = csv.GetRecords<CboImportDto>().ToList();

            foreach (var record in records)
            {
                result.TotalRecords++;

                if (string.IsNullOrEmpty(record.Code) || string.IsNullOrEmpty(record.Name))
                {
                    result.Errors.Add($"Registro inválido: código ou nome vazio");
                    continue;
                }

                var existing = await _context.CboOccupations
                    .FirstOrDefaultAsync(c => c.Code == record.Code);

                if (existing != null)
                {
                    // Atualiza registro existente
                    existing.Name = record.Name;
                    existing.Family = record.Family;
                    existing.Subgroup = record.Subgroup;
                    existing.AllowsTeleconsultation = record.AllowsTeleconsultation;
                    existing.UpdatedAt = DateTime.UtcNow;
                    result.UpdatedRecords++;
                }
                else
                {
                    // Insere novo registro
                    var occupation = new CboOccupation
                    {
                        Code = record.Code,
                        Name = record.Name,
                        Family = record.Family,
                        Subgroup = record.Subgroup,
                        AllowsTeleconsultation = record.AllowsTeleconsultation
                    };
                    _context.CboOccupations.Add(occupation);
                    result.InsertedRecords++;
                }
            }

            await _context.SaveChangesAsync();
            result.Success = true;
            result.Message = $"Importação concluída: {result.InsertedRecords} inseridos, {result.UpdatedRecords} atualizados";

            // Registra auditoria
            await _auditLogService.LogAsync(
                userId.Value,
                "IMPORT_CBO",
                "CboOccupation",
                "BATCH",
                null,
                $"Total: {result.TotalRecords}, Inseridos: {result.InsertedRecords}, Atualizados: {result.UpdatedRecords}",
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers["User-Agent"].ToString(),
                dataCategory: "CONFIGURACAO",
                accessReason: "Importação de tabela CBO"
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = $"Erro na importação: {ex.Message}";
            return StatusCode(500, result);
        }
    }

    #endregion

    #region SIGTAP - Sistema de Gerenciamento da Tabela de Procedimentos

    /// <summary>
    /// Lista procedimentos SIGTAP
    /// </summary>
    [HttpGet("sigtap")]
    [AllowAnonymous]
    public async Task<ActionResult<List<SigtapProcedureDto>>> GetSigtapProcedures(
        [FromQuery] string? search = null,
        [FromQuery] bool? telemedicine = null)
    {
        var query = _context.SigtapProcedures
            .Where(s => s.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(s => s.Code.ToLower().Contains(searchLower) ||
                                    s.Name.ToLower().Contains(searchLower));
        }

        if (telemedicine.HasValue)
        {
            query = query.Where(s => s.AllowsTelemedicine == telemedicine.Value);
        }

        var procedures = await query
            .OrderBy(s => s.Code)
            .Take(100)
            .Select(s => new SigtapProcedureDto
            {
                Id = s.Id,
                Code = s.Code,
                Name = s.Name,
                Description = s.Description,
                Complexity = s.Complexity.ToString(),
                GroupCode = s.GroupCode,
                GroupName = s.GroupName,
                SubgroupCode = s.SubgroupCode,
                SubgroupName = s.SubgroupName,
                Value = s.Value,
                AllowsTelemedicine = s.AllowsTelemedicine
            })
            .ToListAsync();

        return Ok(procedures);
    }

    /// <summary>
    /// Importa procedimentos SIGTAP de arquivo CSV
    /// Formato esperado: Código;Nome;Descrição;Complexidade;CódGrupo;NomeGrupo;CódSubgrupo;NomeSubgrupo;Valor;PermiteTelemedicina
    /// </summary>
    [HttpPost("import/sigtap")]
    public async Task<ActionResult<ImportResultDto>> ImportSigtap(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Arquivo não fornecido" });

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = new ImportResultDto();

        try
        {
            using var reader = new StreamReader(file.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.GetCultureInfo("pt-BR"))
            {
                Delimiter = ";",
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            });

            var records = csv.GetRecords<SigtapImportDto>().ToList();

            foreach (var record in records)
            {
                result.TotalRecords++;

                if (string.IsNullOrEmpty(record.Code) || string.IsNullOrEmpty(record.Name))
                {
                    result.Errors.Add($"Registro inválido: código ou nome vazio");
                    continue;
                }

                var existing = await _context.SigtapProcedures
                    .FirstOrDefaultAsync(s => s.Code == record.Code);

                if (existing != null)
                {
                    // Atualiza registro existente
                    existing.Name = record.Name;
                    existing.Description = record.Description;
                    existing.Complexity = ParseComplexity(record.Complexity);
                    existing.GroupCode = record.GroupCode;
                    existing.GroupName = record.GroupName;
                    existing.SubgroupCode = record.SubgroupCode;
                    existing.SubgroupName = record.SubgroupName;
                    existing.Value = record.Value;
                    existing.AllowsTelemedicine = record.AllowsTelemedicine;
                    existing.UpdatedAt = DateTime.UtcNow;
                    result.UpdatedRecords++;
                }
                else
                {
                    // Insere novo registro
                    var procedure = new SigtapProcedure
                    {
                        Code = record.Code,
                        Name = record.Name,
                        Description = record.Description,
                        Complexity = ParseComplexity(record.Complexity),
                        GroupCode = record.GroupCode,
                        GroupName = record.GroupName,
                        SubgroupCode = record.SubgroupCode,
                        SubgroupName = record.SubgroupName,
                        Value = record.Value,
                        AllowsTelemedicine = record.AllowsTelemedicine
                    };
                    _context.SigtapProcedures.Add(procedure);
                    result.InsertedRecords++;
                }
            }

            await _context.SaveChangesAsync();
            result.Success = true;
            result.Message = $"Importação concluída: {result.InsertedRecords} inseridos, {result.UpdatedRecords} atualizados";

            // Registra auditoria
            await _auditLogService.LogAsync(
                userId.Value,
                "IMPORT_SIGTAP",
                "SigtapProcedure",
                "BATCH",
                null,
                $"Total: {result.TotalRecords}, Inseridos: {result.InsertedRecords}, Atualizados: {result.UpdatedRecords}",
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers["User-Agent"].ToString(),
                dataCategory: "CONFIGURACAO",
                accessReason: "Importação de tabela SIGTAP"
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = $"Erro na importação: {ex.Message}";
            return StatusCode(500, result);
        }
    }

    #endregion

    #region Exportação de Auditoria

    /// <summary>
    /// Exporta logs de auditoria em CSV
    /// </summary>
    [HttpGet("audit/export")]
    public async Task<IActionResult> ExportAuditLogs(
        [FromQuery] Guid? userId = null,
        [FromQuery] Guid? patientId = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();

        var csvBytes = await _auditLogService.ExportAuditLogsCsvAsync(userId, patientId, startDate, endDate);

        // Registra a exportação
        await _auditLogService.LogAsync(
            currentUserId.Value,
            "EXPORT_AUDIT_LOGS",
            "AuditLog",
            "EXPORT",
            null,
            $"Filtros: userId={userId}, patientId={patientId}, startDate={startDate}, endDate={endDate}",
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers["User-Agent"].ToString(),
            patientId: patientId,
            dataCategory: "AUDITORIA",
            accessReason: "Exportação de logs de auditoria"
        );

        var fileName = $"auditoria_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    /// <summary>
    /// Busca logs de auditoria por paciente
    /// </summary>
    [HttpGet("audit/patient/{patientId}")]
    public async Task<ActionResult> GetAuditByPatient(
        Guid patientId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();

        var result = await _auditLogService.GetAuditLogsByPatientAsync(patientId, page, pageSize, startDate, endDate);

        // Registra a consulta
        await _auditLogService.LogAsync(
            currentUserId.Value,
            "VIEW_PATIENT_AUDIT",
            "AuditLog",
            patientId.ToString(),
            null,
            null,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers["User-Agent"].ToString(),
            patientId: patientId,
            dataCategory: "AUDITORIA",
            accessReason: "Consulta de logs de auditoria do paciente"
        );

        return Ok(result);
    }

    #endregion

    #region Helpers

    private static ProcedureComplexity ParseComplexity(string? complexity)
    {
        if (string.IsNullOrEmpty(complexity))
            return ProcedureComplexity.Basic;

        return complexity.ToLower() switch
        {
            "basic" or "basica" or "básica" or "ab" => ProcedureComplexity.Basic,
            "medium" or "media" or "média" or "mc" => ProcedureComplexity.Medium,
            "high" or "alta" or "ac" => ProcedureComplexity.High,
            _ => ProcedureComplexity.Basic
        };
    }

    #endregion
}
