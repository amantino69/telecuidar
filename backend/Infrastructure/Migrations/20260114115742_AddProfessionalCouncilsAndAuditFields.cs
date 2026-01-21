using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalCouncilsAndAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CboOccupationId",
                table: "ProfessionalProfiles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CouncilId",
                table: "ProfessionalProfiles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CouncilRegistration",
                table: "ProfessionalProfiles",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CouncilState",
                table: "ProfessionalProfiles",
                type: "TEXT",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccessReason",
                table: "AuditLogs",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DataCategory",
                table: "AuditLogs",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PatientCpf",
                table: "AuditLogs",
                type: "TEXT",
                maxLength: 14,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PatientId",
                table: "AuditLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CboOccupations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Family = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Subgroup = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    AllowsTeleconsultation = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CboOccupations", x => x.Id);
                });

            // ExamRequests e MedicalReports já existem de migrations anteriores
            // Criação condicional apenas se não existirem
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ExamRequests"" (
                    ""Id"" TEXT NOT NULL CONSTRAINT ""PK_ExamRequests"" PRIMARY KEY,
                    ""AppointmentId"" TEXT NOT NULL,
                    ""ProfessionalId"" TEXT NOT NULL,
                    ""PatientId"" TEXT NOT NULL,
                    ""NomeExame"" TEXT NOT NULL,
                    ""CodigoExame"" TEXT NULL,
                    ""Categoria"" INTEGER NOT NULL,
                    ""Prioridade"" INTEGER NOT NULL,
                    ""DataEmissao"" TEXT NOT NULL,
                    ""DataLimite"" TEXT NULL,
                    ""IndicacaoClinica"" TEXT NOT NULL,
                    ""HipoteseDiagnostica"" TEXT NULL,
                    ""Cid"" TEXT NULL,
                    ""Observacoes"" TEXT NULL,
                    ""InstrucoesPreparo"" TEXT NULL,
                    ""DigitalSignature"" TEXT NULL,
                    ""CertificateThumbprint"" TEXT NULL,
                    ""CertificateSubject"" TEXT NULL,
                    ""SignedAt"" TEXT NULL,
                    ""DocumentHash"" TEXT NULL,
                    ""SignedPdfBase64"" TEXT NULL,
                    ""CreatedAt"" TEXT NOT NULL,
                    ""UpdatedAt"" TEXT NOT NULL,
                    CONSTRAINT ""FK_ExamRequests_Appointments_AppointmentId"" FOREIGN KEY (""AppointmentId"") REFERENCES ""Appointments"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_ExamRequests_Users_PatientId"" FOREIGN KEY (""PatientId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT,
                    CONSTRAINT ""FK_ExamRequests_Users_ProfessionalId"" FOREIGN KEY (""ProfessionalId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                );
            ");
            
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""MedicalReports"" (
                    ""Id"" TEXT NOT NULL CONSTRAINT ""PK_MedicalReports"" PRIMARY KEY,
                    ""AppointmentId"" TEXT NOT NULL,
                    ""ProfessionalId"" TEXT NOT NULL,
                    ""PatientId"" TEXT NOT NULL,
                    ""Tipo"" INTEGER NOT NULL,
                    ""Titulo"" TEXT NOT NULL,
                    ""DataEmissao"" TEXT NOT NULL,
                    ""HistoricoClinico"" TEXT NULL,
                    ""ExameFisico"" TEXT NULL,
                    ""ExamesComplementares"" TEXT NULL,
                    ""HipoteseDiagnostica"" TEXT NULL,
                    ""Cid"" TEXT NULL,
                    ""Conclusao"" TEXT NOT NULL,
                    ""Recomendacoes"" TEXT NULL,
                    ""Observacoes"" TEXT NULL,
                    ""DigitalSignature"" TEXT NULL,
                    ""CertificateThumbprint"" TEXT NULL,
                    ""CertificateSubject"" TEXT NULL,
                    ""SignedAt"" TEXT NULL,
                    ""DocumentHash"" TEXT NULL,
                    ""SignedPdfBase64"" TEXT NULL,
                    ""CreatedAt"" TEXT NOT NULL,
                    ""UpdatedAt"" TEXT NOT NULL,
                    CONSTRAINT ""FK_MedicalReports_Appointments_AppointmentId"" FOREIGN KEY (""AppointmentId"") REFERENCES ""Appointments"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_MedicalReports_Users_PatientId"" FOREIGN KEY (""PatientId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT,
                    CONSTRAINT ""FK_MedicalReports_Users_ProfessionalId"" FOREIGN KEY (""ProfessionalId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                );
            ");

            migrationBuilder.CreateTable(
                name: "ProfessionalCouncils",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Acronym = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfessionalCouncils", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SigtapProcedures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Complexity = table.Column<int>(type: "INTEGER", nullable: false),
                    GroupCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    GroupName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    SubgroupCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    SubgroupName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    AuthorizedCbosJson = table.Column<string>(type: "TEXT", nullable: true),
                    Value = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    AllowsTelemedicine = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    StartCompetency = table.Column<string>(type: "TEXT", maxLength: 6, nullable: true),
                    EndCompetency = table.Column<string>(type: "TEXT", maxLength: 6, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SigtapProcedures", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalProfiles_CboOccupationId",
                table: "ProfessionalProfiles",
                column: "CboOccupationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalProfiles_CouncilId",
                table: "ProfessionalProfiles",
                column: "CouncilId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalProfiles_CouncilRegistration",
                table: "ProfessionalProfiles",
                column: "CouncilRegistration");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Action",
                table: "AuditLogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_PatientCpf",
                table: "AuditLogs",
                column: "PatientCpf");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_PatientId",
                table: "AuditLogs",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_CboOccupations_Code",
                table: "CboOccupations",
                column: "Code",
                unique: true);

            // Índices para ExamRequests e MedicalReports - criar apenas se não existirem
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_ExamRequests_AppointmentId"" ON ""ExamRequests"" (""AppointmentId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_ExamRequests_DocumentHash"" ON ""ExamRequests"" (""DocumentHash"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_ExamRequests_PatientId"" ON ""ExamRequests"" (""PatientId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_ExamRequests_ProfessionalId"" ON ""ExamRequests"" (""ProfessionalId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MedicalReports_AppointmentId"" ON ""MedicalReports"" (""AppointmentId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MedicalReports_DocumentHash"" ON ""MedicalReports"" (""DocumentHash"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MedicalReports_PatientId"" ON ""MedicalReports"" (""PatientId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_MedicalReports_ProfessionalId"" ON ""MedicalReports"" (""ProfessionalId"");");

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalCouncils_Acronym",
                table: "ProfessionalCouncils",
                column: "Acronym",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SigtapProcedures_Code",
                table: "SigtapProcedures",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AuditLogs_Users_PatientId",
                table: "AuditLogs",
                column: "PatientId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ProfessionalProfiles_CboOccupations_CboOccupationId",
                table: "ProfessionalProfiles",
                column: "CboOccupationId",
                principalTable: "CboOccupations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ProfessionalProfiles_ProfessionalCouncils_CouncilId",
                table: "ProfessionalProfiles",
                column: "CouncilId",
                principalTable: "ProfessionalCouncils",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AuditLogs_Users_PatientId",
                table: "AuditLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_ProfessionalProfiles_CboOccupations_CboOccupationId",
                table: "ProfessionalProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_ProfessionalProfiles_ProfessionalCouncils_CouncilId",
                table: "ProfessionalProfiles");

            migrationBuilder.DropTable(
                name: "CboOccupations");

            migrationBuilder.DropTable(
                name: "ExamRequests");

            migrationBuilder.DropTable(
                name: "MedicalReports");

            migrationBuilder.DropTable(
                name: "ProfessionalCouncils");

            migrationBuilder.DropTable(
                name: "SigtapProcedures");

            migrationBuilder.DropIndex(
                name: "IX_ProfessionalProfiles_CboOccupationId",
                table: "ProfessionalProfiles");

            migrationBuilder.DropIndex(
                name: "IX_ProfessionalProfiles_CouncilId",
                table: "ProfessionalProfiles");

            migrationBuilder.DropIndex(
                name: "IX_ProfessionalProfiles_CouncilRegistration",
                table: "ProfessionalProfiles");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_Action",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_PatientCpf",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_PatientId",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "CboOccupationId",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "CouncilId",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "CouncilRegistration",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "CouncilState",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "AccessReason",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "DataCategory",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "PatientCpf",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "PatientId",
                table: "AuditLogs");
        }
    }
}
