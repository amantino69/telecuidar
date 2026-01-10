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
    
    // Dados profissionais
    public string? Crm { get; set; } // Conselho Regional de Medicina
    public string? Cbo { get; set; } // Classificação Brasileira de Ocupações
    public Guid? SpecialtyId { get; set; } // Especialidade médica
    
    // Dados pessoais
    public string? Gender { get; set; } // Sexo (M, F, Outro)
    public DateTime? BirthDate { get; set; }
    public string? Nationality { get; set; }
    
    // Endereço
    public string? ZipCode { get; set; } // CEP
    public string? Address { get; set; } // Endereço completo
    public string? City { get; set; } // Município
    public string? State { get; set; } // Estado (UF)
    
    // Navigation Properties
    public User User { get; set; } = null!;
    public Specialty? Specialty { get; set; }
}
