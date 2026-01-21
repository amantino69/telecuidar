using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Complexidade do procedimento SIGTAP
/// </summary>
public enum ProcedureComplexity
{
    /// <summary>
    /// Atenção Básica
    /// </summary>
    Basic,
    
    /// <summary>
    /// Média Complexidade
    /// </summary>
    Medium,
    
    /// <summary>
    /// Alta Complexidade
    /// </summary>
    High
}

/// <summary>
/// Sistema de Gerenciamento da Tabela de Procedimentos (SIGTAP)
/// Tabela oficial do SUS para procedimentos médicos
/// </summary>
public class SigtapProcedure : BaseEntity
{
    /// <summary>
    /// Código do procedimento SIGTAP (10 dígitos)
    /// </summary>
    public string Code { get; set; } = string.Empty;
    
    /// <summary>
    /// Nome do procedimento
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Descrição detalhada do procedimento
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Complexidade do procedimento
    /// </summary>
    public ProcedureComplexity Complexity { get; set; } = ProcedureComplexity.Basic;
    
    /// <summary>
    /// Grupo do procedimento (ex: 03 - Procedimentos Clínicos)
    /// </summary>
    public string? GroupCode { get; set; }
    
    /// <summary>
    /// Nome do grupo
    /// </summary>
    public string? GroupName { get; set; }
    
    /// <summary>
    /// Subgrupo do procedimento
    /// </summary>
    public string? SubgroupCode { get; set; }
    
    /// <summary>
    /// Nome do subgrupo
    /// </summary>
    public string? SubgroupName { get; set; }
    
    /// <summary>
    /// CBOs autorizados a realizar o procedimento (JSON array de códigos CBO)
    /// </summary>
    public string? AuthorizedCbosJson { get; set; }
    
    /// <summary>
    /// Valor do procedimento em reais (tabela SUS)
    /// </summary>
    public decimal? Value { get; set; }
    
    /// <summary>
    /// Se o procedimento pode ser realizado via telemedicina
    /// </summary>
    public bool AllowsTelemedicine { get; set; } = false;
    
    /// <summary>
    /// Se o procedimento está ativo na tabela SIGTAP
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// Competência de início de vigência (AAAAMM)
    /// </summary>
    public string? StartCompetency { get; set; }
    
    /// <summary>
    /// Competência de fim de vigência (AAAAMM) - null se ainda vigente
    /// </summary>
    public string? EndCompetency { get; set; }
}
