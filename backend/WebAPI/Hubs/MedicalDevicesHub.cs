using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Text.Json;

namespace WebAPI.Hubs;

/// <summary>
/// Hub SignalR para streaming de dados de dispositivos médicos IoMT em tempo real.
/// Permite comunicação bidirecional entre dispositivos de monitoramento e a interface web.
/// </summary>
[Authorize]
public class MedicalDevicesHub : Hub
{
    private readonly ILogger<MedicalDevicesHub> _logger;

    public MedicalDevicesHub(ILogger<MedicalDevicesHub> logger)
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
            "MedicalDevicesHub: Cliente conectado. ConnectionId={ConnectionId}, UserId={UserId}, Email={Email}",
            Context.ConnectionId, userId ?? "unknown", userEmail ?? "unknown");
        
        // Adiciona o usuário a um grupo baseado no seu ID para receber dados específicos
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
            "MedicalDevicesHub: Cliente desconectado. ConnectionId={ConnectionId}, UserId={UserId}, Exception={Exception}",
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
    public async Task JoinAppointmentRoom(string appointmentId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "MedicalDevicesHub: Usuário {UserId} entrou na sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        await Groups.AddToGroupAsync(Context.ConnectionId, $"appointment_{appointmentId}");
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("UserJoinedDeviceRoom", userId);
    }

    /// <summary>
    /// Sai de uma sala de teleconsulta
    /// </summary>
    public async Task LeaveAppointmentRoom(string appointmentId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "MedicalDevicesHub: Usuário {UserId} saiu da sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"appointment_{appointmentId}");
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("UserLeftDeviceRoom", userId);
    }

    /// <summary>
    /// Envia dados biométricos para todos na sala da teleconsulta
    /// </summary>
    public async Task SendBiometricData(string appointmentId, object biometricData)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogDebug(
            "MedicalDevicesHub: Dados biométricos recebidos de {UserId} para sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveBiometricData", new
            {
                senderId = userId,
                data = biometricData,
                timestamp = DateTime.UtcNow
            });
    }

    /// <summary>
    /// Envia frame de vídeo do dispositivo (câmera médica, dermatoscópio, etc)
    /// </summary>
    public async Task SendVideoFrame(string appointmentId, string frameData, string deviceType)
    {
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveVideoFrame", new
            {
                frameData,
                deviceType,
                timestamp = DateTime.UtcNow
            });
    }

    /// <summary>
    /// Notifica que um dispositivo foi conectado/desconectado
    /// </summary>
    public async Task NotifyDeviceStatus(string appointmentId, string deviceType, bool isConnected)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "MedicalDevicesHub: Dispositivo {DeviceType} {Status} por {UserId} na sala {AppointmentId}",
            deviceType, isConnected ? "conectado" : "desconectado", userId ?? "unknown", appointmentId);
        
        await Clients.Group($"appointment_{appointmentId}")
            .SendAsync("DeviceStatusChanged", new
            {
                deviceType,
                isConnected,
                userId,
                timestamp = DateTime.UtcNow
            });
    }

    /// <summary>
    /// Solicita que o paciente inicie o streaming de um dispositivo específico
    /// </summary>
    public async Task RequestDeviceStream(string appointmentId, string deviceType)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "MedicalDevicesHub: Médico {UserId} solicitou streaming de {DeviceType} na sala {AppointmentId}",
            userId ?? "unknown", deviceType, appointmentId);
        
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("StreamRequested", new
            {
                deviceType,
                requestedBy = userId,
                timestamp = DateTime.UtcNow
            });
    }

    // ========== Novos métodos para IoMT ==========

    /// <summary>
    /// Entra na sala de uma consulta (alias para JoinAppointmentRoom)
    /// </summary>
    public async Task JoinAppointment(string appointmentId)
    {
        await JoinAppointmentRoom(appointmentId);
    }

    /// <summary>
    /// Sai da sala de uma consulta (alias para LeaveAppointmentRoom)
    /// </summary>
    public async Task LeaveAppointment(string appointmentId)
    {
        await LeaveAppointmentRoom(appointmentId);
    }

    /// <summary>
    /// Envia sinais vitais em tempo real
    /// </summary>
    public async Task SendVitalSigns(JsonElement vitalSignsData)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRole = Context.User?.FindFirst(ClaimTypes.Role)?.Value 
                    ?? Context.User?.FindFirst("role")?.Value;
        
        // Extrai appointmentId do objeto
        string? appointmentId = null;
        if (vitalSignsData.TryGetProperty("appointmentId", out var appointmentIdProp))
        {
            appointmentId = appointmentIdProp.GetString();
        }
        
        if (string.IsNullOrEmpty(appointmentId))
        {
            _logger.LogWarning("SendVitalSigns: appointmentId não fornecido");
            return;
        }

        _logger.LogDebug(
            "MedicalDevicesHub: Sinais vitais de {UserId} ({Role}) para sala {AppointmentId}",
            userId ?? "unknown", userRole ?? "unknown", appointmentId);
        
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveVitalSigns", vitalSignsData);
    }

    /// <summary>
    /// Envia oferta WebRTC para streaming de áudio/vídeo
    /// </summary>
    public async Task SendStreamOffer(JsonElement streamOffer)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        string? appointmentId = null;
        string? streamType = null;
        
        if (streamOffer.TryGetProperty("appointmentId", out var appointmentIdProp))
        {
            appointmentId = appointmentIdProp.GetString();
        }
        if (streamOffer.TryGetProperty("streamType", out var streamTypeProp))
        {
            streamType = streamTypeProp.GetString();
        }
        
        if (string.IsNullOrEmpty(appointmentId))
        {
            _logger.LogWarning("SendStreamOffer: appointmentId não fornecido");
            return;
        }

        _logger.LogInformation(
            "MedicalDevicesHub: Oferta de stream {StreamType} de {UserId} para sala {AppointmentId}",
            streamType ?? "unknown", userId ?? "unknown", appointmentId);
        
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveStreamOffer", streamOffer);
    }

    /// <summary>
    /// Envia resposta WebRTC
    /// </summary>
    public async Task SendStreamAnswer(JsonElement streamAnswer)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        string? appointmentId = null;
        if (streamAnswer.TryGetProperty("appointmentId", out var appointmentIdProp))
        {
            appointmentId = appointmentIdProp.GetString();
        }
        
        if (string.IsNullOrEmpty(appointmentId))
        {
            _logger.LogWarning("SendStreamAnswer: appointmentId não fornecido");
            return;
        }

        _logger.LogDebug(
            "MedicalDevicesHub: Resposta de stream de {UserId} para sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveStreamAnswer", streamAnswer);
    }

    /// <summary>
    /// Envia candidato ICE para negociação WebRTC
    /// </summary>
    public async Task SendIceCandidate(JsonElement iceCandidate)
    {
        string? appointmentId = null;
        if (iceCandidate.TryGetProperty("appointmentId", out var appointmentIdProp))
        {
            appointmentId = appointmentIdProp.GetString();
        }
        
        if (string.IsNullOrEmpty(appointmentId))
        {
            return;
        }

        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("ReceiveIceCandidate", iceCandidate);
    }

    /// <summary>
    /// Notifica que o stream foi encerrado
    /// </summary>
    public async Task EndStream(string appointmentId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "MedicalDevicesHub: Stream encerrado por {UserId} na sala {AppointmentId}",
            userId ?? "unknown", appointmentId);
        
        await Clients.OthersInGroup($"appointment_{appointmentId}")
            .SendAsync("StreamEnded", new
            {
                endedBy = userId,
                timestamp = DateTime.UtcNow
            });
    }
}
