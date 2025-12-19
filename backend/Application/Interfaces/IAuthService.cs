using Domain.Entities;

namespace Application.Interfaces;

public interface IAuthService
{
    Task<(User? User, string AccessToken, string RefreshToken)> LoginAsync(string email, string password, bool rememberMe);
    Task<User> RegisterAsync(string name, string lastName, string email, string cpf, string? phone, string password);
    Task<(string AccessToken, string RefreshToken)?> RefreshTokenAsync(string refreshToken);
    Task<bool> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(string token, string newPassword);
    Task<bool> VerifyEmailAsync(string token);
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
}
