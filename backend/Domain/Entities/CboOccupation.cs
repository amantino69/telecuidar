using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Classificação Brasileira de Ocupações (CBO)
/// Tabela oficial do Ministério do Trabalho para identificação de ocupações
/// </summary>
public class CboOccupation : BaseEntity
{
    /// <summary>
    /// Código CBO (ex: 225125 para Médico Clínico)
    /// </summary>
    public string Code { get; set; } = string.Empty;
    
    /// <summary>
    /// Nome da ocupação (ex: Médico Clínico)
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Família ocupacional (ex: Médicos)
    /// </summary>
    public string? Family { get; set; }
    
    /// <summary>
    /// Subgrupo principal (ex: Profissionais da saúde)
    /// </summary>
    public string? Subgroup { get; set; }
    
    /// <summary>
    /// Se a ocupação permite teleconsulta conforme regulamentação
    /// </summary>
    public bool AllowsTeleconsultation { get; set; } = true;
    
    /// <summary>
    /// Se a ocupação está ativa no sistema
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    // Navigation Properties
    public ICollection<ProfessionalProfile> Professionals { get; set; } = new List<ProfessionalProfile>();
}
