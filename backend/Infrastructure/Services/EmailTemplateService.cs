namespace Infrastructure.Services;

/// <summary>
/// Serviço para gerar templates de e-mail HTML
/// </summary>
public static class EmailTemplateService
{
    /// <summary>
    /// Gera o template HTML para notificações
    /// </summary>
    public static string GenerateNotificationEmailHtml(
        string userName, 
        string title, 
        string message, 
        string type, 
        DateTime createdAt,
        string? link = null,
        string frontendUrl = "http://localhost:4200")
    {
        var typeColor = type.ToLower() switch
        {
            "success" => "#10b981",
            "warning" => "#f59e0b", 
            "error" => "#ef4444",
            "info" => "#3b82f6",
            _ => "#6b7280"
        };

        var typeIcon = type.ToLower() switch
        {
            "success" => "✓",
            "warning" => "⚠",
            "error" => "✕",
            "info" => "ℹ",
            _ => "•"
        };

        var typeName = type.ToLower() switch
        {
            "success" => "Sucesso",
            "warning" => "Atenção",
            "error" => "Erro",
            "info" => "Informação",
            _ => "Notificação"
        };

        var linkButton = !string.IsNullOrWhiteSpace(link) 
            ? $@"
                <tr>
                    <td style=""padding: 20px 0 0 0;"">
                        <a href=""{frontendUrl}{link}"" 
                           style=""display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;"">
                            Ver Detalhes
                        </a>
                    </td>
                </tr>"
            : "";

        return $@"
<!DOCTYPE html>
<html lang=""pt-BR"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{title} - TeleCuidar</title>
</head>
<body style=""margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;"">
    <table role=""presentation"" style=""width: 100%; border-collapse: collapse;"">
        <tr>
            <td style=""padding: 40px 20px;"">
                <table role=""presentation"" style=""max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;"">
                    <!-- Header -->
                    <tr>
                        <td style=""padding: 30px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); text-align: center;"">
                            <h1 style=""margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"">TeleCuidar</h1>
                            <p style=""margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;"">Plataforma de Telemedicina</p>
                        </td>
                    </tr>
                    
                    <!-- Greeting -->
                    <tr>
                        <td style=""padding: 30px 30px 0 30px;"">
                            <p style=""margin: 0; color: #374151; font-size: 16px;"">Olá, <strong>{userName}</strong>!</p>
                        </td>
                    </tr>
                    
                    <!-- Notification Badge -->
                    <tr>
                        <td style=""padding: 20px 30px;"">
                            <table role=""presentation"" style=""width: 100%; border-collapse: collapse;"">
                                <tr>
                                    <td style=""padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid {typeColor};"">
                                        <table role=""presentation"" style=""width: 100%; border-collapse: collapse;"">
                                            <tr>
                                                <td style=""width: 40px; vertical-align: top;"">
                                                    <div style=""width: 36px; height: 36px; background-color: {typeColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; line-height: 36px; text-align: center;"">
                                                        {typeIcon}
                                                    </div>
                                                </td>
                                                <td style=""padding-left: 15px;"">
                                                    <span style=""display: inline-block; padding: 2px 8px; background-color: {typeColor}; color: #ffffff; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px;"">{typeName}</span>
                                                    <h2 style=""margin: 8px 0; color: #111827; font-size: 18px; font-weight: 600;"">{title}</h2>
                                                    <p style=""margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;"">{message}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Action Button -->
                    <tr>
                        <td style=""padding: 0 30px; text-align: center;"">
                            <table role=""presentation"" style=""width: 100%; border-collapse: collapse;"">
                                {linkButton}
                                <tr>
                                    <td style=""padding: 20px 0 0 0;"">
                                        <a href=""{frontendUrl}/notificacoes"" 
                                           style=""display: inline-block; padding: 12px 24px; background-color: #6b7280; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;"">
                                            Ver Todas as Notificações
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Timestamp -->
                    <tr>
                        <td style=""padding: 30px; text-align: center;"">
                            <p style=""margin: 0; color: #9ca3af; font-size: 13px;"">
                                Enviado em {createdAt.ToLocalTime():dd/MM/yyyy} às {createdAt.ToLocalTime():HH:mm}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style=""padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;"">
                            <table role=""presentation"" style=""width: 100%; border-collapse: collapse;"">
                                <tr>
                                    <td style=""text-align: center;"">
                                        <p style=""margin: 0 0 10px 0; color: #6b7280; font-size: 13px;"">
                                            Este e-mail foi enviado automaticamente pelo sistema TeleCuidar.
                                        </p>
                                        <p style=""margin: 0; color: #9ca3af; font-size: 12px;"">
                                            Se você não deseja receber estas notificações, acesse suas configurações na plataforma.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }

    /// <summary>
    /// Gera versão em texto plano para clientes de e-mail que não suportam HTML
    /// </summary>
    public static string GenerateNotificationEmailPlainText(
        string userName, 
        string title, 
        string message, 
        string type, 
        DateTime createdAt,
        string? link = null,
        string frontendUrl = "http://localhost:4200")
    {
        var typeName = type.ToLower() switch
        {
            "success" => "SUCESSO",
            "warning" => "ATENÇÃO",
            "error" => "ERRO",
            "info" => "INFORMAÇÃO",
            _ => "NOTIFICAÇÃO"
        };

        var linkText = !string.IsNullOrWhiteSpace(link) 
            ? $"\nVer detalhes: {frontendUrl}{link}\n" 
            : "";

        return $@"
TeleCuidar - Plataforma de Telemedicina
========================================

Olá, {userName}!

[{typeName}] {title}

{message}
{linkText}
----------------------------------------
Enviado em: {createdAt.ToLocalTime():dd/MM/yyyy} às {createdAt.ToLocalTime():HH:mm}

Ver todas as notificações: {frontendUrl}/notificacoes

---
Este e-mail foi enviado automaticamente pelo sistema TeleCuidar.
";
    }
}
