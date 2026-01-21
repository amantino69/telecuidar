using Application.DTOs.Attachments;
using Microsoft.AspNetCore.Http;

namespace Application.Interfaces;

public interface IAttachmentService
{
    Task<List<AttachmentDto>> GetAttachmentsByAppointmentAsync(Guid appointmentId);
    Task<AttachmentDto?> GetAttachmentByIdAsync(Guid id);
    Task<AttachmentDto> UploadAttachmentAsync(CreateAttachmentDto dto, IFormFile file);
    Task<bool> DeleteAttachmentAsync(Guid id);
    Task<(byte[] fileContent, string contentType, string fileName)?> DownloadAttachmentAsync(Guid id);
}
