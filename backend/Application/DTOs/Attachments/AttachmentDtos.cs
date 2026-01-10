namespace Application.DTOs.Attachments;

public class AttachmentDto
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateAttachmentDto
{
    public Guid AppointmentId { get; set; }
    public string Title { get; set; } = string.Empty;
}
