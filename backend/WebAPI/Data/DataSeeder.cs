using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace WebAPI.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Verificar se já existem usuários
        if (await context.Users.AnyAsync())
        {
            Console.WriteLine("[SEEDER] Usuários já existem. Pulando seed.");
            return;
        }

        Console.WriteLine("[SEEDER] Iniciando seed de dados...");

        var passwordHasher = new PasswordHasher();
        var adminEmail = Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL") ?? "adm@adm.com";
        var adminPassword = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD") ?? "zxcasd12";
        var adminName = Environment.GetEnvironmentVariable("SEED_ADMIN_NAME") ?? "Admin";
        var adminLastName = Environment.GetEnvironmentVariable("SEED_ADMIN_LASTNAME") ?? "Sistema";
        var adminCpf = Environment.GetEnvironmentVariable("SEED_ADMIN_CPF") ?? "11111111111";
        const string defaultPassword = "zxcasd12";

        var users = new List<User>
        {
            new User
            {
                Name = adminName,
                LastName = adminLastName,
                Email = adminEmail,
                Cpf = adminCpf,
                Phone = "11911111111",
                PasswordHash = passwordHasher.HashPassword(adminPassword),
                Role = UserRole.ADMIN,
                Status = UserStatus.Active,
                EmailVerified = true
            },
            new User
            {
                Name = "Médico",
                LastName = "Profissional",
                Email = "med@med.com",
                Cpf = "22222222222",
                Phone = "11922222222",
                PasswordHash = passwordHasher.HashPassword(defaultPassword),
                Role = UserRole.PROFESSIONAL,
                Status = UserStatus.Active,
                EmailVerified = true
            },
            new User
            {
                Name = "Paciente",
                LastName = "Teste",
                Email = "pac@pac.com",
                Cpf = "33333333333",
                Phone = "11933333333",
                PasswordHash = passwordHasher.HashPassword(defaultPassword),
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                EmailVerified = true
            }
        };

        context.Users.AddRange(users);
        await context.SaveChangesAsync();

        Console.WriteLine("[SEEDER] Seed concluído!");
        Console.WriteLine("[SEEDER] Usuários criados:");
        Console.WriteLine($"  - {adminEmail} (ADMIN) - senha: {adminPassword}");
        Console.WriteLine("  - med@med.com (PROFESSIONAL) - senha: zxcasd12");
        Console.WriteLine("  - pac@pac.com (PATIENT) - senha: zxcasd12");
    }
}
