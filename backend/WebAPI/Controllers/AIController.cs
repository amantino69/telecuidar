using Application.DTOs.AI;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AIController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly IAuditLogService _auditLogService;

    public AIController(IAIService aiService, IAuditLogService auditLogService)
    {
        _aiService = aiService;
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Gera um resumo clínico baseado nos dados da consulta usando IA DeepSeek
    /// </summary>
    [HttpPost("summary")]
    public async Task<ActionResult<AISummaryResponseDto>> GenerateSummary([FromBody] GenerateSummaryRequestDto request)
    {
        try
        {
            var result = await _aiService.GenerateSummaryAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(503, new { message = "Erro ao comunicar com o serviço de IA: " + ex.Message });
        }
    }

    /// <summary>
    /// Gera hipóteses diagnósticas baseadas nos dados da consulta usando IA DeepSeek
    /// </summary>
    [HttpPost("diagnosis")]
    public async Task<ActionResult<AIDiagnosisResponseDto>> GenerateDiagnosis([FromBody] GenerateDiagnosisRequestDto request)
    {
        try
        {
            var result = await _aiService.GenerateDiagnosticHypothesisAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(503, new { message = "Erro ao comunicar com o serviço de IA: " + ex.Message });
        }
    }

    /// <summary>
    /// Obtém os dados de IA salvos para uma consulta específica
    /// </summary>
    [HttpGet("appointment/{appointmentId}")]
    public async Task<ActionResult<AIDataDto>> GetAIData(Guid appointmentId)
    {
        var result = await _aiService.GetAIDataAsync(appointmentId);
        if (result == null)
            return NotFound(new { message = "Consulta não encontrada" });

        return Ok(result);
    }

    /// <summary>
    /// Salva ou atualiza dados de IA para uma consulta
    /// </summary>
    [HttpPut("appointment/{appointmentId}")]
    public async Task<ActionResult> SaveAIData(Guid appointmentId, [FromBody] SaveAIDataDto data)
    {
        var success = await _aiService.SaveAIDataAsync(appointmentId, data);
        if (!success)
            return NotFound(new { message = "Consulta não encontrada" });

        return Ok(new { message = "Dados de IA salvos com sucesso" });
    }
}
