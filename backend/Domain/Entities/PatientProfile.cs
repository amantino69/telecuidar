using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Perfil específico para usuários do tipo PATIENT
/// Relacionamento 1:1 com User
/// </summary>
public class PatientProfile : BaseEntity
{
    // Referência ao usuário
    public Guid UserId { get; set; }
    
    // Dados de identificação
    public string? Cns { get; set; } // Cartão Nacional de Saúde
    public string? SocialName { get; set; } // Nome Social
    
    // Dados pessoais
    public string? Gender { get; set; } // Sexo (M, F, Outro)
    public DateTime? BirthDate { get; set; }
    public string? MotherName { get; set; }
    public string? FatherName { get; set; }
    public string? Nationality { get; set; }
    
    // Endereço
    public string? ZipCode { get; set; } // CEP
    public string? Address { get; set; } // Endereço completo
    public string? City { get; set; } // Município
    public string? State { get; set; } // Estado (UF)
    
    // Navigation Property
    public User User { get; set; } = null!;
}
