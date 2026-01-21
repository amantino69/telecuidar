namespace Application.DTOs.Receitas;

public class PrescriptionDto
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public Guid ProfessionalId { get; set; }
    public string? ProfessionalName { get; set; }
    public string? ProfessionalCrm { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCpf { get; set; }
    public List<PrescriptionItemDto> Items { get; set; } = new();
    public bool IsSigned { get; set; }
    public string? CertificateSubject { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? DocumentHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PrescriptionItemDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    // === IDENTIFICAÇÃO DO MEDICAMENTO ===
    public string Medicamento { get; set; } = string.Empty;
    public string? PrincipioAtivo { get; set; }
    public string? CodigoAnvisa { get; set; }
    public string? CodigoCatmat { get; set; }
    
    // === FORMA E APRESENTAÇÃO ===
    public string? FormaFarmaceutica { get; set; }
    public string? Concentracao { get; set; }
    public string? Apresentacao { get; set; }
    
    // === POSOLOGIA E ADMINISTRAÇÃO ===
    public string Dosagem { get; set; } = string.Empty;
    public string? ViaAdministracao { get; set; }
    public string Frequencia { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public string Posologia { get; set; } = string.Empty;
    
    // === QUANTIDADE E DISPENSAÇÃO ===
    public int? QuantidadeTotal { get; set; }
    public string? UnidadeQuantidade { get; set; }
    
    // === TIPO DE RECEITA ===
    public string TipoReceita { get; set; } = "Simples";
    public bool IsControlado { get; set; } = false;
    
    // === OBSERVAÇÕES ===
    public string? Observacoes { get; set; }
    public string? Laboratorio { get; set; }
}

public class CreatePrescriptionDto
{
    public Guid AppointmentId { get; set; }
    public List<PrescriptionItemDto> Items { get; set; } = new();
}

public class UpdatePrescriptionDto
{
    public List<PrescriptionItemDto> Items { get; set; } = new();
}

public class AddPrescriptionItemDto
{
    // === IDENTIFICAÇÃO DO MEDICAMENTO ===
    public string Medicamento { get; set; } = string.Empty;
    public string? PrincipioAtivo { get; set; }
    public string? CodigoAnvisa { get; set; }
    public string? CodigoCatmat { get; set; }
    
    // === FORMA E APRESENTAÇÃO ===
    public string? FormaFarmaceutica { get; set; }
    public string? Concentracao { get; set; }
    public string? Apresentacao { get; set; }
    
    // === POSOLOGIA E ADMINISTRAÇÃO ===
    public string Dosagem { get; set; } = string.Empty;
    public string? ViaAdministracao { get; set; }
    public string Frequencia { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public string Posologia { get; set; } = string.Empty;
    
    // === QUANTIDADE E DISPENSAÇÃO ===
    public int? QuantidadeTotal { get; set; }
    public string? UnidadeQuantidade { get; set; }
    
    // === TIPO DE RECEITA ===
    public string TipoReceita { get; set; } = "Simples";
    public bool IsControlado { get; set; } = false;
    
    // === OBSERVAÇÕES ===
    public string? Observacoes { get; set; }
    public string? Laboratorio { get; set; }
}

public class UpdatePrescriptionItemDto
{
    // === IDENTIFICAÇÃO DO MEDICAMENTO ===
    public string Medicamento { get; set; } = string.Empty;
    public string? PrincipioAtivo { get; set; }
    public string? CodigoAnvisa { get; set; }
    public string? CodigoCatmat { get; set; }
    
    // === FORMA E APRESENTAÇÃO ===
    public string? FormaFarmaceutica { get; set; }
    public string? Concentracao { get; set; }
    public string? Apresentacao { get; set; }
    
    // === POSOLOGIA E ADMINISTRAÇÃO ===
    public string Dosagem { get; set; } = string.Empty;
    public string? ViaAdministracao { get; set; }
    public string Frequencia { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public string Posologia { get; set; } = string.Empty;
    
    // === QUANTIDADE E DISPENSAÇÃO ===
    public int? QuantidadeTotal { get; set; }
    public string? UnidadeQuantidade { get; set; }
    
    // === TIPO DE RECEITA ===
    public string TipoReceita { get; set; } = "Simples";
    public bool IsControlado { get; set; } = false;
    
    // === OBSERVAÇÕES ===
    public string? Observacoes { get; set; }
    public string? Laboratorio { get; set; }
}

public class SignPrescriptionDto
{
    public string CertificateThumbprint { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public string CertificateSubject { get; set; } = string.Empty;
}

public class PrescriptionPdfDto
{
    public string PdfBase64 { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string DocumentHash { get; set; } = string.Empty;
    public bool IsSigned { get; set; }
}

public class MedicamentoAnvisaDto
{
    public string Codigo { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string? PrincipioAtivo { get; set; }
    public string? Laboratorio { get; set; }
    public string? Apresentacao { get; set; }
    public string? Categoria { get; set; }
    public string? FormaFarmaceutica { get; set; }
    public string? Concentracao { get; set; }
    public string? ViaAdministracao { get; set; }
    public bool IsControlado { get; set; }
    public string? TipoReceita { get; set; }
}

/// <summary>
/// Tipos de receita conforme legislação brasileira
/// </summary>
public static class TiposReceita
{
    public const string Simples = "Simples";
    public const string ControleEspecialBranca = "Controle Especial - Branca (C1)";
    public const string ControleEspecialAzul = "Controle Especial - Azul (B)";
    public const string ControleEspecialAmarela = "Controle Especial - Amarela (A)";
    public const string Antimicrobiano = "Antimicrobiano";
    public const string Retinoides = "Retinoides";
}

/// <summary>
/// Vias de administração padrão
/// </summary>
public static class ViasAdministracao
{
    public static readonly string[] Lista = new[]
    {
        "Oral",
        "Sublingual",
        "Intravenosa (IV)",
        "Intramuscular (IM)",
        "Subcutânea (SC)",
        "Tópica",
        "Oftálmica",
        "Auricular",
        "Nasal",
        "Inalatória",
        "Retal",
        "Vaginal",
        "Transdérmica",
        "Intradérmica"
    };
}

/// <summary>
/// Formas farmacêuticas padrão
/// </summary>
public static class FormasFarmaceuticas
{
    public static readonly string[] Lista = new[]
    {
        "Comprimido",
        "Comprimido revestido",
        "Cápsula",
        "Cápsula gelatinosa",
        "Drágea",
        "Solução oral",
        "Suspensão oral",
        "Xarope",
        "Gotas",
        "Solução injetável",
        "Pó para solução injetável",
        "Pomada",
        "Creme",
        "Gel",
        "Loção",
        "Spray",
        "Aerossol",
        "Colírio",
        "Supositório",
        "Óvulo vaginal",
        "Adesivo transdérmico",
        "Pó para inalação",
        "Solução para inalação"
    };
}
