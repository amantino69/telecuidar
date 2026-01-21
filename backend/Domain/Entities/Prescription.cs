using Domain.Common;

namespace Domain.Entities;

public class Prescription : BaseEntity
{
    public Guid AppointmentId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid PatientId { get; set; }
    
    /// <summary>
    /// JSON array of PrescriptionItem objects
    /// </summary>
    public string ItemsJson { get; set; } = "[]";
    
    /// <summary>
    /// Digital signature in Base64 (ICP-Brasil)
    /// </summary>
    public string? DigitalSignature { get; set; }
    
    /// <summary>
    /// Certificate thumbprint used for signing
    /// </summary>
    public string? CertificateThumbprint { get; set; }
    
    /// <summary>
    /// Certificate subject (CN)
    /// </summary>
    public string? CertificateSubject { get; set; }
    
    /// <summary>
    /// When the document was signed
    /// </summary>
    public DateTime? SignedAt { get; set; }
    
    /// <summary>
    /// Unique hash of the document for validation
    /// </summary>
    public string? DocumentHash { get; set; }
    
    /// <summary>
    /// Signed PDF stored as Base64
    /// </summary>
    public string? SignedPdfBase64 { get; set; }
    
    // Navigation properties
    public Appointment Appointment { get; set; } = null!;
    public User Professional { get; set; } = null!;
    public User Patient { get; set; } = null!;
}

/// <summary>
/// Represents a single prescription item (medication) - Padrão e-SUS APS
/// </summary>
public class PrescriptionItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    // === IDENTIFICAÇÃO DO MEDICAMENTO ===
    /// <summary>Nome comercial ou princípio ativo</summary>
    public string Medicamento { get; set; } = string.Empty;
    
    /// <summary>Princípio ativo (DCB - Denominação Comum Brasileira)</summary>
    public string? PrincipioAtivo { get; set; }
    
    /// <summary>Código ANVISA do registro</summary>
    public string? CodigoAnvisa { get; set; }
    
    /// <summary>Código CATMAT (Catálogo de Materiais do SUS)</summary>
    public string? CodigoCatmat { get; set; }
    
    // === FORMA E APRESENTAÇÃO ===
    /// <summary>Forma farmacêutica (comprimido, cápsula, solução, etc.)</summary>
    public string? FormaFarmaceutica { get; set; }
    
    /// <summary>Concentração do medicamento (ex: 500mg, 10mg/ml)</summary>
    public string? Concentracao { get; set; }
    
    /// <summary>Apresentação completa (ex: "Comprimido 500mg - Caixa com 20")</summary>
    public string? Apresentacao { get; set; }
    
    // === POSOLOGIA E ADMINISTRAÇÃO ===
    /// <summary>Dose por administração (ex: "1 comprimido", "10ml")</summary>
    public string Dosagem { get; set; } = string.Empty;
    
    /// <summary>Via de administração (oral, intravenosa, tópica, etc.)</summary>
    public string? ViaAdministracao { get; set; }
    
    /// <summary>Frequência de uso (ex: "8 em 8 horas", "1x ao dia")</summary>
    public string Frequencia { get; set; } = string.Empty;
    
    /// <summary>Duração do tratamento (ex: "7 dias", "30 dias", "uso contínuo")</summary>
    public string Periodo { get; set; } = string.Empty;
    
    /// <summary>Instruções detalhadas de uso</summary>
    public string Posologia { get; set; } = string.Empty;
    
    // === QUANTIDADE E DISPENSAÇÃO ===
    /// <summary>Quantidade total a dispensar (número)</summary>
    public int? QuantidadeTotal { get; set; }
    
    /// <summary>Unidade da quantidade (comprimidos, ml, frascos, caixas)</summary>
    public string? UnidadeQuantidade { get; set; }
    
    // === TIPO DE RECEITA ===
    /// <summary>Tipo de receita: Simples, Controle Especial (C1-C5), Antimicrobiano</summary>
    public string TipoReceita { get; set; } = "Simples";
    
    /// <summary>Se é medicamento controlado (requer receita especial)</summary>
    public bool IsControlado { get; set; } = false;
    
    // === OBSERVAÇÕES ===
    /// <summary>Orientações adicionais ao paciente</summary>
    public string? Observacoes { get; set; }
    
    /// <summary>Laboratório fabricante</summary>
    public string? Laboratorio { get; set; }
}
