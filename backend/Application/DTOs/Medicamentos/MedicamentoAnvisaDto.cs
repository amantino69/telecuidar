namespace Application.DTOs.Medicamentos;

public class MedicamentoAnvisaDto
{
    public string Codigo { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string? PrincipioAtivo { get; set; }
    public string? ClasseTerapeutica { get; set; }
    public string? CategoriaRegulatoria { get; set; }
    public string? Empresa { get; set; }
}

public class MedicamentoSearchResultDto
{
    public List<MedicamentoAnvisaDto> Medicamentos { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
