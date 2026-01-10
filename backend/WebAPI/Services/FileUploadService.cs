using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;

namespace WebAPI.Services;

public interface IFileUploadService
{
    Task<string> UploadAvatarAsync(Stream fileStream, string fileName, Guid userId);
    bool DeleteAvatar(string fileName);
    string GetAvatarUrl(string fileName);
}

public class FileUploadService : IFileUploadService
{
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly string _uploadsFolder = "avatars";

    public FileUploadService(IWebHostEnvironment webHostEnvironment)
    {
        _webHostEnvironment = webHostEnvironment;
    }

    public async Task<string> UploadAvatarAsync(Stream fileStream, string fileName, Guid userId)
    {
        try
        {
            // Create avatars folder if it doesn't exist
            var uploadsPath = Path.Combine(_webHostEnvironment.WebRootPath, _uploadsFolder);
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            // Generate unique filename
            var fileExtension = Path.GetExtension(fileName);
            var uniqueFileName = $"{userId}_{DateTime.UtcNow.Ticks}{fileExtension}";
            var filePath = Path.Combine(uploadsPath, uniqueFileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(stream);
            }

            // Return relative path for storage in database
            return $"/avatars/{uniqueFileName}";
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error uploading file: {ex.Message}", ex);
        }
    }

    public bool DeleteAvatar(string fileName)
    {
        try
        {
            if (string.IsNullOrEmpty(fileName))
                return false;

            // Extract just the filename from the path
            var justFileName = Path.GetFileName(fileName);
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, _uploadsFolder, justFileName);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting avatar: {ex.Message}");
            return false;
        }
    }

    public string GetAvatarUrl(string fileName)
    {
        if (string.IsNullOrEmpty(fileName))
            return string.Empty;

        if (fileName.StartsWith("/avatars/"))
            return fileName;

        return $"/avatars/{fileName}";
    }
}
