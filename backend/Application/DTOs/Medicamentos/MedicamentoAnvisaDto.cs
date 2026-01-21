namespace Application.DTOs.Medicamentos;

public class MedicamentoAnvisaDto
{
    public string Codigo { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string? PrincipioAtivo { get; set; }
    public string? ClasseTerapeutica { get; set; }
    public string? CategoriaRegulatoria { get; set; }
    public string? Empresa { get; set; }
    
    // Campos adicionais para e-SUS
    public string? FormaFarmaceutica { get; set; }
    public string? Concentracao { get; set; }
    public string? ViaAdministracao { get; set; }
    public string? CodigoCatmat { get; set; }
    public string? Laboratorio { get; set; }
    public string? Apresentacao { get; set; }
    public bool IsControlado { get; set; } = false;
    public string? TipoReceita { get; set; }
}

public class MedicamentoSearchResultDto
{
    public List<MedicamentoAnvisaDto> Medicamentos { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
