using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Perfil específico para usuários do tipo PROFESSIONAL
/// Relacionamento 1:1 com User
/// </summary>
public class ProfessionalProfile : BaseEntity
{
    // Referência ao usuário
    public Guid UserId { get; set; }
    
    // ============================================
    // Dados profissionais - Conselho de Classe
    // ============================================
    
    /// <summary>
    /// Conselho de classe (CRM, COREN, CRP, etc.)
    /// </summary>
    public Guid? CouncilId { get; set; }
    
    /// <summary>
    /// Número do registro no conselho (ex: 123456)
    /// </summary>
    public string? CouncilRegistration { get; set; }
    
    /// <summary>
    /// UF do conselho (ex: SP, RJ, MG)
    /// </summary>
    public string? CouncilState { get; set; }
    
    /// <summary>
    /// [LEGADO - Será migrado] Conselho Regional de Medicina
    /// Manter temporariamente para migration de dados existentes
    /// </summary>
    public string? Crm { get; set; }
    
    // ============================================
    // Dados profissionais - CBO e Especialidade
    // ============================================
    
    /// <summary>
    /// Código CBO do profissional (FK para CboOccupation)
    /// </summary>
    public Guid? CboOccupationId { get; set; }
    
    /// <summary>
    /// [LEGADO] Código CBO como string - mantido para compatibilidade
    /// </summary>
    public string? Cbo { get; set; }
    
    /// <summary>
    /// Especialidade médica
    /// </summary>
    public Guid? SpecialtyId { get; set; }
    
    // ============================================
    // Dados pessoais
    // ============================================
    public string? Gender { get; set; } // Sexo (M, F, Outro)
    public DateTime? BirthDate { get; set; }
    public string? Nationality { get; set; }
    
    // ============================================
    // Endereço
    // ============================================
    public string? ZipCode { get; set; } // CEP
    public string? Address { get; set; } // Endereço completo
    public string? City { get; set; } // Município
    public string? State { get; set; } // Estado (UF)
    
    // ============================================
    // Navigation Properties
    // ============================================
    public User User { get; set; } = null!;
    public Specialty? Specialty { get; set; }
    public ProfessionalCouncil? Council { get; set; }
    public CboOccupation? CboOccupation { get; set; }
}
