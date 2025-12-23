using Application.DTOs.Receitas;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.Kernel.Colors;
using iText.Kernel.Font;
using iText.IO.Font.Constants;
using iText.Signatures;
using iText.Bouncycastle.Crypto;
using iText.Bouncycastle.X509;
using iText.Commons.Bouncycastle.Cert;
using iText.IO.Image;
using Org.BouncyCastle.Pkcs;
using QRCoder;

namespace Infrastructure.Services;

public class PrescriptionService : IPrescriptionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PrescriptionService> _logger;

    public PrescriptionService(ApplicationDbContext context, ILogger<PrescriptionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PrescriptionDto?> GetPrescriptionByIdAsync(Guid id)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Professional)
                .ThenInclude(u => u.ProfessionalProfile)
            .Include(p => p.Patient)
                .ThenInclude(u => u.PatientProfile)
            .Include(p => p.Appointment)
            .FirstOrDefaultAsync(p => p.Id == id);

        return prescription != null ? MapToDto(prescription) : null;
    }

    public async Task<PrescriptionDto?> GetPrescriptionByAppointmentIdAsync(Guid appointmentId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Professional)
                .ThenInclude(u => u.ProfessionalProfile)
            .Include(p => p.Patient)
                .ThenInclude(u => u.PatientProfile)
            .Include(p => p.Appointment)
            .FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);

        return prescription != null ? MapToDto(prescription) : null;
    }

    public async Task<List<PrescriptionDto>> GetPrescriptionsByPatientIdAsync(Guid patientId)
    {
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Professional)
                .ThenInclude(u => u.ProfessionalProfile)
            .Include(p => p.Patient)
            .Include(p => p.Appointment)
            .Where(p => p.PatientId == patientId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return prescriptions.Select(MapToDto).ToList();
    }

    public async Task<List<PrescriptionDto>> GetPrescriptionsByProfessionalIdAsync(Guid professionalId)
    {
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Professional)
                .ThenInclude(u => u.ProfessionalProfile)
            .Include(p => p.Patient)
            .Include(p => p.Appointment)
            .Where(p => p.ProfessionalId == professionalId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return prescriptions.Select(MapToDto).ToList();
    }

    public async Task<PrescriptionDto> CreatePrescriptionAsync(CreatePrescriptionDto dto, Guid professionalId)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Professional)
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId);

        if (appointment == null)
            throw new InvalidOperationException("Consulta não encontrada.");

        // Check if prescription already exists for this appointment
        var existingPrescription = await _context.Prescriptions
            .FirstOrDefaultAsync(p => p.AppointmentId == dto.AppointmentId);

        if (existingPrescription != null)
            throw new InvalidOperationException("Já existe uma receita para esta consulta.");

        var prescription = new Prescription
        {
            AppointmentId = dto.AppointmentId,
            ProfessionalId = professionalId,
            PatientId = appointment.PatientId,
            ItemsJson = JsonSerializer.Serialize(dto.Items ?? new List<PrescriptionItemDto>())
        };

        _context.Prescriptions.Add(prescription);
        await _context.SaveChangesAsync();

        return await GetPrescriptionByIdAsync(prescription.Id) ?? throw new InvalidOperationException("Erro ao criar receita.");
    }

    public async Task<PrescriptionDto?> UpdatePrescriptionAsync(Guid id, UpdatePrescriptionDto dto)
    {
        var prescription = await _context.Prescriptions.FindAsync(id);
        if (prescription == null) return null;

        if (prescription.SignedAt.HasValue)
            throw new InvalidOperationException("Não é possível alterar uma receita já assinada.");

        prescription.ItemsJson = JsonSerializer.Serialize(dto.Items);
        prescription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetPrescriptionByIdAsync(id);
    }

    public async Task<PrescriptionDto?> AddItemAsync(Guid prescriptionId, AddPrescriptionItemDto dto)
    {
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription == null) return null;

        if (prescription.SignedAt.HasValue)
            throw new InvalidOperationException("Não é possível alterar uma receita já assinada.");

        var items = JsonSerializer.Deserialize<List<PrescriptionItem>>(prescription.ItemsJson) ?? new List<PrescriptionItem>();
        
        items.Add(new PrescriptionItem
        {
            Id = Guid.NewGuid().ToString(),
            Medicamento = dto.Medicamento,
            CodigoAnvisa = dto.CodigoAnvisa,
            Dosagem = dto.Dosagem,
            Frequencia = dto.Frequencia,
            Periodo = dto.Periodo,
            Posologia = dto.Posologia,
            Observacoes = dto.Observacoes
        });

        prescription.ItemsJson = JsonSerializer.Serialize(items);
        prescription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetPrescriptionByIdAsync(prescriptionId);
    }

    public async Task<PrescriptionDto?> RemoveItemAsync(Guid prescriptionId, string itemId)
    {
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription == null) return null;

        if (prescription.SignedAt.HasValue)
            throw new InvalidOperationException("Não é possível alterar uma receita já assinada.");

        var items = JsonSerializer.Deserialize<List<PrescriptionItem>>(prescription.ItemsJson) ?? new List<PrescriptionItem>();
        items.RemoveAll(i => i.Id == itemId);

        prescription.ItemsJson = JsonSerializer.Serialize(items);
        prescription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetPrescriptionByIdAsync(prescriptionId);
    }

    public async Task<PrescriptionPdfDto> GeneratePdfAsync(Guid prescriptionId)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Professional)
                .ThenInclude(u => u.ProfessionalProfile)
            .Include(p => p.Patient)
                .ThenInclude(u => u.PatientProfile)
            .Include(p => p.Appointment)
                .ThenInclude(a => a.Specialty)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);

        if (prescription == null)
            throw new InvalidOperationException("Receita não encontrada.");

        var items = JsonSerializer.Deserialize<List<PrescriptionItem>>(prescription.ItemsJson) ?? new List<PrescriptionItem>();
        
        // Generate PDF content
        var pdfBytes = GeneratePrescriptionPdf(prescription, items);
        var pdfBase64 = Convert.ToBase64String(pdfBytes);
        
        // Generate document hash
        var documentHash = GenerateDocumentHash(prescription, items);

        return new PrescriptionPdfDto
        {
            PdfBase64 = pdfBase64,
            FileName = $"receita_{prescription.Id}_{DateTime.Now:yyyyMMddHHmmss}.pdf",
            DocumentHash = documentHash,
            IsSigned = prescription.SignedAt.HasValue
        };
    }

    public async Task<PrescriptionDto?> SignPrescriptionAsync(Guid prescriptionId, SignPrescriptionDto dto)
    {
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription == null) return null;

        if (prescription.SignedAt.HasValue)
            throw new InvalidOperationException("Receita já foi assinada.");

        var items = JsonSerializer.Deserialize<List<PrescriptionItem>>(prescription.ItemsJson) ?? new List<PrescriptionItem>();
        
        prescription.DigitalSignature = dto.Signature;
        prescription.CertificateThumbprint = dto.CertificateThumbprint;
        prescription.CertificateSubject = dto.CertificateSubject;
        prescription.SignedAt = DateTime.UtcNow;
        prescription.DocumentHash = GenerateDocumentHash(prescription, items);
        prescription.UpdatedAt = DateTime.UtcNow;

        // Reload full prescription to generate signed PDF
        var fullPrescription = await _context.Prescriptions
            .Include(p => p.Professional)
                .ThenInclude(u => u.ProfessionalProfile)
            .Include(p => p.Patient)
                .ThenInclude(u => u.PatientProfile)
            .Include(p => p.Appointment)
                .ThenInclude(a => a.Specialty)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);

        if (fullPrescription != null)
        {
            var pdfBytes = GeneratePrescriptionPdf(fullPrescription, items, true);
            prescription.SignedPdfBase64 = Convert.ToBase64String(pdfBytes);
        }

        await _context.SaveChangesAsync();

        return await GetPrescriptionByIdAsync(prescriptionId);
    }

    public async Task<bool> ValidateDocumentHashAsync(string documentHash)
    {
        var prescription = await _context.Prescriptions
            .FirstOrDefaultAsync(p => p.DocumentHash == documentHash);

        return prescription != null && prescription.SignedAt.HasValue;
    }

    public async Task DeletePrescriptionAsync(Guid id)
    {
        var prescription = await _context.Prescriptions.FindAsync(id);
        if (prescription != null)
        {
            _context.Prescriptions.Remove(prescription);
            await _context.SaveChangesAsync();
        }
    }

    private PrescriptionDto MapToDto(Prescription prescription)
    {
        var items = JsonSerializer.Deserialize<List<PrescriptionItem>>(prescription.ItemsJson) ?? new List<PrescriptionItem>();
        
        return new PrescriptionDto
        {
            Id = prescription.Id,
            AppointmentId = prescription.AppointmentId,
            ProfessionalId = prescription.ProfessionalId,
            ProfessionalName = prescription.Professional != null 
                ? $"{prescription.Professional.Name} {prescription.Professional.LastName}" 
                : null,
            ProfessionalCrm = prescription.Professional?.ProfessionalProfile?.Crm,
            PatientId = prescription.PatientId,
            PatientName = prescription.Patient != null 
                ? $"{prescription.Patient.Name} {prescription.Patient.LastName}" 
                : null,
            PatientCpf = prescription.Patient?.Cpf,
            Items = items.Select(i => new PrescriptionItemDto
            {
                Id = i.Id,
                Medicamento = i.Medicamento,
                CodigoAnvisa = i.CodigoAnvisa,
                Dosagem = i.Dosagem,
                Frequencia = i.Frequencia,
                Periodo = i.Periodo,
                Posologia = i.Posologia,
                Observacoes = i.Observacoes
            }).ToList(),
            IsSigned = prescription.SignedAt.HasValue,
            CertificateSubject = prescription.CertificateSubject,
            SignedAt = prescription.SignedAt,
            DocumentHash = prescription.DocumentHash,
            CreatedAt = prescription.CreatedAt,
            UpdatedAt = prescription.UpdatedAt
        };
    }

    private string GenerateDocumentHash(Prescription prescription, List<PrescriptionItem> items)
    {
        var content = new StringBuilder();
        content.Append(prescription.Id);
        content.Append(prescription.AppointmentId);
        content.Append(prescription.ProfessionalId);
        content.Append(prescription.PatientId);
        content.Append(prescription.CreatedAt.ToString("O"));
        
        foreach (var item in items)
        {
            content.Append(item.Medicamento);
            content.Append(item.Dosagem);
            content.Append(item.Frequencia);
            content.Append(item.Periodo);
            content.Append(item.Posologia);
        }

        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(content.ToString()));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private byte[] GeneratePrescriptionPdf(Prescription prescription, List<PrescriptionItem> items, bool isSigned = false)
    {
        using var memoryStream = new MemoryStream();
        using var writer = new PdfWriter(memoryStream);
        using var pdfDoc = new PdfDocument(writer);
        using var document = new Document(pdfDoc);
        
        var professional = prescription.Professional;
        var patient = prescription.Patient;
        var professionalProfile = professional?.ProfessionalProfile;
        var patientProfile = patient?.PatientProfile;
        
        // Fonts
        var boldFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);
        var regularFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
        
        // Colors
        var primaryColor = new DeviceRgb(37, 99, 235);
        var successColor = new DeviceRgb(34, 197, 94);
        var grayColor = new DeviceRgb(100, 116, 139);
        var lightGray = new DeviceRgb(248, 250, 252);
        
        // === HEADER WITH LOGO ===
        var headerTable = new Table(2).UseAllAvailableWidth().SetMarginBottom(10);
        
        // Logo cell (left)
        var logoCell = new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER).SetVerticalAlignment(VerticalAlignment.MIDDLE);
        try
        {
            // Try to load logo from embedded resource or file
            var logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "assets", "logo.png");
            if (File.Exists(logoPath))
            {
                var logoImage = ImageDataFactory.Create(logoPath);
                var logo = new Image(logoImage).SetWidth(50).SetHeight(50);
                logoCell.Add(logo);
            }
            else
            {
                // Fallback: just show text logo
                logoCell.Add(new Paragraph("TC").SetFont(boldFont).SetFontSize(24).SetFontColor(primaryColor));
            }
        }
        catch
        {
            logoCell.Add(new Paragraph("TC").SetFont(boldFont).SetFontSize(24).SetFontColor(primaryColor));
        }
        headerTable.AddCell(logoCell);
        
        // Title and establishment info cell (right)
        var titleCell = new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER).SetTextAlignment(TextAlignment.RIGHT);
        titleCell.Add(new Paragraph("TeleCuidar").SetFont(boldFont).SetFontSize(22).SetFontColor(primaryColor).SetMarginBottom(0));
        titleCell.Add(new Paragraph("Plataforma de Telemedicina").SetFont(regularFont).SetFontSize(10).SetFontColor(grayColor).SetMarginBottom(0));
        titleCell.Add(new Paragraph("CNPJ: 00.000.000/0001-00").SetFont(regularFont).SetFontSize(8).SetFontColor(grayColor).SetMarginBottom(0));
        titleCell.Add(new Paragraph("Rua Exemplo, 123 - Centro - Cidade/UF").SetFont(regularFont).SetFontSize(8).SetFontColor(grayColor));
        headerTable.AddCell(titleCell);
        
        document.Add(headerTable);
        
        // Contact info bar
        var contactBar = new Table(3).UseAllAvailableWidth().SetMarginBottom(15);
        contactBar.SetBackgroundColor(lightGray);
        
        var phoneCell = new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER).SetPadding(8);
        phoneCell.Add(new Paragraph("Tel: (00) 0000-0000").SetFont(regularFont).SetFontSize(8).SetFontColor(grayColor).SetTextAlignment(TextAlignment.LEFT));
        contactBar.AddCell(phoneCell);
        
        var emailCell = new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER).SetPadding(8);
        emailCell.Add(new Paragraph("contato@telecuidar.com.br").SetFont(regularFont).SetFontSize(8).SetFontColor(grayColor).SetTextAlignment(TextAlignment.CENTER));
        contactBar.AddCell(emailCell);
        
        var siteCell = new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER).SetPadding(8);
        siteCell.Add(new Paragraph("www.telecuidar.com.br").SetFont(regularFont).SetFontSize(8).SetFontColor(grayColor).SetTextAlignment(TextAlignment.RIGHT));
        contactBar.AddCell(siteCell);
        
        document.Add(contactBar);
        
        // Separator
        document.Add(new Paragraph("").SetBorderBottom(new iText.Layout.Borders.SolidBorder(primaryColor, 2)).SetMarginBottom(15));
        
        // Date
        var dateText = new Paragraph($"Data de Emissao: {DateTime.Now:dd/MM/yyyy HH:mm}")
            .SetFont(regularFont)
            .SetFontSize(10)
            .SetTextAlignment(TextAlignment.RIGHT)
            .SetMarginBottom(15);
        document.Add(dateText);
        
        // Patient and Professional info table
        var infoTable = new Table(2).UseAllAvailableWidth().SetMarginBottom(20);
        
        // Patient cell
        var patientCell = new Cell()
            .SetBackgroundColor(lightGray)
            .SetPadding(10);
        patientCell.Add(new Paragraph("DADOS DO PACIENTE").SetFont(boldFont).SetFontSize(10).SetFontColor(primaryColor));
        patientCell.Add(new Paragraph($"Nome: {patient?.Name} {patient?.LastName}").SetFont(regularFont).SetFontSize(9));
        patientCell.Add(new Paragraph($"CPF: {patient?.Cpf}").SetFont(regularFont).SetFontSize(9));
        if (patientProfile != null)
        {
            patientCell.Add(new Paragraph($"CNS: {patientProfile.Cns ?? "N/I"}").SetFont(regularFont).SetFontSize(9));
            if (patientProfile.BirthDate.HasValue)
                patientCell.Add(new Paragraph($"Data Nasc.: {patientProfile.BirthDate.Value:dd/MM/yyyy}").SetFont(regularFont).SetFontSize(9));
        }
        infoTable.AddCell(patientCell);
        
        // Professional cell
        var professionalCell = new Cell()
            .SetBackgroundColor(lightGray)
            .SetPadding(10);
        professionalCell.Add(new Paragraph("DADOS DO PROFISSIONAL").SetFont(boldFont).SetFontSize(10).SetFontColor(primaryColor));
        professionalCell.Add(new Paragraph($"Nome: {professional?.Name} {professional?.LastName}").SetFont(regularFont).SetFontSize(9));
        professionalCell.Add(new Paragraph($"CRM: {professionalProfile?.Crm ?? "N/I"}").SetFont(regularFont).SetFontSize(9));
        professionalCell.Add(new Paragraph($"Email: {professional?.Email}").SetFont(regularFont).SetFontSize(9));
        professionalCell.Add(new Paragraph($"Telefone: {professional?.Phone ?? "N/I"}").SetFont(regularFont).SetFontSize(9));
        infoTable.AddCell(professionalCell);
        
        document.Add(infoTable);
        
        // Prescription title
        var prescriptionTitle = new Paragraph("RECEITUARIO MEDICO")
            .SetFont(boldFont)
            .SetFontSize(16)
            .SetFontColor(primaryColor)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginTop(10)
            .SetMarginBottom(20);
        document.Add(prescriptionTitle);
        
        // Medications
        var itemNumber = 1;
        foreach (var item in items)
        {
            var medicationTable = new Table(1).UseAllAvailableWidth().SetMarginBottom(15);
            var medicationCell = new Cell()
                .SetPadding(15)
                .SetBorder(new iText.Layout.Borders.SolidBorder(new DeviceRgb(226, 232, 240), 1));
            
            medicationCell.Add(new Paragraph($"{itemNumber}. {item.Medicamento}")
                .SetFont(boldFont)
                .SetFontSize(12)
                .SetFontColor(primaryColor));
            
            if (!string.IsNullOrEmpty(item.CodigoAnvisa))
            {
                medicationCell.Add(new Paragraph($"Codigo ANVISA: {item.CodigoAnvisa}")
                    .SetFont(regularFont)
                    .SetFontSize(8)
                    .SetFontColor(grayColor));
            }
            
            var detailsTable = new Table(2).UseAllAvailableWidth().SetMarginTop(10);
            detailsTable.AddCell(CreateDetailCell($"Dosagem: {item.Dosagem}", regularFont));
            detailsTable.AddCell(CreateDetailCell($"Frequencia: {item.Frequencia}", regularFont));
            detailsTable.AddCell(CreateDetailCell($"Periodo: {item.Periodo}", regularFont));
            detailsTable.AddCell(CreateDetailCell($"Posologia: {item.Posologia}", regularFont));
            medicationCell.Add(detailsTable);
            
            if (!string.IsNullOrEmpty(item.Observacoes))
            {
                medicationCell.Add(new Paragraph($"Obs: {item.Observacoes}")
                    .SetFont(regularFont)
                    .SetFontSize(9)
                    .SetItalic()
                    .SetMarginTop(10));
            }
            
            medicationTable.AddCell(medicationCell);
            document.Add(medicationTable);
            itemNumber++;
        }
        
        // Signature info (if signed)
        if (isSigned && prescription.SignedAt.HasValue)
        {
            var signatureTable = new Table(1).UseAllAvailableWidth().SetMarginTop(30);
            var signatureCell = new Cell()
                .SetBackgroundColor(new DeviceRgb(240, 253, 244))
                .SetBorder(new iText.Layout.Borders.SolidBorder(successColor, 1))
                .SetPadding(15);
            
            signatureCell.Add(new Paragraph("DOCUMENTO ASSINADO DIGITALMENTE")
                .SetFont(boldFont)
                .SetFontSize(11)
                .SetFontColor(new DeviceRgb(22, 163, 74)));
            signatureCell.Add(new Paragraph($"Certificado: {prescription.CertificateSubject}").SetFont(regularFont).SetFontSize(9));
            signatureCell.Add(new Paragraph($"Data da Assinatura: {prescription.SignedAt.Value:dd/MM/yyyy HH:mm:ss}").SetFont(regularFont).SetFontSize(9));
            signatureCell.Add(new Paragraph($"Hash do Documento: {prescription.DocumentHash}").SetFont(regularFont).SetFontSize(9));
            signatureCell.Add(new Paragraph("Padrao: ICP-Brasil").SetFont(regularFont).SetFontSize(9));
            
            signatureTable.AddCell(signatureCell);
            document.Add(signatureTable);
        }
        
        // === FOOTER WITH QR CODE ===
        document.Add(new Paragraph("").SetBorderTop(new iText.Layout.Borders.SolidBorder(primaryColor, 2)).SetMarginTop(30).SetMarginBottom(15));
        
        // Footer table with QR Code and validation info
        var footerTable = new Table(new float[] { 1, 3 }).UseAllAvailableWidth();
        
        // QR Code cell (left)
        var qrCell = new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER).SetPadding(10).SetVerticalAlignment(VerticalAlignment.MIDDLE);
        try
        {
            // Generate QR Code for ITI validation
            var validationUrl = "https://validar.iti.gov.br";
            using var qrGenerator = new QRCodeGenerator();
            var qrCodeData = qrGenerator.CreateQrCode(validationUrl, QRCodeGenerator.ECCLevel.M);
            using var qrCode = new PngByteQRCode(qrCodeData);
            var qrBytes = qrCode.GetGraphic(5);
            
            var qrImage = ImageDataFactory.Create(qrBytes);
            var qr = new Image(qrImage).SetWidth(80).SetHeight(80);
            qrCell.Add(qr);
            qrCell.Add(new Paragraph("Validar Assinatura").SetFont(regularFont).SetFontSize(7).SetFontColor(grayColor).SetTextAlignment(TextAlignment.CENTER));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Erro ao gerar QR Code para PDF");
            qrCell.Add(new Paragraph("QR Code").SetFont(regularFont).SetFontSize(8).SetFontColor(grayColor));
        }
        footerTable.AddCell(qrCell);
        
        // Validation info cell (right)
        var validationInfoCell = new Cell().SetBorder(iText.Layout.Borders.Border.NO_BORDER).SetPadding(10).SetVerticalAlignment(VerticalAlignment.MIDDLE);
        
        validationInfoCell.Add(new Paragraph("VALIDACAO DO DOCUMENTO")
            .SetFont(boldFont)
            .SetFontSize(10)
            .SetFontColor(primaryColor)
            .SetMarginBottom(5));
        
        var hashText = GenerateDocumentHash(prescription, items);
        validationInfoCell.Add(new Paragraph($"Hash de Validacao: {hashText}")
            .SetFont(regularFont)
            .SetFontSize(8)
            .SetFontColor(grayColor));
        
        validationInfoCell.Add(new Paragraph("Escaneie o QR Code ou acesse: https://validar.iti.gov.br")
            .SetFont(regularFont)
            .SetFontSize(8)
            .SetFontColor(grayColor));
        
        validationInfoCell.Add(new Paragraph("para validar a assinatura digital deste documento.")
            .SetFont(regularFont)
            .SetFontSize(8)
            .SetFontColor(grayColor));
        
        validationInfoCell.Add(new Paragraph($"Documento gerado em: {DateTime.Now:dd/MM/yyyy} as {DateTime.Now:HH:mm:ss}")
            .SetFont(regularFont)
            .SetFontSize(8)
            .SetFontColor(grayColor)
            .SetMarginTop(5));
        
        footerTable.AddCell(validationInfoCell);
        document.Add(footerTable);
        
        // Final disclaimer
        var disclaimer = new Paragraph("Este documento foi gerado eletronicamente pela plataforma TeleCuidar e possui validade juridica conforme legislacao vigente.")
            .SetFont(regularFont)
            .SetFontSize(7)
            .SetFontColor(grayColor)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginTop(10);
        document.Add(disclaimer);
        
        document.Close();
        return memoryStream.ToArray();
    }
    
    private Cell CreateDetailCell(string text, PdfFont font)
    {
        return new Cell()
            .Add(new Paragraph(text).SetFont(font).SetFontSize(9))
            .SetBorder(iText.Layout.Borders.Border.NO_BORDER)
            .SetPadding(2);
    }
    
    public async Task<PrescriptionPdfDto> GenerateSignedPdfAsync(Guid prescriptionId, byte[] pfxBytes, string pfxPassword)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.Professional)
                .ThenInclude(u => u.ProfessionalProfile)
            .Include(p => p.Patient)
                .ThenInclude(u => u.PatientProfile)
            .Include(p => p.Appointment)
                .ThenInclude(a => a.Specialty)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);

        if (prescription == null)
            throw new InvalidOperationException("Receita nao encontrada.");

        var items = JsonSerializer.Deserialize<List<PrescriptionItem>>(prescription.ItemsJson) ?? new List<PrescriptionItem>();
        
        // Generate unsigned PDF first
        var unsignedPdfBytes = GeneratePrescriptionPdf(prescription, items, false);
        
        // Sign the PDF with the provided certificate
        var signedPdfBytes = SignPdfWithCertificate(unsignedPdfBytes, pfxBytes, pfxPassword, prescription);
        
        var pdfBase64 = Convert.ToBase64String(signedPdfBytes);
        var documentHash = GenerateDocumentHash(prescription, items);
        
        // Extract certificate info and update prescription
        using var cert = X509CertificateLoader.LoadPkcs12(pfxBytes, pfxPassword);
        prescription.CertificateSubject = cert.Subject;
        prescription.CertificateThumbprint = cert.Thumbprint;
        prescription.DigitalSignature = Convert.ToBase64String(cert.GetCertHash());
        prescription.SignedAt = DateTime.UtcNow;
        prescription.DocumentHash = documentHash;
        prescription.SignedPdfBase64 = pdfBase64;
        prescription.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();

        return new PrescriptionPdfDto
        {
            PdfBase64 = pdfBase64,
            FileName = $"receita_assinada_{prescription.Id}_{DateTime.Now:yyyyMMddHHmmss}.pdf",
            DocumentHash = documentHash,
            IsSigned = true
        };
    }
    
    private byte[] SignPdfWithCertificate(byte[] pdfBytes, byte[] pfxBytes, string password, Prescription prescription)
    {
        using var inputStream = new MemoryStream(pdfBytes);
        using var outputStream = new MemoryStream();
        
        // Load the PKCS12 store
        var pkcs12Store = new Pkcs12StoreBuilder().Build();
        pkcs12Store.Load(new MemoryStream(pfxBytes), password.ToCharArray());
        
        // Find the alias with a private key
        string? alias = null;
        foreach (var a in pkcs12Store.Aliases)
        {
            if (pkcs12Store.IsKeyEntry(a))
            {
                alias = a;
                break;
            }
        }
        
        if (alias == null)
            throw new InvalidOperationException("Certificado nao contem chave privada.");
        
        var privateKey = pkcs12Store.GetKey(alias).Key;
        var certificateChain = pkcs12Store.GetCertificateChain(alias);
        
        var bcCertificates = certificateChain
            .Select(c => new X509CertificateBC(c.Certificate))
            .Cast<IX509Certificate>()
            .ToArray();
        
        var reader = new PdfReader(inputStream);
        var signer = new PdfSigner(reader, outputStream, new StampingProperties());
        
        // Set signature metadata (using PdfSigner methods instead of deprecated PdfSignatureAppearance)
        signer.SetReason("Receita medica assinada digitalmente");
        signer.SetLocation("TeleCuidar - Plataforma de Telemedicina");
        signer.SetContact(prescription.Professional?.Email ?? "");
        
        // Sign the document
        var pks = new PrivateKeySignature(new PrivateKeyBC(privateKey), DigestAlgorithms.SHA256);
        signer.SignDetached(pks, bcCertificates, null, null, null, 0, PdfSigner.CryptoStandard.CADES);
        
        return outputStream.ToArray();
    }
}
