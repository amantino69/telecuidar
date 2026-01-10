using Application.DTOs.Medicamentos;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MedicamentosController : ControllerBase
{
    private readonly IMedicamentoAnvisaService _medicamentoService;
    private readonly ILogger<MedicamentosController> _logger;

    public MedicamentosController(
        IMedicamentoAnvisaService medicamentoService,
        ILogger<MedicamentosController> logger)
    {
        _medicamentoService = medicamentoService;
        _logger = logger;
    }

    /// <summary>
    /// Busca medicamentos na base ANVISA
    /// </summary>
    /// <param name="query">Termo de busca (mínimo 2 caracteres)</param>
    /// <param name="page">Página (padrão: 1)</param>
    /// <param name="pageSize">Itens por página (padrão: 20, máximo: 100)</param>
    /// <returns>Lista paginada de medicamentos</returns>
    [HttpGet("search")]
    public async Task<ActionResult<MedicamentoSearchResultDto>> Search(
        [FromQuery] string query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return Ok(new MedicamentoSearchResultDto
            {
                Medicamentos = new List<MedicamentoAnvisaDto>(),
                TotalResults = 0,
                Page = page,
                PageSize = pageSize
            });
        }

        // Limitar tamanho da página
        pageSize = Math.Min(pageSize, 100);
        page = Math.Max(page, 1);

        try
        {
            var result = await _medicamentoService.SearchMedicamentosAsync(query, page, pageSize);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao buscar medicamentos");
            return StatusCode(500, "Erro ao buscar medicamentos");
        }
    }

    /// <summary>
    /// Retorna estatísticas da base de medicamentos
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetStats()
    {
        try
        {
            var count = await _medicamentoService.GetTotalCountAsync();
            return Ok(new
            {
                totalMedicamentos = count,
                fonte = "ANVISA - Dados Abertos",
                ultimaAtualizacao = "Consulte dados.anvisa.gov.br"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter estatísticas");
            return StatusCode(500, "Erro ao obter estatísticas");
        }
    }
}
