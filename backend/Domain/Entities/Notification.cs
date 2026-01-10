using Domain.Common;

namespace Domain.Entities;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // info, warning, error, success
    public bool IsRead { get; set; } = false;
    public string? Link { get; set; }
    
    // Navigation Properties
    public User User { get; set; } = null!;
}
