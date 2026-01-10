using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public class Specialty : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public SpecialtyStatus Status { get; set; } = SpecialtyStatus.Active;
    public string? CustomFieldsJson { get; set; } // Store CustomField[] as JSON
    
    // Navigation Properties
    public ICollection<ProfessionalProfile> Professionals { get; set; } = new List<ProfessionalProfile>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
