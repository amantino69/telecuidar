using Application.DTOs.Attachments;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _attachmentService;

    public AttachmentsController(IAttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    [HttpGet("appointment/{appointmentId}")]
    public async Task<ActionResult<List<AttachmentDto>>> GetAttachmentsByAppointment(Guid appointmentId)
    {
        var attachments = await _attachmentService.GetAttachmentsByAppointmentAsync(appointmentId);
        return Ok(attachments);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AttachmentDto>> GetAttachment(Guid id)
    {
        var attachment = await _attachmentService.GetAttachmentByIdAsync(id);
        if (attachment == null)
            return NotFound();

        return Ok(attachment);
    }

    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
    public async Task<ActionResult<AttachmentDto>> UploadAttachment([FromForm] CreateAttachmentDto dto, IFormFile file)
    {
        try
        {
            var attachment = await _attachmentService.UploadAttachmentAsync(dto, file);
            return CreatedAtAction(nameof(GetAttachment), new { id = attachment.Id }, attachment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadAttachment(Guid id)
    {
        var result = await _attachmentService.DownloadAttachmentAsync(id);
        if (result == null)
            return NotFound();

        return File(result.Value.fileContent, result.Value.contentType, result.Value.fileName);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteAttachment(Guid id)
    {
        var result = await _attachmentService.DeleteAttachmentAsync(id);
        if (!result)
            return NotFound();

        return Ok(new { message = "Attachment deleted successfully" });
    }
}
