namespace Application.Interfaces;

/// <summary>
/// Serviço para envio de e-mails
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Envia um e-mail de forma assíncrona
    /// </summary>
    /// <param name="toEmail">E-mail do destinatário</param>
    /// <param name="toName">Nome do destinatário</param>
    /// <param name="subject">Assunto do e-mail</param>
    /// <param name="htmlBody">Corpo do e-mail em HTML</param>
    /// <param name="textBody">Corpo do e-mail em texto plano (opcional)</param>
    Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string htmlBody, string? textBody = null);

    /// <summary>
    /// Verifica se o serviço de e-mail está habilitado
    /// </summary>
    bool IsEnabled { get; }
}
