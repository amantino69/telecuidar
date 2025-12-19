using Application.DTOs.Users;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebAPI.Extensions;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAuditLogService _auditLogService;

    public UsersController(IUserService userService, IAuditLogService auditLogService)
    {
        _userService = userService;
        _auditLogService = auditLogService;
    }
    
    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedUsersDto>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] string? status = null)
    {
        try
        {
            var result = await _userService.GetUsersAsync(page, pageSize, search, role, status);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(Guid id)
    {
        try
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }
            return Ok(user);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserDto dto)
    {
        try
        {
            var user = await _userService.CreateUserAsync(dto);
            
            // Audit log
            await _auditLogService.CreateAuditLogAsync(
                GetCurrentUserId(),
                "create",
                "User",
                user.Id.ToString(),
                null,
                HttpContextExtensions.SerializeToJson(new { user.Email, user.Name, user.LastName, user.Role, user.Status }),
                HttpContext.GetIpAddress(),
                HttpContext.GetUserAgent()
            );
            
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserDto>> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
    {
        try
        {
            var oldUser = await _userService.GetUserByIdAsync(id);
            if (oldUser == null)
            {
                return NotFound(new { message = "User not found" });
            }
            
            var user = await _userService.UpdateUserAsync(id, dto);
            
            // Audit log with differences
            var oldValues = oldUser != null ? HttpContextExtensions.SerializeToJson(new { oldUser.Name, oldUser.LastName, oldUser.Email, oldUser.Phone, oldUser.Role, oldUser.Status }) : null;
            var newValues = HttpContextExtensions.SerializeToJson(new { user.Name, user.LastName, user.Email, user.Phone, user.Role, user.Status });
            
            await _auditLogService.CreateAuditLogAsync(
                GetCurrentUserId(),
                "update",
                "User",
                id.ToString(),
                oldValues,
                newValues,
                HttpContext.GetIpAddress(),
                HttpContext.GetUserAgent()
            );
            
            return Ok(user);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        try
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }
            
            var result = await _userService.DeleteUserAsync(id);
            
            // Audit log
            await _auditLogService.CreateAuditLogAsync(
                GetCurrentUserId(),
                "delete",
                "User",
                id.ToString(),
                HttpContextExtensions.SerializeToJson(new { user.Email, user.Name, user.LastName, user.Role }),
                null,
                HttpContext.GetIpAddress(),
                HttpContext.GetUserAgent()
            );
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred", error = ex.Message });
        }
    }
}
