using Application.DTOs.Specialties;

namespace Application.Interfaces;

public interface ISpecialtyService
{
    Task<PaginatedSpecialtiesDto> GetSpecialtiesAsync(int page, int pageSize, string? search, string? status);
    Task<SpecialtyDto?> GetSpecialtyByIdAsync(Guid id);
    Task<SpecialtyDto> CreateSpecialtyAsync(CreateSpecialtyDto dto);
    Task<SpecialtyDto?> UpdateSpecialtyAsync(Guid id, UpdateSpecialtyDto dto);
    Task<bool> DeleteSpecialtyAsync(Guid id);
}
