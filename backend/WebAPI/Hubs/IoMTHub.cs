using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Text.Json;

namespace WebAPI.Hubs;

/// <summary>
/// Hub SignalR para Internet of Medical Things (IoMT).
/// Gerencia streaming de dados de dispositivos médicos IoMT em tempo real.
/// Inclui: Fonocardiograma (ausculta), Câmera de exames (otoscópio, dermatoscópio, etc.)
/// </summary>
[Authorize]
public class IoMTHub : Hub
{
    private readonly ILogger<IoMTHub> _logger;
    
    // Estatísticas em memória para debug
    private static int _totalPacketsReceived = 0;
    private static int _totalPacketsSent = 0;

    public IoMTHub(ILogger<IoMTHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                  ?? Context.User?.FindFirst("sub")?.Value;
        var userEmail = Context.User?.FindFirst(ClaimTypes.Email)?.Value
                     ?? Context.User?.FindFirst("email")?.Value;
        
        _logger.LogInformation(
            "IoMTHub: Cliente conectado. ConnectionId={ConnectionId}, UserId={UserId}, Email={Email}",
            Context.ConnectionId, userId ?? "unknown", userEmail ?? "unknown");
        
        // Adiciona o usuário a um grupo baseado no seu ID
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                  ?? Context.User?.FindFirst("sub")?.Value;
        
        _logger.LogInformation(
            "IoMTHub: Cliente desconectado. ConnectionId={ConnectionId}, UserId={UserId}, Exception={Exception}",
            Context.ConnectionId, userId ?? "unknown", exception?.Message ?? "none");
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Entra em uma sala de teleconsulta para receber dados de dispositivos
    /// </summary>
    public async Task JoinAppointment(string appointmentId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "IoMTHub: Usuário {UserId} entrou na sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        await Groups.AddToGroupAsync(Context.ConnectionId, $"appointment_{appointmentId}");
        
        // Notifica outros na sala
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("UserJoinedIoMT", new
            {
                userId,
                timestamp = DateTime.UtcNow
            });
    }

    /// <summary>
    /// Sai de uma sala de teleconsulta
    /// </summary>
    public async Task LeaveAppointment(string appointmentId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "IoMTHub: Usuário {UserId} saiu da sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"appointment_{appointmentId}");
        
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("UserLeftIoMT", new
            {
                userId,
                timestamp = DateTime.UtcNow
            });
    }

    // ========== AUSCULTA - STREAMING EM TEMPO REAL ==========

    /// <summary>
    /// Recebe e retransmite dados de ausculta em tempo real (a cada 2-3 segundos)
    /// O paciente envia, o médico recebe
    /// </summary>
    public async Task SendAuscultationStream(JsonElement data)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var startTime = DateTime.UtcNow;
        
        string? appointmentId = null;
        int packetNumber = 0;
        
        if (data.TryGetProperty("appointmentId", out var appointmentIdProp))
            appointmentId = appointmentIdProp.GetString();
        if (data.TryGetProperty("packetNumber", out var packetNumberProp))
            packetNumber = packetNumberProp.GetInt32();
            
        if (string.IsNullOrEmpty(appointmentId))
        {
            _logger.LogWarning("SendAuscultationStream: appointmentId não fornecido");
            return;
        }

        _totalPacketsReceived++;
        
        _logger.LogDebug(
            "IoMTHub: Ausculta pacote #{PacketNumber} de {UserId} para sala {AppointmentId}",
            packetNumber, userId ?? "unknown", appointmentId);
        
        // Adiciona informações do remetente e timestamp do servidor
        var enrichedData = new
        {
            senderId = userId,
            phonogramImage = data.TryGetProperty("phonogramImage", out var img) ? img.GetString() : null,
            fftData = data.TryGetProperty("fftData", out var fft) ? fft : (object?)null,
            frequency = data.TryGetProperty("frequency", out var freq) ? freq.GetDouble() : 0,
            estimatedBPM = data.TryGetProperty("estimatedBPM", out var bpm) ? bpm.GetDouble() : 0,
            duration = data.TryGetProperty("duration", out var dur) ? dur.GetInt32() : 0,
            packetNumber,
            timestamp = data.TryGetProperty("timestamp", out var ts) ? ts.GetString() : DateTime.UtcNow.ToString("O"),
            serverTimestamp = DateTime.UtcNow
        };

        // Envia para todos os outros na sala (médico)
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveAuscultationStream", enrichedData);
            
        _totalPacketsSent++;

        // Envia confirmação de volta ao remetente
        var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
        await Clients.Caller.SendAsync("PacketAcknowledged", new
        {
            type = "auscultation",
            packetNumber,
            latencyMs = processingTime,
            serverTimestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Recebe a gravação final completa da ausculta
    /// </summary>
    public async Task SendAuscultationFinal(JsonElement data)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        string? appointmentId = null;
        if (data.TryGetProperty("appointmentId", out var appointmentIdProp))
            appointmentId = appointmentIdProp.GetString();
            
        if (string.IsNullOrEmpty(appointmentId))
        {
            _logger.LogWarning("SendAuscultationFinal: appointmentId não fornecido");
            return;
        }

        _logger.LogInformation(
            "IoMTHub: Gravação final de ausculta de {UserId} para sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        var finalData = new
        {
            senderId = userId,
            phonogramImage = data.TryGetProperty("phonogramImage", out var img) ? img.GetString() : null,
            duration = data.TryGetProperty("duration", out var dur) ? dur.GetInt32() : 0,
            estimatedBPM = data.TryGetProperty("estimatedBPM", out var bpm) ? bpm.GetDouble() : 0,
            totalPackets = data.TryGetProperty("totalPackets", out var tp) ? tp.GetInt32() : 0,
            timestamp = DateTime.UtcNow
        };

        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveAuscultationFinal", finalData);
    }

    // ========== CÂMERA DE EXAMES - STREAMING EM TEMPO REAL ==========

    /// <summary>
    /// Recebe e retransmite frames da câmera de exames em tempo real
    /// </summary>
    public async Task SendExamCameraStream(JsonElement data)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var startTime = DateTime.UtcNow;
        
        string? appointmentId = null;
        int frameNumber = 0;
        
        if (data.TryGetProperty("appointmentId", out var appointmentIdProp))
            appointmentId = appointmentIdProp.GetString();
        if (data.TryGetProperty("frameNumber", out var frameNumberProp))
            frameNumber = frameNumberProp.GetInt32();
            
        if (string.IsNullOrEmpty(appointmentId))
        {
            _logger.LogWarning("SendExamCameraStream: appointmentId não fornecido");
            return;
        }

        _totalPacketsReceived++;
        
        _logger.LogDebug(
            "IoMTHub: Câmera frame #{FrameNumber} de {UserId} para sala {AppointmentId}",
            frameNumber, userId ?? "unknown", appointmentId);
        
        var enrichedData = new
        {
            senderId = userId,
            imageData = data.TryGetProperty("imageData", out var img) ? img.GetString() : null,
            frameNumber,
            deviceType = data.TryGetProperty("deviceType", out var dt) ? dt.GetString() : null,
            timestamp = data.TryGetProperty("timestamp", out var ts) ? ts.GetString() : DateTime.UtcNow.ToString("O"),
            serverTimestamp = DateTime.UtcNow
        };

        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveExamCameraStream", enrichedData);
            
        _totalPacketsSent++;

        // Envia confirmação
        var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
        await Clients.Caller.SendAsync("PacketAcknowledged", new
        {
            type = "examCamera",
            packetNumber = frameNumber,
            latencyMs = processingTime,
            serverTimestamp = DateTime.UtcNow
        });
    }

    // ========== UTILITÁRIOS ==========

    /// <summary>
    /// Obtém estatísticas de uso (para debug)
    /// </summary>
    public Task<object> GetStats()
    {
        return Task.FromResult<object>(new
        {
            totalPacketsReceived = _totalPacketsReceived,
            totalPacketsSent = _totalPacketsSent,
            serverTime = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Ping para testar latência
    /// </summary>
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong", new
        {
            serverTimestamp = DateTime.UtcNow
        });
    }
}
