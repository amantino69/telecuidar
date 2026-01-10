using System.Text.RegularExpressions;

namespace Application.Validators;

public static class CustomValidators
{
    public static bool IsValidCpf(string cpf)
    {
        if (string.IsNullOrWhiteSpace(cpf))
            return false;

        // Remove formatting
        cpf = Regex.Replace(cpf, @"[^\d]", "");

        if (cpf.Length != 11)
            return false;

        // Check if all digits are the same
        if (cpf.Distinct().Count() == 1)
            return false;

        // Validate first digit
        int sum = 0;
        for (int i = 0; i < 9; i++)
            sum += int.Parse(cpf[i].ToString()) * (10 - i);

        int remainder = sum % 11;
        int firstDigit = remainder < 2 ? 0 : 11 - remainder;

        if (int.Parse(cpf[9].ToString()) != firstDigit)
            return false;

        // Validate second digit
        sum = 0;
        for (int i = 0; i < 10; i++)
            sum += int.Parse(cpf[i].ToString()) * (11 - i);

        remainder = sum % 11;
        int secondDigit = remainder < 2 ? 0 : 11 - remainder;

        return int.Parse(cpf[10].ToString()) == secondDigit;
    }

    public static bool IsValidPhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return false;

        // Remove formatting
        phone = Regex.Replace(phone, @"[^\d]", "");

        // Brazilian phone: 10 digits (landline) or 11 digits (mobile)
        return phone.Length == 10 || phone.Length == 11;
    }

    public static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    public static string FormatCpf(string cpf)
    {
        cpf = Regex.Replace(cpf, @"[^\d]", "");
        if (cpf.Length != 11) return cpf;

        return $"{cpf.Substring(0, 3)}.{cpf.Substring(3, 3)}.{cpf.Substring(6, 3)}-{cpf.Substring(9, 2)}";
    }

    public static string FormatPhone(string phone)
    {
        phone = Regex.Replace(phone, @"[^\d]", "");
        
        if (phone.Length == 11)
            return $"({phone.Substring(0, 2)}) {phone.Substring(2, 5)}-{phone.Substring(7, 4)}";
        
        if (phone.Length == 10)
            return $"({phone.Substring(0, 2)}) {phone.Substring(2, 4)}-{phone.Substring(6, 4)}";

        return phone;
    }

    /// <summary>
    /// Validates if password meets security requirements:
    /// - At least 8 characters
    /// - At least one uppercase letter
    /// - At least one lowercase letter
    /// - At least one number
    /// - At least one special character (@$!%*?&)
    /// </summary>
    public static bool IsValidPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            return false;

        // At least one uppercase letter
        if (!Regex.IsMatch(password, @"[A-Z]"))
            return false;

        // At least one lowercase letter
        if (!Regex.IsMatch(password, @"[a-z]"))
            return false;

        // At least one digit
        if (!Regex.IsMatch(password, @"\d"))
            return false;

        // At least one special character
        if (!Regex.IsMatch(password, @"[@$!%*?&]"))
            return false;

        return true;
    }

    /// <summary>
    /// Gets missing password requirements
    /// </summary>
    public static List<string> GetPasswordMissingRequirements(string password)
    {
        var missing = new List<string>();

        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            missing.Add("minimum 8 characters");

        if (!Regex.IsMatch(password ?? "", @"[A-Z]"))
            missing.Add("one uppercase letter");

        if (!Regex.IsMatch(password ?? "", @"[a-z]"))
            missing.Add("one lowercase letter");

        if (!Regex.IsMatch(password ?? "", @"\d"))
            missing.Add("one number");

        if (!Regex.IsMatch(password ?? "", @"[@$!%*?&]"))
            missing.Add("one special character (@$!%*?&)");

        return missing;
    }
}
