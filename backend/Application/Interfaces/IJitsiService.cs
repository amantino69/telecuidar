using Application.DTOs.Jitsi;

namespace Application.Interfaces;

/// <summary>
/// Serviço para gerenciamento de tokens e configurações do Jitsi Meet
/// </summary>
public interface IJitsiService
{
    /// <summary>
    /// Gera um token JWT para autenticação no Jitsi Meet
    /// </summary>
    /// <param name="userId">ID do usuário</param>
    /// <param name="appointmentId">ID da consulta</param>
    /// <param name="requestHost">Host da requisição (para domínio dinâmico em dev)</param>
    /// <returns>Token e configurações para acesso à sala</returns>
    Task<JitsiTokenResponseDto?> GenerateTokenAsync(Guid userId, Guid appointmentId, string? requestHost = null);
    
    /// <summary>
    /// Obtém as configurações do Jitsi
    /// </summary>
    /// <param name="requestHost">Host da requisição (para domínio dinâmico em dev)</param>
    /// <returns>Configurações do Jitsi</returns>
    JitsiConfigDto GetConfig(string? requestHost = null);
    
    /// <summary>
    /// Valida se um usuário tem acesso a uma sala específica
    /// </summary>
    /// <param name="userId">ID do usuário</param>
    /// <param name="appointmentId">ID da consulta</param>
    /// <returns>True se tem acesso</returns>
    Task<bool> ValidateAccessAsync(Guid userId, Guid appointmentId);
}
