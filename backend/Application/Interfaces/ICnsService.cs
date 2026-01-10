using Application.DTOs.Cns;

namespace Application.Interfaces;

/// <summary>
/// Interface para serviço de integração com CADSUS/CNS (Cartão Nacional de Saúde)
/// Utiliza autenticação via certificado digital A1 (.pfx) e requisições SOAP
/// </summary>
public interface ICnsService
{
    /// <summary>
    /// Consulta dados de um cidadão no CADSUS pelo CPF
    /// </summary>
    /// <param name="cpf">CPF do cidadão (com ou sem formatação)</param>
    /// <returns>Dados completos do cidadão cadastrado no CADSUS</returns>
    Task<CnsCidadaoDto> ConsultarCpfAsync(string cpf);
    
    /// <summary>
    /// Obtém o status do token de autenticação JWT
    /// </summary>
    /// <returns>Status do token incluindo validade e tempo restante</returns>
    CnsTokenStatusDto GetTokenStatus();
    
    /// <summary>
    /// Força a renovação do token de autenticação
    /// </summary>
    /// <returns>Novo status do token após renovação</returns>
    Task<CnsTokenStatusDto> ForceTokenRenewalAsync();
    
    /// <summary>
    /// Verifica se o serviço está configurado e pronto para uso
    /// </summary>
    /// <returns>True se o certificado está configurado corretamente</returns>
    bool IsConfigured();
}
