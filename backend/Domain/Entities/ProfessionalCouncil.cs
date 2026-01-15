using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Conselhos de Classe Profissional (CRM, COREN, CRP, CRO, etc.)
/// Tabela de referência para identificação de profissionais de saúde
/// </summary>
public class ProfessionalCouncil : BaseEntity
{
    /// <summary>
    /// Sigla do conselho (ex: CRM, COREN, CRP, CRO, CREFITO)
    /// </summary>
    public string Acronym { get; set; } = string.Empty;
    
    /// <summary>
    /// Nome completo do conselho (ex: Conselho Regional de Medicina)
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Categoria profissional (ex: Medicina, Enfermagem, Psicologia)
    /// </summary>
    public string Category { get; set; } = string.Empty;
    
    /// <summary>
    /// Se o conselho está ativo no sistema
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    // Navigation Properties
    public ICollection<ProfessionalProfile> Professionals { get; set; } = new List<ProfessionalProfile>();
}
