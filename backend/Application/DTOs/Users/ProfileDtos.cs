namespace Application.DTOs.Users;

/// <summary>
/// DTO para dados do perfil de paciente
/// </summary>
public class PatientProfileDto
{
    public Guid? Id { get; set; }
    public string? Cns { get; set; }
    public string? SocialName { get; set; }
    public string? Gender { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? MotherName { get; set; }
    public string? FatherName { get; set; }
    public string? Nationality { get; set; }
    public string? ZipCode { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
}

/// <summary>
/// DTO para dados do perfil de profissional
/// </summary>
public class ProfessionalProfileDto
{
    public Guid? Id { get; set; }
    public string? Crm { get; set; }
    public string? Cbo { get; set; }
    public Guid? SpecialtyId { get; set; }
    public string? SpecialtyName { get; set; }
    public string? Gender { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Nationality { get; set; }
    public string? ZipCode { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
}

/// <summary>
/// DTO para criar/atualizar perfil de paciente
/// </summary>
public class CreateUpdatePatientProfileDto
{
    public string? Cns { get; set; }
    public string? SocialName { get; set; }
    public string? Gender { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? MotherName { get; set; }
    public string? FatherName { get; set; }
    public string? Nationality { get; set; }
    public string? ZipCode { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
}

/// <summary>
/// DTO para criar/atualizar perfil de profissional
/// </summary>
public class CreateUpdateProfessionalProfileDto
{
    public string? Crm { get; set; }
    public string? Cbo { get; set; }
    public Guid? SpecialtyId { get; set; }
    public string? Gender { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Nationality { get; set; }
    public string? ZipCode { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
}
