using Application.DTOs.Certificates;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateStorageService _certificateService;
    private readonly ILogger<CertificatesController> _logger;

    public CertificatesController(
        ICertificateStorageService certificateService,
        ILogger<CertificatesController> logger)
    {
        _certificateService = certificateService;
        _logger = logger;
    }

    /// <summary>
    /// Lista todos os certificados salvos do usuário atual
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SavedCertificateDto>>> GetSavedCertificates()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var certificates = await _certificateService.GetSavedCertificatesAsync(userId.Value);
        return Ok(certificates);
    }

    /// <summary>
    /// Valida um arquivo PFX e retorna informações do certificado
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<PfxValidationResultDto>> ValidatePfx([FromBody] ValidatePfxRequestDto request)
    {
        if (string.IsNullOrEmpty(request.PfxBase64) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest("PFX e senha sao obrigatorios");
        }

        var result = await _certificateService.ValidatePfxAsync(request.PfxBase64, request.Password);
        return Ok(result);
    }

    /// <summary>
    /// Salva um novo certificado
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SavedCertificateDto>> SaveCertificate([FromBody] SaveCertificateRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        try
        {
            var result = await _certificateService.SaveCertificateAsync(userId.Value, request);
            return CreatedAtAction(nameof(GetSavedCertificates), result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Remove um certificado salvo
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCertificate(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        try
        {
            await _certificateService.DeleteCertificateAsync(userId.Value, id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Atualiza configurações de um certificado
    /// </summary>
    [HttpPatch("{id}")]
    public async Task<ActionResult<SavedCertificateDto>> UpdateCertificate(Guid id, [FromBody] UpdateCertificateRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        try
        {
            var result = await _certificateService.UpdateCertificateAsync(userId.Value, id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Valida a senha de um certificado salvo
    /// </summary>
    [HttpPost("{id}/validate-password")]
    public async Task<ActionResult<bool>> ValidateSavedCertificatePassword(Guid id, [FromBody] ValidatePasswordRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        try
        {
            var isValid = await _certificateService.ValidateSavedCertificatePasswordAsync(userId.Value, id, request.Password);
            return Ok(new { isValid });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    private Guid? GetCurrentUserId()
    {
        // Tenta primeiro o claim padrão JWT 'sub', depois o NameIdentifier
        var userIdClaim = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return null;
        }
        return userId;
    }
}
