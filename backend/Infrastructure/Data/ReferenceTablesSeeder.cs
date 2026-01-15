using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.Data;

/// <summary>
/// Seeder para tabelas de referência (Conselhos, CBO, SIGTAP)
/// </summary>
public static class ReferenceTablesSeeder
{
    /// <summary>
    /// Popula as tabelas de referência com dados iniciais
    /// </summary>
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        await SeedProfessionalCouncilsAsync(context);
        await SeedCboOccupationsAsync(context);
        await SeedSigtapProceduresAsync(context);
        await MigrateCrmToCouncilAsync(context);
    }
    
    /// <summary>
    /// Popula os Conselhos de Classe Profissional
    /// </summary>
    private static async Task SeedProfessionalCouncilsAsync(ApplicationDbContext context)
    {
        if (await context.ProfessionalCouncils.AnyAsync())
            return;
        
        var councils = new List<ProfessionalCouncil>
        {
            new() { Acronym = "CRM", Name = "Conselho Regional de Medicina", Category = "Medicina" },
            new() { Acronym = "COREN", Name = "Conselho Regional de Enfermagem", Category = "Enfermagem" },
            new() { Acronym = "CRP", Name = "Conselho Regional de Psicologia", Category = "Psicologia" },
            new() { Acronym = "CRO", Name = "Conselho Regional de Odontologia", Category = "Odontologia" },
            new() { Acronym = "CREFITO", Name = "Conselho Regional de Fisioterapia e Terapia Ocupacional", Category = "Fisioterapia" },
            new() { Acronym = "CRFA", Name = "Conselho Regional de Fonoaudiologia", Category = "Fonoaudiologia" },
            new() { Acronym = "CRN", Name = "Conselho Regional de Nutrição", Category = "Nutrição" },
            new() { Acronym = "CRESS", Name = "Conselho Regional de Serviço Social", Category = "Serviço Social" },
            new() { Acronym = "CRF", Name = "Conselho Regional de Farmácia", Category = "Farmácia" },
            new() { Acronym = "CRBM", Name = "Conselho Regional de Biomedicina", Category = "Biomedicina" },
            new() { Acronym = "CRBIO", Name = "Conselho Regional de Biologia", Category = "Biologia" },
            new() { Acronym = "CREF", Name = "Conselho Regional de Educação Física", Category = "Educação Física" },
            new() { Acronym = "CRTR", Name = "Conselho Regional de Técnicos em Radiologia", Category = "Radiologia" },
            new() { Acronym = "CRQ", Name = "Conselho Regional de Química", Category = "Química" },
            new() { Acronym = "CRMV", Name = "Conselho Regional de Medicina Veterinária", Category = "Medicina Veterinária" },
        };
        
        context.ProfessionalCouncils.AddRange(councils);
        await context.SaveChangesAsync();
        
        Console.WriteLine($"[ReferenceTablesSeeder] {councils.Count} conselhos profissionais inseridos.");
    }
    
    /// <summary>
    /// Popula ocupações CBO básicas relacionadas à saúde
    /// </summary>
    private static async Task SeedCboOccupationsAsync(ApplicationDbContext context)
    {
        if (await context.CboOccupations.AnyAsync())
            return;
        
        var occupations = new List<CboOccupation>
        {
            // Médicos
            new() { Code = "225125", Name = "Médico clínico", Family = "Médicos clínicos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225130", Name = "Médico de família e comunidade", Family = "Médicos clínicos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225103", Name = "Médico cardiologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225109", Name = "Médico dermatologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225112", Name = "Médico endocrinologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225115", Name = "Médico gastroenterologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225118", Name = "Médico geriatra", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225121", Name = "Médico ginecologista e obstetra", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225127", Name = "Médico infectologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225133", Name = "Médico nefrologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225136", Name = "Médico neurologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225139", Name = "Médico oftalmologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225142", Name = "Médico oncologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225145", Name = "Médico ortopedista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225148", Name = "Médico otorrinolaringologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225151", Name = "Médico pediatra", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225154", Name = "Médico pneumologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225155", Name = "Médico psiquiatra", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225157", Name = "Médico reumatologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "225160", Name = "Médico urologista", Family = "Médicos especialistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            
            // Enfermagem
            new() { Code = "223505", Name = "Enfermeiro", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223510", Name = "Enfermeiro auditor", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223515", Name = "Enfermeiro de bordo", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = false },
            new() { Code = "223520", Name = "Enfermeiro de centro cirúrgico", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = false },
            new() { Code = "223525", Name = "Enfermeiro de terapia intensiva", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223530", Name = "Enfermeiro do trabalho", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223535", Name = "Enfermeiro neonatologista", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223540", Name = "Enfermeiro obstétrico", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223545", Name = "Enfermeiro psiquiátrico", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223550", Name = "Enfermeiro puericultor e pediátrico", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223555", Name = "Enfermeiro sanitarista", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223560", Name = "Enfermeiro de saúde da família", Family = "Enfermeiros", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            
            // Psicologia
            new() { Code = "251510", Name = "Psicólogo clínico", Family = "Psicólogos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "251515", Name = "Psicólogo do esporte", Family = "Psicólogos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "251520", Name = "Psicólogo hospitalar", Family = "Psicólogos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "251525", Name = "Psicólogo jurídico", Family = "Psicólogos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "251530", Name = "Psicólogo do trabalho", Family = "Psicólogos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "251535", Name = "Neuropsicólogo", Family = "Psicólogos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            
            // Nutrição
            new() { Code = "223710", Name = "Nutricionista", Family = "Nutricionistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            
            // Fisioterapia e Terapia Ocupacional
            new() { Code = "223605", Name = "Fisioterapeuta geral", Family = "Fisioterapeutas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223610", Name = "Fisioterapeuta acupunturista", Family = "Fisioterapeutas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223615", Name = "Fisioterapeuta do trabalho", Family = "Fisioterapeutas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223620", Name = "Fisioterapeuta esportivo", Family = "Fisioterapeutas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223625", Name = "Fisioterapeuta neurofuncional", Family = "Fisioterapeutas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223630", Name = "Fisioterapeuta respiratório", Family = "Fisioterapeutas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223905", Name = "Terapeuta ocupacional", Family = "Terapeutas ocupacionais", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            
            // Fonoaudiologia
            new() { Code = "223810", Name = "Fonoaudiólogo", Family = "Fonoaudiólogos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            
            // Odontologia
            new() { Code = "223208", Name = "Cirurgião-dentista", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223212", Name = "Cirurgião-dentista - clínico geral", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223216", Name = "Cirurgião-dentista - endodontista", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223220", Name = "Cirurgião-dentista - epidemiologista", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223224", Name = "Cirurgião-dentista - implantodontista", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223228", Name = "Cirurgião-dentista - odontogeriatra", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223232", Name = "Cirurgião-dentista - odontopediatra", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223236", Name = "Cirurgião-dentista - ortodontista", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223240", Name = "Cirurgião-dentista - patologista bucal", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223244", Name = "Cirurgião-dentista - periodontista", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223248", Name = "Cirurgião-dentista - protesiólogo bucomaxilofacial", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223252", Name = "Cirurgião-dentista - radiologista", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            new() { Code = "223256", Name = "Cirurgião-dentista - traumatologista bucomaxilofacial", Family = "Cirurgiões-dentistas", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = false },
            
            // Farmácia
            new() { Code = "223405", Name = "Farmacêutico", Family = "Farmacêuticos", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
            
            // Serviço Social
            new() { Code = "251605", Name = "Assistente social", Family = "Assistentes sociais", Subgroup = "Profissionais da saúde", AllowsTeleconsultation = true },
        };
        
        context.CboOccupations.AddRange(occupations);
        await context.SaveChangesAsync();
        
        Console.WriteLine($"[ReferenceTablesSeeder] {occupations.Count} ocupações CBO inseridas.");
    }
    
    /// <summary>
    /// Popula procedimentos SIGTAP básicos de telemedicina
    /// </summary>
    private static async Task SeedSigtapProceduresAsync(ApplicationDbContext context)
    {
        if (await context.SigtapProcedures.AnyAsync())
            return;
        
        var procedures = new List<SigtapProcedure>
        {
            // Consultas e Atendimentos
            new() { Code = "0301010064", Name = "Consulta médica em atenção básica", Complexity = ProcedureComplexity.Basic, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 10.00m },
            new() { Code = "0301010072", Name = "Consulta médica em atenção especializada", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 10.00m },
            new() { Code = "0301010170", Name = "Consulta de profissionais de nível superior na atenção básica", Complexity = ProcedureComplexity.Basic, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 6.30m },
            new() { Code = "0301010188", Name = "Consulta de profissionais de nível superior na atenção especializada", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 6.30m },
            new() { Code = "0301050040", Name = "Atendimento de urgência com observação até 24h", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = false, Value = 35.00m },
            
            // Telemedicina específicos
            new() { Code = "0301010129", Name = "Teleconsulta na atenção primária", Complexity = ProcedureComplexity.Basic, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 10.00m },
            new() { Code = "0301010137", Name = "Teleconsulta na atenção especializada", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 10.00m },
            new() { Code = "0301010145", Name = "Telemonitoramento de pacientes crônicos", Complexity = ProcedureComplexity.Basic, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 5.00m },
            
            // Procedimentos de enfermagem
            new() { Code = "0301100012", Name = "Consulta de enfermagem", Complexity = ProcedureComplexity.Basic, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 6.30m },
            
            // Psicologia/Saúde Mental
            new() { Code = "0301080054", Name = "Atendimento individual em psicologia", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 22.42m },
            new() { Code = "0301080062", Name = "Atendimento em grupo em psicologia", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 4.67m },
            new() { Code = "0301080070", Name = "Psicoterapia individual", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 22.42m },
            
            // Nutrição
            new() { Code = "0301070059", Name = "Consulta/atendimento de nutricionista", Complexity = ProcedureComplexity.Basic, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 6.30m },
            
            // Fisioterapia
            new() { Code = "0302050019", Name = "Atendimento fisioterapêutico nas alterações motoras", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 4.67m },
            new() { Code = "0302050027", Name = "Atendimento fisioterapêutico em paciente neurofuncional", Complexity = ProcedureComplexity.Medium, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 4.67m },
            
            // Fonoaudiologia
            new() { Code = "0301070032", Name = "Consulta/atendimento de fonoaudiólogo", Complexity = ProcedureComplexity.Basic, GroupCode = "03", GroupName = "Procedimentos Clínicos", AllowsTelemedicine = true, Value = 6.30m },
        };
        
        context.SigtapProcedures.AddRange(procedures);
        await context.SaveChangesAsync();
        
        Console.WriteLine($"[ReferenceTablesSeeder] {procedures.Count} procedimentos SIGTAP inseridos.");
    }
    
    /// <summary>
    /// Migra dados do campo legado Crm para os novos campos CouncilId e CouncilRegistration
    /// </summary>
    private static async Task MigrateCrmToCouncilAsync(ApplicationDbContext context)
    {
        // Busca o conselho CRM
        var crmCouncil = await context.ProfessionalCouncils
            .FirstOrDefaultAsync(c => c.Acronym == "CRM");
        
        if (crmCouncil == null)
        {
            Console.WriteLine("[ReferenceTablesSeeder] Conselho CRM não encontrado, migracao ignorada.");
            return;
        }
        
        // Busca profissionais com Crm preenchido mas sem CouncilId
        var profilesToMigrate = await context.ProfessionalProfiles
            .Where(p => !string.IsNullOrEmpty(p.Crm) && p.CouncilId == null)
            .ToListAsync();
        
        if (profilesToMigrate.Count == 0)
        {
            Console.WriteLine("[ReferenceTablesSeeder] Nenhum perfil para migrar de CRM.");
            return;
        }
        
        foreach (var profile in profilesToMigrate)
        {
            profile.CouncilId = crmCouncil.Id;
            
            // Tenta extrair número e UF do CRM (formato "123456-SP" ou "CRM/SP 123456" ou apenas "123456")
            var crm = profile.Crm!;
            
            // Remove prefixos comuns
            crm = crm.Replace("CRM/", "").Replace("CRM-", "").Replace("CRM ", "").Trim();
            
            // Tenta extrair UF (últimos 2 caracteres após hífen ou espaço, ou se for apenas letras)
            var parts = crm.Split(new[] { '-', ' ', '/' }, StringSplitOptions.RemoveEmptyEntries);
            
            if (parts.Length >= 2)
            {
                // Tenta identificar qual parte é número e qual é UF
                foreach (var part in parts)
                {
                    if (part.Length == 2 && part.All(char.IsLetter))
                    {
                        profile.CouncilState = part.ToUpper();
                    }
                    else if (part.All(c => char.IsDigit(c) || c == '.'))
                    {
                        profile.CouncilRegistration = part.Replace(".", "");
                    }
                }
            }
            else
            {
                // Apenas número
                profile.CouncilRegistration = crm.Replace(".", "");
            }
        }
        
        await context.SaveChangesAsync();
        Console.WriteLine($"[ReferenceTablesSeeder] {profilesToMigrate.Count} perfis migrados de CRM para Council.");
    }
}
