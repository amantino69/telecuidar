namespace Application.DTOs.Jitsi;

/// <summary>
/// DTO para geração de token JWT do Jitsi
/// </summary>
public class JitsiTokenRequestDto
{
    /// <summary>
    /// ID da consulta/appointment
    /// </summary>
    public Guid AppointmentId { get; set; }
}

/// <summary>
/// DTO de resposta com o token Jitsi
/// </summary>
public class JitsiTokenResponseDto
{
    /// <summary>
    /// Token JWT para autenticação no Jitsi (servidor self-hosted)
    /// </summary>
    public string Token { get; set; } = string.Empty;
    
    /// <summary>
    /// Nome da sala (room) no Jitsi - prefixado com "telecuidar-" para o servidor público
    /// </summary>
    public string RoomName { get; set; } = string.Empty;
    
    /// <summary>
    /// Domínio do servidor Jitsi self-hosted (requer JWT)
    /// </summary>
    public string Domain { get; set; } = string.Empty;
    
    /// <summary>
    /// Domínio do servidor Jitsi público (meet.jit.si) para uso no app mobile
    /// Não requer JWT, qualquer pessoa pode entrar com o nome da sala
    /// </summary>
    public string PublicDomain { get; set; } = "meet.jit.si";
    
    /// <summary>
    /// Nome da sala para o servidor público (prefixado para evitar colisões)
    /// </summary>
    public string PublicRoomName { get; set; } = string.Empty;
    
    /// <summary>
    /// Nome do usuário a ser exibido
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;
    
    /// <summary>
    /// Email do usuário
    /// </summary>
    public string Email { get; set; } = string.Empty;
    
    /// <summary>
    /// URL do avatar do usuário
    /// </summary>
    public string? AvatarUrl { get; set; }
    
    /// <summary>
    /// Se o usuário é moderador da sala
    /// </summary>
    public bool IsModerator { get; set; }
    
    /// <summary>
    /// Timestamp de expiração do token (Unix timestamp)
    /// </summary>
    public long ExpiresAt { get; set; }
}

/// <summary>
/// Configurações do Jitsi para o frontend
/// </summary>
public class JitsiConfigDto
{
    /// <summary>
    /// Se o Jitsi está habilitado
    /// </summary>
    public bool Enabled { get; set; }
    
    /// <summary>
    /// Domínio do servidor Jitsi
    /// </summary>
    public string Domain { get; set; } = string.Empty;
    
    /// <summary>
    /// Se requer autenticação JWT
    /// </summary>
    public bool RequiresAuth { get; set; }
}
