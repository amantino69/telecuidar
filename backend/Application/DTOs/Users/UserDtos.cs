namespace Application.DTOs.Users;

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Avatar { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Perfis específicos por tipo de usuário
    public PatientProfileDto? PatientProfile { get; set; }
    public ProfessionalProfileDto? ProfessionalProfile { get; set; }
}

public class CreateUserDto
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    
    // Perfis específicos por tipo de usuário
    public CreateUpdatePatientProfileDto? PatientProfile { get; set; }
    public CreateUpdateProfessionalProfileDto? ProfessionalProfile { get; set; }
}

public class UpdateUserDto
{
    public string? Name { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? Avatar { get; set; }
    public string? Status { get; set; }
    public string? Role { get; set; }
    
    // Perfis específicos por tipo de usuário
    public CreateUpdatePatientProfileDto? PatientProfile { get; set; }
    public CreateUpdateProfessionalProfileDto? ProfessionalProfile { get; set; }
}

public class PaginatedUsersDto
{
    public List<UserDto> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
