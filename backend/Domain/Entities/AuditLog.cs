using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Registro de auditoria para rastreabilidade de ações no sistema
/// Essencial para LGPD e requisitos de licitações públicas
/// </summary>
public class AuditLog : BaseEntity
{
    /// <summary>
    /// Usuário que realizou a ação
    /// </summary>
    public Guid? UserId { get; set; }
    
    /// <summary>
    /// Ação realizada (create, update, delete, access_patient_history, view_prescription, export_data, etc.)
    /// </summary>
    public string Action { get; set; } = string.Empty;
    
    /// <summary>
    /// Tipo da entidade afetada (Appointment, Prescription, User, etc.)
    /// </summary>
    public string EntityType { get; set; } = string.Empty;
    
    /// <summary>
    /// ID da entidade afetada
    /// </summary>
    public string EntityId { get; set; } = string.Empty;
    
    /// <summary>
    /// Valores anteriores (JSON) - para ações de update/delete
    /// </summary>
    public string? OldValues { get; set; }
    
    /// <summary>
    /// Novos valores (JSON) - para ações de create/update
    /// </summary>
    public string? NewValues { get; set; }
    
    /// <summary>
    /// Endereço IP de origem
    /// </summary>
    public string? IpAddress { get; set; }
    
    /// <summary>
    /// User Agent do navegador/cliente
    /// </summary>
    public string? UserAgent { get; set; }
    
    // ============================================
    // Campos para auditoria de acesso a dados de paciente (LGPD)
    // ============================================
    
    /// <summary>
    /// ID do paciente cujos dados foram acessados (quando aplicável)
    /// </summary>
    public Guid? PatientId { get; set; }
    
    /// <summary>
    /// CPF do paciente cujos dados foram acessados (para rastreabilidade mesmo se paciente for excluído)
    /// </summary>
    public string? PatientCpf { get; set; }
    
    /// <summary>
    /// Categoria dos dados acessados (prontuario, prescricao, exame, historico, laudo, atestado)
    /// </summary>
    public string? DataCategory { get; set; }
    
    /// <summary>
    /// Justificativa de acesso (opcional, para auditorias)
    /// </summary>
    public string? AccessReason { get; set; }
    
    // ============================================
    // Navigation Properties
    // ============================================
    public User? User { get; set; }
    public User? Patient { get; set; }
}
