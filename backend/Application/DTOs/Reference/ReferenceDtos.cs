namespace Application.DTOs.Reference;

/// <summary>
/// DTO para Conselho Profissional
/// </summary>
public class ProfessionalCouncilDto
{
    public Guid Id { get; set; }
    public string Acronym { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO para Ocupação CBO
/// </summary>
public class CboOccupationDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Family { get; set; }
    public string? Subgroup { get; set; }
    public bool AllowsTeleconsultation { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO para Procedimento SIGTAP
/// </summary>
public class SigtapProcedureDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Complexity { get; set; } = string.Empty;
    public string? GroupCode { get; set; }
    public string? GroupName { get; set; }
    public string? SubgroupCode { get; set; }
    public string? SubgroupName { get; set; }
    public decimal? Value { get; set; }
    public bool AllowsTelemedicine { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO para importação de CBO via CSV
/// </summary>
public class CboImportDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Family { get; set; }
    public string? Subgroup { get; set; }
    public bool AllowsTeleconsultation { get; set; } = true;
}

/// <summary>
/// DTO para importação de SIGTAP via CSV
/// </summary>
public class SigtapImportDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Complexity { get; set; }
    public string? GroupCode { get; set; }
    public string? GroupName { get; set; }
    public string? SubgroupCode { get; set; }
    public string? SubgroupName { get; set; }
    public decimal? Value { get; set; }
    public bool AllowsTelemedicine { get; set; } = false;
}

/// <summary>
/// Resultado de importação
/// </summary>
public class ImportResultDto
{
    public int TotalRecords { get; set; }
    public int InsertedRecords { get; set; }
    public int UpdatedRecords { get; set; }
    public int SkippedRecords { get; set; }
    public List<string> Errors { get; set; } = new();
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
