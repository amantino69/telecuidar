using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace WebAPI.Data;

/// <summary>
/// Seeder para Prova de Conceito (POC) - TeleCuidar
/// Cria usuários de teste para todos os perfis, agendas e consultas
/// </summary>
public static class PocSeeder
{
    // Dados dos participantes da POC
    private static readonly Dictionary<string, (string Name, string LastName)> Participants = new()
    {
        { "aj", ("Antônio", "Jorge") },
        { "gt", ("Geraldo", "Tadeu") },
        { "do", ("Daniela", "Ochoa") },
        { "dc", ("Daniel", "Carrara") },
        { "ca", ("Cláudio", "Amantino") }
    };

    // Especialidades por médico
    private static readonly Dictionary<string, (string Name, string Description, string FieldsJson)> SpecialtiesByCode = new()
    {
        { "aj", ("Psiquiatria", "Especialidade médica dedicada ao diagnóstico, tratamento e prevenção de transtornos mentais, emocionais e comportamentais.", GetPsiquiatriaFields()) },
        { "gt", ("Dermatologia", "Especialidade médica dedicada ao diagnóstico e tratamento de doenças da pele, cabelos, unhas e mucosas.", GetDermatologiaFields()) },
        { "do", ("Pediatria", "Especialidade médica dedicada ao cuidado integral da saúde de crianças e adolescentes, desde o nascimento até os 18 anos.", GetPediatriaFields()) },
        { "dc", ("Cardiologia", "Especialidade médica dedicada ao diagnóstico e tratamento de doenças do coração e do sistema circulatório.", GetCardiologiaFields()) },
        { "ca", ("Neurologia", "Especialidade médica dedicada ao diagnóstico e tratamento de doenças do sistema nervoso central e periférico.", GetNeurologiaFields()) }
    };

    public static async Task SeedPocAsync(ApplicationDbContext context)
    {
        // Verificar se já existem usuários de POC - se existir, não refaz
        if (await context.Users.AnyAsync(u => u.Email.Contains("@telecuidar.com")))
        {
            Console.WriteLine("[POC-SEEDER] Dados de POC já existem. Pulando seed...");
            return;
        }

        Console.WriteLine("[POC-SEEDER] ========================================");
        Console.WriteLine("[POC-SEEDER] Iniciando seed de POC - TeleCuidar");
        Console.WriteLine("[POC-SEEDER] ========================================");

        var passwordHasher = new PasswordHasher();
        const string defaultPassword = "123";
        var hashedPassword = passwordHasher.HashPassword(defaultPassword);

        // Buscar o conselho CRM
        var crmCouncil = await context.ProfessionalCouncils.FirstOrDefaultAsync(c => c.Acronym == "CRM");
        if (crmCouncil == null)
        {
            Console.WriteLine("[POC-SEEDER] ERRO: Conselho CRM não encontrado. Execute o ReferenceTablesSeeder primeiro.");
            return;
        }

        // 1. Criar especialidades
        Console.WriteLine("\n[POC-SEEDER] Criando especialidades médicas...");
        var specialties = new Dictionary<string, Specialty>();
        
        foreach (var (code, specialtyData) in SpecialtiesByCode)
        {
            // Verificar se a especialidade já existe
            var existingSpecialty = await context.Specialties.FirstOrDefaultAsync(s => s.Name == specialtyData.Name);
            if (existingSpecialty != null)
            {
                specialties[code] = existingSpecialty;
                Console.WriteLine($"  - {specialtyData.Name} (já existia)");
            }
            else
            {
                var specialty = new Specialty
                {
                    Name = specialtyData.Name,
                    Description = specialtyData.Description,
                    Status = SpecialtyStatus.Active,
                    CustomFieldsJson = specialtyData.FieldsJson
                };
                context.Specialties.Add(specialty);
                await context.SaveChangesAsync();
                specialties[code] = specialty;
                Console.WriteLine($"  - {specialtyData.Name} (criada)");
            }
        }

        // 2. Criar usuários
        Console.WriteLine("\n[POC-SEEDER] Criando usuários...");
        var users = new Dictionary<string, Dictionary<string, User>>();
        var cpfCounter = 90000000000L;
        var phoneCounter = 11900000000L;

        // Médicos (PROFESSIONAL)
        var professionals = new Dictionary<string, User>();
        foreach (var (code, participant) in Participants)
        {
            var user = new User
            {
                Name = participant.Name,
                LastName = participant.LastName,
                Email = $"med_{code}@telecuidar.com",
                Cpf = (cpfCounter++).ToString("D11"),
                Phone = (phoneCounter++).ToString(),
                PasswordHash = hashedPassword,
                Role = UserRole.PROFESSIONAL,
                Status = UserStatus.Active,
                EmailVerified = true
            };
            professionals[code] = user;
            context.Users.Add(user);
            Console.WriteLine($"  - MÉDICO: med_{code}@telecuidar.com ({participant.Name} {participant.LastName})");
        }
        await context.SaveChangesAsync();

        // Criar ProfessionalProfiles com especialidades
        foreach (var (code, user) in professionals)
        {
            var profile = new ProfessionalProfile
            {
                UserId = user.Id,
                SpecialtyId = specialties[code].Id,
                CouncilId = crmCouncil.Id,
                CouncilRegistration = $"{100000 + new Random().Next(99999)}",
                CouncilState = "MG",
                Gender = code == "do" ? "F" : "M",
                BirthDate = DateTime.Now.AddYears(-35).AddDays(-new Random().Next(3650))
            };
            context.ProfessionalProfiles.Add(profile);
        }
        await context.SaveChangesAsync();

        // Assistentes (ASSISTANT)
        var assistants = new Dictionary<string, User>();
        foreach (var (code, participant) in Participants)
        {
            var user = new User
            {
                Name = participant.Name,
                LastName = participant.LastName,
                Email = $"enf_{code}@telecuidar.com",
                Cpf = (cpfCounter++).ToString("D11"),
                Phone = (phoneCounter++).ToString(),
                PasswordHash = hashedPassword,
                Role = UserRole.ASSISTANT,
                Status = UserStatus.Active,
                EmailVerified = true
            };
            assistants[code] = user;
            context.Users.Add(user);
            Console.WriteLine($"  - ASSISTENTE: enf_{code}@telecuidar.com ({participant.Name} {participant.LastName})");
        }
        await context.SaveChangesAsync();

        // Administradores (ADMIN)
        var admins = new Dictionary<string, User>();
        foreach (var (code, participant) in Participants)
        {
            var user = new User
            {
                Name = participant.Name,
                LastName = participant.LastName,
                Email = $"adm_{code}@telecuidar.com",
                Cpf = (cpfCounter++).ToString("D11"),
                Phone = (phoneCounter++).ToString(),
                PasswordHash = hashedPassword,
                Role = UserRole.ADMIN,
                Status = UserStatus.Active,
                EmailVerified = true
            };
            admins[code] = user;
            context.Users.Add(user);
            Console.WriteLine($"  - ADMIN: adm_{code}@telecuidar.com ({participant.Name} {participant.LastName})");
        }
        await context.SaveChangesAsync();

        // Pacientes (PATIENT)
        var patients = new Dictionary<string, User>();
        foreach (var (code, participant) in Participants)
        {
            var user = new User
            {
                Name = participant.Name,
                LastName = participant.LastName,
                Email = $"pac_{code}@telecuidar.com",
                Cpf = (cpfCounter++).ToString("D11"),
                Phone = (phoneCounter++).ToString(),
                PasswordHash = hashedPassword,
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                EmailVerified = true
            };
            patients[code] = user;
            context.Users.Add(user);
            Console.WriteLine($"  - PACIENTE: pac_{code}@telecuidar.com ({participant.Name} {participant.LastName})");
        }
        await context.SaveChangesAsync();

        // Criar PatientProfiles
        foreach (var (code, user) in patients)
        {
            var profile = new PatientProfile
            {
                UserId = user.Id,
                Cns = $"7{new Random().Next(10000000, 99999999)}{new Random().Next(100000, 999999)}".Substring(0, 15),
                Gender = code == "do" ? "F" : "M",
                BirthDate = DateTime.Now.AddYears(-40).AddDays(-new Random().Next(7300))
            };
            context.PatientProfiles.Add(profile);
        }
        await context.SaveChangesAsync();

        // 3. Criar agendas para os médicos
        Console.WriteLine("\n[POC-SEEDER] Criando agendas para médicos...");
        var globalConfigJson = @"{
            ""TimeRange"": {
                ""StartTime"": ""08:00"",
                ""EndTime"": ""18:00""
            },
            ""ConsultationDuration"": 30,
            ""IntervalBetweenConsultations"": 0
        }";

        var daysConfigJson = @"[
            {""Day"": ""Monday"", ""IsWorking"": true, ""Customized"": false},
            {""Day"": ""Tuesday"", ""IsWorking"": true, ""Customized"": false},
            {""Day"": ""Wednesday"", ""IsWorking"": true, ""Customized"": false},
            {""Day"": ""Thursday"", ""IsWorking"": true, ""Customized"": false},
            {""Day"": ""Friday"", ""IsWorking"": true, ""Customized"": false},
            {""Day"": ""Saturday"", ""IsWorking"": false, ""Customized"": false},
            {""Day"": ""Sunday"", ""IsWorking"": false, ""Customized"": false}
        ]";

        foreach (var (code, professional) in professionals)
        {
            var schedule = new Schedule
            {
                ProfessionalId = professional.Id,
                GlobalConfigJson = globalConfigJson,
                DaysConfigJson = daysConfigJson,
                ValidityStartDate = new DateTime(2026, 2, 1),
                ValidityEndDate = new DateTime(2026, 3, 31),
                IsActive = true
            };
            context.Schedules.Add(schedule);
            Console.WriteLine($"  - Agenda criada para Dr(a). {professional.Name} {professional.LastName}");
        }
        await context.SaveChangesAsync();

        // 4. Criar consultas
        Console.WriteLine("\n[POC-SEEDER] Criando consultas...");
        var appointmentTypes = new[] { AppointmentType.FirstVisit, AppointmentType.Return, AppointmentType.Routine, AppointmentType.Common };
        var random = new Random(42); // Seed fixo para reprodutibilidade

        // Período: Fevereiro e Março 2026
        var startDate = new DateTime(2026, 2, 2); // Primeira segunda-feira de fevereiro
        var endDate = new DateTime(2026, 3, 31);
        
        int totalAppointments = 0;

        foreach (var (professionalCode, professional) in professionals)
        {
            var specialty = specialties[professionalCode];
            var appointmentDate = startDate;
            int appointmentsForThisProfessional = 0;

            // Criar 10 consultas para cada médico (2 por paciente)
            foreach (var (patientCode, patient) in patients)
            {
                for (int i = 0; i < 2; i++)
                {
                    // Encontrar próximo dia útil
                    while (appointmentDate.DayOfWeek == DayOfWeek.Saturday || 
                           appointmentDate.DayOfWeek == DayOfWeek.Sunday)
                    {
                        appointmentDate = appointmentDate.AddDays(1);
                    }

                    if (appointmentDate > endDate)
                    {
                        appointmentDate = startDate.AddDays(random.Next(0, 40));
                        while (appointmentDate.DayOfWeek == DayOfWeek.Saturday || 
                               appointmentDate.DayOfWeek == DayOfWeek.Sunday)
                        {
                            appointmentDate = appointmentDate.AddDays(1);
                        }
                    }

                    // Horários disponíveis: 08:00, 08:30, 09:00, ..., 17:30
                    var hours = 8 + random.Next(0, 10);
                    var minutes = random.Next(0, 2) * 30;
                    var appointmentTime = new TimeSpan(hours, minutes, 0);

                    var status = GetRandomStatus(random, appointmentDate);
                    var appointmentType = appointmentTypes[random.Next(appointmentTypes.Length)];

                    var appointment = new Appointment
                    {
                        PatientId = patient.Id,
                        ProfessionalId = professional.Id,
                        SpecialtyId = specialty.Id,
                        Date = appointmentDate.Date,
                        Time = appointmentTime,
                        EndTime = appointmentTime.Add(TimeSpan.FromMinutes(30)),
                        Type = appointmentType,
                        Status = status,
                        Observation = $"Consulta de {(appointmentType == AppointmentType.FirstVisit ? "primeira vez" : "retorno")} - POC TeleCuidar"
                    };

                    context.Appointments.Add(appointment);
                    appointmentsForThisProfessional++;
                    totalAppointments++;

                    // Avançar para próximo slot (evitar conflitos)
                    if (minutes == 30)
                    {
                        appointmentDate = appointmentDate.AddDays(1);
                    }
                }
            }

            Console.WriteLine($"  - Dr(a). {professional.Name}: {appointmentsForThisProfessional} consultas criadas");
        }

        await context.SaveChangesAsync();

        // Resumo final
        Console.WriteLine("\n[POC-SEEDER] ========================================");
        Console.WriteLine("[POC-SEEDER] SEED DE POC CONCLUÍDO COM SUCESSO!");
        Console.WriteLine("[POC-SEEDER] ========================================");
        Console.WriteLine("\n[POC-SEEDER] CREDENCIAIS DE ACESSO (senha: 123 para todos):");
        Console.WriteLine("\n  MÉDICOS:");
        foreach (var (code, participant) in Participants)
        {
            Console.WriteLine($"    - med_{code}@telecuidar.com - {participant.Name} {participant.LastName} ({SpecialtiesByCode[code].Name})");
        }
        Console.WriteLine("\n  ASSISTENTES:");
        foreach (var (code, participant) in Participants)
        {
            Console.WriteLine($"    - enf_{code}@telecuidar.com - {participant.Name} {participant.LastName}");
        }
        Console.WriteLine("\n  ADMINISTRADORES:");
        foreach (var (code, participant) in Participants)
        {
            Console.WriteLine($"    - adm_{code}@telecuidar.com - {participant.Name} {participant.LastName}");
        }
        Console.WriteLine("\n  PACIENTES:");
        foreach (var (code, participant) in Participants)
        {
            Console.WriteLine($"    - pac_{code}@telecuidar.com - {participant.Name} {participant.LastName}");
        }
        Console.WriteLine($"\n[POC-SEEDER] Total de consultas criadas: {totalAppointments}");
        Console.WriteLine("[POC-SEEDER] Período das consultas: 01/02/2026 a 31/03/2026");
        Console.WriteLine("[POC-SEEDER] ========================================");
    }

    private static async Task CleanExistingPocData(ApplicationDbContext context)
    {
        // Remover consultas de usuários POC
        var pocUserIds = await context.Users
            .Where(u => u.Email.Contains("@telecuidar.com"))
            .Select(u => u.Id)
            .ToListAsync();

        var appointmentsToRemove = await context.Appointments
            .Where(a => pocUserIds.Contains(a.PatientId) || pocUserIds.Contains(a.ProfessionalId))
            .ToListAsync();
        context.Appointments.RemoveRange(appointmentsToRemove);

        var schedulesToRemove = await context.Schedules
            .Where(s => pocUserIds.Contains(s.ProfessionalId))
            .ToListAsync();
        context.Schedules.RemoveRange(schedulesToRemove);

        var patientProfilesToRemove = await context.PatientProfiles
            .Where(p => pocUserIds.Contains(p.UserId))
            .ToListAsync();
        context.PatientProfiles.RemoveRange(patientProfilesToRemove);

        var professionalProfilesToRemove = await context.ProfessionalProfiles
            .Where(p => pocUserIds.Contains(p.UserId))
            .ToListAsync();
        context.ProfessionalProfiles.RemoveRange(professionalProfilesToRemove);

        var usersToRemove = await context.Users
            .Where(u => u.Email.Contains("@telecuidar.com"))
            .ToListAsync();
        context.Users.RemoveRange(usersToRemove);

        await context.SaveChangesAsync();
        Console.WriteLine($"[POC-SEEDER] Dados existentes removidos: {usersToRemove.Count} usuários, {appointmentsToRemove.Count} consultas");
    }

    private static AppointmentStatus GetRandomStatus(Random random, DateTime appointmentDate)
    {
        var now = new DateTime(2026, 1, 21); // Data atual da POC
        
        if (appointmentDate < now)
        {
            // Consultas passadas: maioria completadas
            var val = random.Next(100);
            if (val < 70) return AppointmentStatus.Completed;
            if (val < 90) return AppointmentStatus.Cancelled;
            return AppointmentStatus.Confirmed;
        }
        else
        {
            // Consultas futuras: maioria agendadas ou confirmadas
            var val = random.Next(100);
            if (val < 50) return AppointmentStatus.Scheduled;
            if (val < 90) return AppointmentStatus.Confirmed;
            return AppointmentStatus.Cancelled;
        }
    }

    // Campos personalizados por especialidade
    private static string GetPsiquiatriaFields() => @"[
        {""name"":""Histórico de Transtornos"",""type"":""textarea"",""required"":true,""description"":""Descreva histórico de transtornos mentais"",""order"":1},
        {""name"":""Uso de Medicação Psiquiátrica"",""type"":""radio"",""required"":true,""description"":""Faz uso de medicação psiquiátrica?"",""options"":[""Sim"",""Não""],""order"":2},
        {""name"":""Medicamentos em Uso"",""type"":""textarea"",""required"":false,""description"":""Liste os medicamentos psiquiátricos em uso"",""order"":3},
        {""name"":""Ideação Suicida"",""type"":""radio"",""required"":true,""description"":""Apresenta ou apresentou ideação suicida?"",""options"":[""Sim, atualmente"",""Sim, no passado"",""Não""],""order"":4},
        {""name"":""Qualidade do Sono"",""type"":""select"",""required"":true,""description"":""Como está a qualidade do sono?"",""options"":[""Boa"",""Regular"",""Ruim"",""Insônia""],""order"":5},
        {""name"":""Nível de Ansiedade (0-10)"",""type"":""number"",""required"":false,""description"":""Avalie o nível de ansiedade de 0 a 10"",""order"":6},
        {""name"":""Histórico Familiar"",""type"":""textarea"",""required"":false,""description"":""Histórico familiar de transtornos mentais"",""order"":7}
    ]";

    private static string GetDermatologiaFields() => @"[
        {""name"":""Tipo de Pele"",""type"":""select"",""required"":true,""description"":""Tipo de pele do paciente"",""options"":[""Normal"",""Seca"",""Oleosa"",""Mista"",""Sensível""],""order"":1},
        {""name"":""Localização da Lesão"",""type"":""textarea"",""required"":false,""description"":""Descreva a localização das lesões"",""order"":2},
        {""name"":""Tempo de Evolução"",""type"":""text"",""required"":false,""description"":""Há quanto tempo apresenta as lesões?"",""order"":3},
        {""name"":""Coceira"",""type"":""radio"",""required"":true,""description"":""Apresenta coceira?"",""options"":[""Sim"",""Não""],""order"":4},
        {""name"":""Exposição Solar"",""type"":""select"",""required"":true,""description"":""Nível de exposição solar"",""options"":[""Baixa"",""Moderada"",""Alta"",""Muito Alta""],""order"":5},
        {""name"":""Uso de Protetor Solar"",""type"":""radio"",""required"":true,""description"":""Usa protetor solar regularmente?"",""options"":[""Sim"",""Não"",""Às vezes""],""order"":6},
        {""name"":""Alergias Conhecidas"",""type"":""textarea"",""required"":false,""description"":""Liste alergias conhecidas"",""order"":7}
    ]";

    private static string GetPediatriaFields() => @"[
        {""name"":""Idade da Criança"",""type"":""text"",""required"":true,""description"":""Idade (anos e meses)"",""order"":1},
        {""name"":""Peso (kg)"",""type"":""number"",""required"":true,""description"":""Peso em quilogramas"",""order"":2},
        {""name"":""Altura (cm)"",""type"":""number"",""required"":true,""description"":""Altura em centímetros"",""order"":3},
        {""name"":""Vacinas em Dia"",""type"":""radio"",""required"":true,""description"":""Cartão de vacinas está em dia?"",""options"":[""Sim"",""Não"",""Não sei""],""order"":4},
        {""name"":""Amamentação"",""type"":""select"",""required"":false,""description"":""Situação da amamentação"",""options"":[""Não se aplica"",""Exclusiva"",""Mista"",""Não amamenta""],""order"":5},
        {""name"":""Desenvolvimento Motor"",""type"":""select"",""required"":true,""description"":""Desenvolvimento motor adequado para idade?"",""options"":[""Adequado"",""Atrasado"",""Avançado""],""order"":6},
        {""name"":""Alergias Alimentares"",""type"":""textarea"",""required"":false,""description"":""Liste alergias alimentares conhecidas"",""order"":7},
        {""name"":""Frequenta Escola/Creche"",""type"":""radio"",""required"":false,""description"":""A criança frequenta escola ou creche?"",""options"":[""Sim"",""Não""],""order"":8}
    ]";

    private static string GetCardiologiaFields() => @"[
        {""name"":""Histórico de Infarto"",""type"":""checkbox"",""required"":true,""description"":""Paciente já teve infarto do miocárdio?"",""order"":1},
        {""name"":""Pressão Arterial Sistólica"",""type"":""number"",""required"":true,""description"":""Pressão arterial sistólica em mmHg"",""defaultValue"":""120"",""order"":2},
        {""name"":""Pressão Arterial Diastólica"",""type"":""number"",""required"":true,""description"":""Pressão arterial diastólica em mmHg"",""defaultValue"":""80"",""order"":3},
        {""name"":""Frequência Cardíaca"",""type"":""number"",""required"":true,""description"":""Batimentos por minuto em repouso"",""order"":4},
        {""name"":""Uso de Marca-passo"",""type"":""radio"",""required"":true,""description"":""Paciente faz uso de marca-passo?"",""options"":[""Sim"",""Não""],""order"":5},
        {""name"":""Tipo de Dor Torácica"",""type"":""select"",""required"":false,""description"":""Caso apresente dor torácica, qual o tipo?"",""options"":[""Não apresenta"",""Dor em aperto"",""Dor em queimação"",""Dor em pontada"",""Dor irradiada""],""order"":6},
        {""name"":""Medicamentos Cardiovasculares"",""type"":""textarea"",""required"":false,""description"":""Liste os medicamentos em uso para o coração"",""order"":7},
        {""name"":""Data Último ECG"",""type"":""date"",""required"":false,""description"":""Data do último eletrocardiograma realizado"",""order"":8}
    ]";

    private static string GetNeurologiaFields() => @"[
        {""name"":""Tipo de Cefaleia"",""type"":""select"",""required"":false,""description"":""Tipo de dor de cabeça"",""options"":[""Não apresenta"",""Tensional"",""Enxaqueca"",""Em salvas"",""Outros""],""order"":1},
        {""name"":""Frequência das Crises"",""type"":""text"",""required"":false,""description"":""Quantas vezes por semana/mês?"",""order"":2},
        {""name"":""Histórico de AVC"",""type"":""radio"",""required"":true,""description"":""Já teve AVC?"",""options"":[""Sim"",""Não""],""order"":3},
        {""name"":""Convulsões"",""type"":""radio"",""required"":true,""description"":""Apresenta ou apresentou convulsões?"",""options"":[""Sim"",""Não""],""order"":4},
        {""name"":""Alterações de Memória"",""type"":""select"",""required"":true,""description"":""Apresenta alterações de memória?"",""options"":[""Não"",""Leves"",""Moderadas"",""Graves""],""order"":5},
        {""name"":""Formigamento/Dormência"",""type"":""textarea"",""required"":false,""description"":""Descreva localização de formigamento ou dormência"",""order"":6},
        {""name"":""Medicamentos Neurológicos"",""type"":""textarea"",""required"":false,""description"":""Liste medicamentos neurológicos em uso"",""order"":7},
        {""name"":""Exames de Imagem Recentes"",""type"":""textarea"",""required"":false,""description"":""Ressonância, tomografia realizados recentemente?"",""order"":8}
    ]";
}
