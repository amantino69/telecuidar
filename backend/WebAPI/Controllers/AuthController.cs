using Application.DTOs.Auth;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Extensions;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAuditLogService _auditLogService;

    public AuthController(IAuthService authService, IAuditLogService auditLogService)
    {
        _authService = authService;
        _auditLogService = auditLogService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponseDto>> Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            if (request.Password != request.ConfirmPassword)
            {
                return BadRequest(new { message = "Passwords do not match" });
            }

            if (!request.AcceptTerms)
            {
                return BadRequest(new { message = "You must accept terms and conditions" });
            }

            var user = await _authService.RegisterAsync(
                request.Name,
                request.LastName,
                request.Email,
                request.Cpf,
                request.Phone,
                request.Password
            );

            var response = new RegisterResponseDto
            {
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    LastName = user.LastName,
                    Cpf = user.Cpf,
                    Phone = user.Phone,
                    Avatar = user.Avatar,
                    Role = user.Role.ToString(),
                    EmailVerified = user.EmailVerified,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt
                },
                Message = "User registered successfully. Please verify your email."
            };

            // Audit log
            await _auditLogService.CreateAuditLogAsync(
                user.Id,
                "create",
                "User",
                user.Id.ToString(),
                null,
                HttpContextExtensions.SerializeToJson(new { user.Email, user.Name, user.LastName, user.Role }),
                HttpContext.GetIpAddress(),
                HttpContext.GetUserAgent()
            );

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred during registration", error = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            var (user, accessToken, refreshToken) = await _authService.LoginAsync(
                request.Email,
                request.Password,
                request.RememberMe
            );

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            var response = new LoginResponseDto
            {
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    LastName = user.LastName,
                    Cpf = user.Cpf,
                    Phone = user.Phone,
                    Avatar = user.Avatar,
                    Role = user.Role.ToString(),
                    EmailVerified = user.EmailVerified,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt
                },
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };

            // Audit log
            await _auditLogService.CreateAuditLogAsync(
                user.Id,
                "login",
                "User",
                user.Id.ToString(),
                null,
                HttpContextExtensions.SerializeToJson(new { user.Email, LoginTime = DateTime.UtcNow }),
                HttpContext.GetIpAddress(),
                HttpContext.GetUserAgent()
            );

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred during login", error = ex.Message });
        }
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<LoginResponseDto>> RefreshToken([FromBody] RefreshTokenRequestDto request)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(request.RefreshToken);

            if (result == null)
            {
                return Unauthorized(new { message = "Invalid or expired refresh token" });
            }

            return Ok(new
            {
                accessToken = result.Value.AccessToken,
                refreshToken = result.Value.RefreshToken
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
    {
        try
        {
            await _authService.ForgotPasswordAsync(request.Email);
            return Ok(new { message = "If the email exists, a password reset link has been sent" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
    {
        try
        {
            if (request.Password != request.ConfirmPassword)
            {
                return BadRequest(new { message = "Passwords do not match" });
            }

            var result = await _authService.ResetPasswordAsync(request.Token, request.Password);

            if (!result)
            {
                return BadRequest(new { message = "Invalid or expired token" });
            }

            return Ok(new { message = "Password reset successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        try
        {
            var result = await _authService.VerifyEmailAsync(token);

            if (!result)
            {
                return BadRequest(new { message = "Invalid or expired token" });
            }

            return Ok(new { message = "Email verified successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }
}
