using Application.DTOs.Attachments;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class AttachmentService : IAttachmentService
{
    private readonly ApplicationDbContext _context;
    private readonly string _uploadPath;

    public AttachmentService(ApplicationDbContext context, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _context = context;
        _uploadPath = configuration["FileStorage:UploadPath"] ?? "uploads";
        
        // Ensure upload directory exists
        if (!Directory.Exists(_uploadPath))
        {
            Directory.CreateDirectory(_uploadPath);
        }
    }

    public async Task<List<AttachmentDto>> GetAttachmentsByAppointmentAsync(Guid appointmentId)
    {
        return await _context.Attachments
            .Where(a => a.AppointmentId == appointmentId)
            .Select(a => new AttachmentDto
            {
                Id = a.Id,
                AppointmentId = a.AppointmentId,
                Title = a.Title,
                FileName = a.FileName,
                FilePath = a.FilePath,
                FileType = a.FileType,
                FileSize = a.FileSize,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<AttachmentDto?> GetAttachmentByIdAsync(Guid id)
    {
        var attachment = await _context.Attachments.FindAsync(id);
        if (attachment == null) return null;

        return new AttachmentDto
        {
            Id = attachment.Id,
            AppointmentId = attachment.AppointmentId,
            Title = attachment.Title,
            FileName = attachment.FileName,
            FilePath = attachment.FilePath,
            FileType = attachment.FileType,
            FileSize = attachment.FileSize,
            CreatedAt = attachment.CreatedAt
        };
    }

    public async Task<AttachmentDto> UploadAttachmentAsync(CreateAttachmentDto dto, IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new InvalidOperationException("File is required");

        // Validate file size (max 10MB)
        if (file.Length > 10 * 1024 * 1024)
            throw new InvalidOperationException("File size exceeds 10MB limit");

        // Validate file type
        var allowedExtensions = new[] { ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt" };
        var fileExtension = Path.GetExtension(file.FileName).ToLower();
        if (!allowedExtensions.Contains(fileExtension))
            throw new InvalidOperationException($"File type {fileExtension} is not allowed");

        // Generate unique filename
        var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
        var filePath = Path.Combine(_uploadPath, uniqueFileName);

        // Save file to disk
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var attachment = new Attachment
        {
            AppointmentId = dto.AppointmentId,
            Title = dto.Title,
            FileName = file.FileName,
            FilePath = filePath,
            FileType = file.ContentType,
            FileSize = file.Length
        };

        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();

        return new AttachmentDto
        {
            Id = attachment.Id,
            AppointmentId = attachment.AppointmentId,
            Title = attachment.Title,
            FileName = attachment.FileName,
            FilePath = attachment.FilePath,
            FileType = attachment.FileType,
            FileSize = attachment.FileSize,
            CreatedAt = attachment.CreatedAt
        };
    }

    public async Task<bool> DeleteAttachmentAsync(Guid id)
    {
        var attachment = await _context.Attachments.FindAsync(id);
        if (attachment == null) return false;

        // Delete physical file
        if (File.Exists(attachment.FilePath))
        {
            File.Delete(attachment.FilePath);
        }

        _context.Attachments.Remove(attachment);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<(byte[] fileContent, string contentType, string fileName)?> DownloadAttachmentAsync(Guid id)
    {
        var attachment = await _context.Attachments.FindAsync(id);
        if (attachment == null || !File.Exists(attachment.FilePath))
            return null;

        var fileContent = await File.ReadAllBytesAsync(attachment.FilePath);
        return (fileContent, attachment.FileType, attachment.FileName);
    }
}
