using Application.DTOs.Users;
using Domain.Entities;

namespace Application.Interfaces;

public interface IUserService
{
    Task<PaginatedUsersDto> GetUsersAsync(int page, int pageSize, string? search, string? role, string? status, Guid? specialtyId = null);
    Task<UserDto?> GetUserByIdAsync(Guid id);
    Task<UserDto> CreateUserAsync(CreateUserDto dto);
    Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserDto dto);
    Task<bool> DeleteUserAsync(Guid id);
    
    // Métodos para gerenciamento de perfis
    Task<PatientProfileDto?> GetPatientProfileAsync(Guid userId);
    Task<ProfessionalProfileDto?> GetProfessionalProfileAsync(Guid userId);
    Task<PatientProfileDto> CreateOrUpdatePatientProfileAsync(Guid userId, CreateUpdatePatientProfileDto dto);
    Task<ProfessionalProfileDto> CreateOrUpdateProfessionalProfileAsync(Guid userId, CreateUpdateProfessionalProfileDto dto);
}
