namespace Application.DTOs.Email;

/// <summary>
/// Configurações do serviço de e-mail
/// </summary>
public class EmailSettings
{
    public bool Enabled { get; set; } = false;
    public string SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string FromName { get; set; } = "TeleCuidar";
    public string FromAddress { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;
}
