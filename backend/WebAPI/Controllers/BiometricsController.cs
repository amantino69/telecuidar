using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Infrastructure.Data;
using WebAPI.Hubs;
using System.Text.Json;

namespace WebAPI.Controllers;

/// <summary>
/// Controller para gerenciar dados biométricos em tempo real durante teleconsultas
/// </summary>
[ApiController]
[Route("api/appointments/{appointmentId}/[controller]")]
public class BiometricsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<TeleconsultationHub> _hubContext;

    public BiometricsController(ApplicationDbContext context, IHubContext<TeleconsultationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    /// <summary>
    /// Obtém os dados biométricos atuais de uma consulta
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<BiometricsDto>> GetBiometrics(Guid appointmentId)
    {
        var appointment = await _context.Appointments.FindAsync(appointmentId);
        
        if (appointment == null)
            return NotFound(new { message = "Consulta não encontrada" });

        if (string.IsNullOrEmpty(appointment.BiometricsJson))
            return Ok(new BiometricsDto());

        var biometrics = JsonSerializer.Deserialize<BiometricsDto>(appointment.BiometricsJson);
        return Ok(biometrics);
    }

    /// <summary>
    /// Atualiza os dados biométricos de uma consulta (usado pelo paciente)
    /// </summary>
    [HttpPut]
    public async Task<ActionResult> UpdateBiometrics(Guid appointmentId, [FromBody] BiometricsDto dto)
    {
        var appointment = await _context.Appointments.FindAsync(appointmentId);
        
        if (appointment == null)
            return NotFound(new { message = "Consulta não encontrada" });

        dto.LastUpdated = DateTime.UtcNow.ToString("o");
        appointment.BiometricsJson = JsonSerializer.Serialize(dto);
        
        await _context.SaveChangesAsync();
        
        return Ok(new { message = "Biométricos atualizados com sucesso", data = dto });
    }

    /// <summary>
    /// Verifica se houve atualização desde uma determinada data (para polling eficiente)
    /// </summary>
    [HttpHead]
    public async Task<ActionResult> CheckUpdate(Guid appointmentId, [FromQuery] string? since)
    {
        var appointment = await _context.Appointments.FindAsync(appointmentId);
        
        if (appointment == null)
            return NotFound();

        if (string.IsNullOrEmpty(appointment.BiometricsJson))
            return NoContent(); // 204 - no data yet

        var biometrics = JsonSerializer.Deserialize<BiometricsDto>(appointment.BiometricsJson);
        
        if (string.IsNullOrEmpty(since) || string.IsNullOrEmpty(biometrics?.LastUpdated))
            return Ok(); // Has data

        // Compare timestamps
        if (DateTime.TryParse(since, out var sinceDate) && 
            DateTime.TryParse(biometrics.LastUpdated, out var lastUpdated))
        {
            if (lastUpdated > sinceDate)
                return Ok(); // Has updates
            else
                return NoContent(); // No updates since
        }

        return Ok();
    }
}

/// <summary>
/// Controller para receber leituras BLE de dispositivos externos (Python bridge)
/// </summary>
[ApiController]
[Route("api/biometrics")]
public class BleBridgeController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<TeleconsultationHub> _hubContext;
    private readonly ILogger<BleBridgeController> _logger;

    public BleBridgeController(
        ApplicationDbContext context, 
        IHubContext<TeleconsultationHub> hubContext,
        ILogger<BleBridgeController> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Recebe leitura de dispositivo BLE e envia via SignalR para o médico
    /// </summary>
    [HttpPost("ble-reading")]
    public async Task<ActionResult> ReceiveBleReading([FromBody] BleReadingDto dto)
    {
        _logger.LogInformation("[BLE Bridge] Leitura recebida: {Type} = {@Values}", dto.DeviceType, dto.Values);

        // Busca a consulta
        if (!Guid.TryParse(dto.AppointmentId, out var appointmentId))
            return BadRequest(new { message = "appointmentId inválido" });

        var appointment = await _context.Appointments.FindAsync(appointmentId);
        if (appointment == null)
            return NotFound(new { message = "Consulta não encontrada" });

        // Atualiza biometrics
        var biometrics = string.IsNullOrEmpty(appointment.BiometricsJson)
            ? new BiometricsDto()
            : JsonSerializer.Deserialize<BiometricsDto>(appointment.BiometricsJson) ?? new BiometricsDto();

        // Aplica valores baseado no tipo
        switch (dto.DeviceType?.ToLower())
        {
            case "scale":
                if (dto.Values.TryGetValue("weight", out var weight))
                    biometrics.Weight = Convert.ToDecimal(weight);
                break;
            case "blood_pressure":
                if (dto.Values.TryGetValue("systolic", out var sys))
                    biometrics.BloodPressureSystolic = Convert.ToInt32(sys);
                if (dto.Values.TryGetValue("diastolic", out var dia))
                    biometrics.BloodPressureDiastolic = Convert.ToInt32(dia);
                if (dto.Values.TryGetValue("heartRate", out var hr))
                    biometrics.HeartRate = Convert.ToInt32(hr);
                break;
            case "oximeter":
                if (dto.Values.TryGetValue("spo2", out var spo2))
                    biometrics.OxygenSaturation = Convert.ToInt32(spo2);
                if (dto.Values.TryGetValue("pulseRate", out var pulse))
                    biometrics.HeartRate = Convert.ToInt32(pulse);
                break;
            case "thermometer":
                if (dto.Values.TryGetValue("temperature", out var temp))
                    biometrics.Temperature = Convert.ToDecimal(temp);
                break;
        }

        biometrics.LastUpdated = DateTime.UtcNow.ToString("o");
        appointment.BiometricsJson = JsonSerializer.Serialize(biometrics);
        await _context.SaveChangesAsync();

        // Envia via SignalR para todos na sala da consulta
        await _hubContext.Clients.Group($"appointment_{appointmentId}")
            .SendAsync("BiometricsUpdated", new
            {
                appointmentId = dto.AppointmentId,
                deviceType = dto.DeviceType,
                values = dto.Values,
                biometrics,
                timestamp = biometrics.LastUpdated
            });

        _logger.LogInformation("[BLE Bridge] Dados enviados via SignalR para appointment_{Id}", appointmentId);

        return Ok(new { message = "Leitura processada", biometrics });
    }
}

public class BleReadingDto
{
    public string? AppointmentId { get; set; }
    public string? DeviceType { get; set; }
    public string? Timestamp { get; set; }
    public Dictionary<string, object> Values { get; set; } = new();
}

public class BiometricsDto
{
    public int? HeartRate { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? OxygenSaturation { get; set; }
    public decimal? Temperature { get; set; }
    public int? RespiratoryRate { get; set; }
    public int? Glucose { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }
    public string? LastUpdated { get; set; }
}
