using Domain.Common;

namespace Domain.Entities;

public class Attachment : BaseEntity
{
    public Guid AppointmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    
    // Navigation Properties
    public Appointment Appointment { get; set; } = null!;
}
