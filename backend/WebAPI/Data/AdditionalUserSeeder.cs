using Infrastructure.Data;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace WebAPI.Data;

/// <summary>
/// Seeder adicional para criar usuários de teste para desenvolvimento e demonstração.
/// </summary>
public static class AdditionalUserSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Verifica se já existem os usuários adicionais
        var existingEmails = await context.Users
            .Select(u => u.Email)
            .ToListAsync();

        var usersToAdd = new List<User>();

        // Usuário paciente de teste para IoMT
        if (!existingEmails.Contains("paciente.iomt@teste.com"))
        {
            usersToAdd.Add(new User
            {
                Id = Guid.NewGuid(),
                Name = "Paciente IoMT",
                LastName = "Teste",
                Email = "paciente.iomt@teste.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("zxcasd12"),
                Role = UserRole.PATIENT,
                Cpf = "11122233344",
                Phone = "(11) 98888-7777",
                Status = UserStatus.Active,
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Usuário médico de teste para IoMT
        if (!existingEmails.Contains("medico.iomt@teste.com"))
        {
            usersToAdd.Add(new User
            {
                Id = Guid.NewGuid(),
                Name = "Dr. IoMT",
                LastName = "Teste",
                Email = "medico.iomt@teste.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("zxcasd12"),
                Role = UserRole.PROFESSIONAL,
                Cpf = "55566677788",
                Phone = "(11) 99999-8888",
                Status = UserStatus.Active,
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (usersToAdd.Any())
        {
            await context.Users.AddRangeAsync(usersToAdd);
            await context.SaveChangesAsync();
        }
    }
}
