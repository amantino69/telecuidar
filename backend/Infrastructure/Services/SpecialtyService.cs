using Application.DTOs.Specialties;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class SpecialtyService : ISpecialtyService
{
    private readonly ApplicationDbContext _context;

    public SpecialtyService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedSpecialtiesDto> GetSpecialtiesAsync(int page, int pageSize, string? search, string? status)
    {
        var query = _context.Specialties.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(s => s.Name.Contains(search) || s.Description.Contains(search));
        }

        if (!string.IsNullOrEmpty(status) && status.ToLower() != "all")
        {
            if (Enum.TryParse<SpecialtyStatus>(status, true, out var specialtyStatus))
            {
                query = query.Where(s => s.Status == specialtyStatus);
            }
        }

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var specialties = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SpecialtyDto
            {
                Id = s.Id,
                Name = s.Name,
                Description = s.Description,
                Status = s.Status.ToString(),
                CustomFieldsJson = s.CustomFieldsJson,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return new PaginatedSpecialtiesDto
        {
            Data = specialties,
            Total = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<SpecialtyDto?> GetSpecialtyByIdAsync(Guid id)
    {
        var specialty = await _context.Specialties.FindAsync(id);
        if (specialty == null) return null;

        return new SpecialtyDto
        {
            Id = specialty.Id,
            Name = specialty.Name,
            Description = specialty.Description,
            Status = specialty.Status.ToString(),
            CustomFieldsJson = specialty.CustomFieldsJson,
            CreatedAt = specialty.CreatedAt,
            UpdatedAt = specialty.UpdatedAt
        };
    }

    public async Task<SpecialtyDto> CreateSpecialtyAsync(CreateSpecialtyDto dto)
    {
        var specialty = new Specialty
        {
            Name = dto.Name,
            Description = dto.Description,
            Status = SpecialtyStatus.Active,
            CustomFieldsJson = dto.CustomFieldsJson
        };

        _context.Specialties.Add(specialty);
        await _context.SaveChangesAsync();

        return new SpecialtyDto
        {
            Id = specialty.Id,
            Name = specialty.Name,
            Description = specialty.Description,
            Status = specialty.Status.ToString(),
            CustomFieldsJson = specialty.CustomFieldsJson,
            CreatedAt = specialty.CreatedAt,
            UpdatedAt = specialty.UpdatedAt
        };
    }

    public async Task<SpecialtyDto?> UpdateSpecialtyAsync(Guid id, UpdateSpecialtyDto dto)
    {
        var specialty = await _context.Specialties.FindAsync(id);
        if (specialty == null) return null;

        if (!string.IsNullOrEmpty(dto.Name))
            specialty.Name = dto.Name;

        if (!string.IsNullOrEmpty(dto.Description))
            specialty.Description = dto.Description;

        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<SpecialtyStatus>(dto.Status, true, out var status))
            specialty.Status = status;

        if (dto.CustomFieldsJson != null)
            specialty.CustomFieldsJson = dto.CustomFieldsJson;

        specialty.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new SpecialtyDto
        {
            Id = specialty.Id,
            Name = specialty.Name,
            Description = specialty.Description,
            Status = specialty.Status.ToString(),
            CustomFieldsJson = specialty.CustomFieldsJson,
            CreatedAt = specialty.CreatedAt,
            UpdatedAt = specialty.UpdatedAt
        };
    }

    public async Task<bool> DeleteSpecialtyAsync(Guid id)
    {
        var specialty = await _context.Specialties.FindAsync(id);
        if (specialty == null) return false;

        _context.Specialties.Remove(specialty);
        await _context.SaveChangesAsync();
        return true;
    }
}
