using Application.DTOs.Email;
using Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace Infrastructure.Services;

/// <summary>
/// Serviço de envio de e-mails usando SMTP
/// </summary>
public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(EmailSettings settings, ILogger<EmailService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public bool IsEnabled => _settings.Enabled;

    public async Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string htmlBody, string? textBody = null)
    {
        if (!_settings.Enabled)
        {
            _logger.LogInformation("E-mail não enviado - serviço desabilitado. Destinatário: {Email}, Assunto: {Subject}", toEmail, subject);
            return false;
        }

        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogWarning("E-mail não enviado - destinatário inválido");
            return false;
        }

        try
        {
            using var smtpClient = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
            {
                Credentials = new NetworkCredential(_settings.SmtpUser, _settings.SmtpPassword),
                EnableSsl = _settings.UseSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000 // 30 segundos
            };

            var fromAddress = new MailAddress(_settings.FromAddress, _settings.FromName);
            var toAddress = new MailAddress(toEmail, toName);

            using var mailMessage = new MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            // Adiciona versão em texto plano se fornecida
            if (!string.IsNullOrWhiteSpace(textBody))
            {
                var plainTextView = AlternateView.CreateAlternateViewFromString(textBody, null, "text/plain");
                var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html");
                mailMessage.AlternateViews.Add(plainTextView);
                mailMessage.AlternateViews.Add(htmlView);
            }

            await smtpClient.SendMailAsync(mailMessage);

            _logger.LogInformation("E-mail enviado com sucesso para {Email}. Assunto: {Subject}", toEmail, subject);
            return true;
        }
        catch (SmtpException ex)
        {
            _logger.LogError(ex, "Erro SMTP ao enviar e-mail para {Email}. Assunto: {Subject}", toEmail, subject);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado ao enviar e-mail para {Email}. Assunto: {Subject}", toEmail, subject);
            return false;
        }
    }
}
