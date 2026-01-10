import { Injectable, Inject, PLATFORM_ID, NgZone, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';
import { BluetoothDevicesService, VitalReading } from './bluetooth-devices.service';
import { MedicalStreamingService, StreamSession } from './medical-streaming.service';

// Interfaces
export interface VitalSignsData {
  appointmentId: string;
  senderRole: string;
  timestamp: Date;
  vitals: {
    spo2?: number;
    pulseRate?: number;
    temperature?: number;
    weight?: number;
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
  };
}

export interface StreamOffer {
  appointmentId: string;
  streamType: 'auscultation' | 'video';
  offer: RTCSessionDescriptionInit;
  area?: string; // 'cardiac', 'pulmonary', 'abdominal' para ausculta
}

export interface StreamAnswer {
  appointmentId: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidate {
  appointmentId: string;
  candidate: RTCIceCandidateInit;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalDevicesSyncService implements OnDestroy {
  private isBrowser: boolean;
  private hubConnection: any = null;
  private connectionPromise: Promise<void> | null = null;
  private currentAppointmentId: string | null = null;
  private subscriptions = new Subscription();

  // WebRTC
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentStreamType: 'auscultation' | 'video' | null = null;
  private currentStreamArea: string | null = null;

  // Estado
  private _isConnected$ = new BehaviorSubject<boolean>(false);
  public isConnected$ = this._isConnected$.asObservable();

  private _vitalSignsReceived$ = new Subject<VitalSignsData>();
  public vitalSignsReceived$ = this._vitalSignsReceived$.asObservable();

  private _remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
  public remoteStream$ = this._remoteStream$.asObservable();

  private _streamType$ = new BehaviorSubject<'auscultation' | 'video' | null>(null);
  public streamType$ = this._streamType$.asObservable();

  private _streamArea$ = new BehaviorSubject<string | null>(null);
  public streamArea$ = this._streamArea$.asObservable();

  private _connectionError$ = new Subject<string>();
  public connectionError$ = this._connectionError$.asObservable();

  // Estado do modo ditado do profissional
  private _dictationModeActive$ = new BehaviorSubject<boolean>(false);
  public dictationModeActive$ = this._dictationModeActive$.asObservable();

  // Solicitações do médico ao paciente
  private _vitalsUpdateRequested$ = new Subject<void>();
  public vitalsUpdateRequested$ = this._vitalsUpdateRequested$.asObservable();

  private _streamRequested$ = new Subject<{ deviceType: 'auscultation' | 'video'; requestedBy: string }>();
  public streamRequested$ = this._streamRequested$.asObservable();

  // ICE Servers para WebRTC
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private authService: AuthService,
    private bluetoothService: BluetoothDevicesService,
    private streamingService: MedicalStreamingService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Conecta ao hub de dispositivos médicos
   */
  async connect(appointmentId: string): Promise<void> {
    if (!this.isBrowser) {
      console.log('[MedicalDevicesSync] Não é browser, ignorando conexão');
      return;
    }

    // Evita múltiplas conexões
    if (this.connectionPromise && this.currentAppointmentId === appointmentId) {
      console.log('[MedicalDevicesSync] Conexão já existe para appointment:', appointmentId);
      return this.connectionPromise;
    }

    // Se já está conectado ao mesmo appointment, não reconecta
    if (this.hubConnection && this._isConnected$.value && this.currentAppointmentId === appointmentId) {
      console.log('[MedicalDevicesSync] Já conectado ao appointment:', appointmentId);
      return;
    }

    console.log('[MedicalDevicesSync] Iniciando nova conexão para appointment:', appointmentId);
    this.currentAppointmentId = appointmentId;

    this.connectionPromise = this.doConnect(appointmentId).catch(err => {
      console.error('[MedicalDevicesSync] Erro na conexão:', err);
      this._connectionError$.next(err.message || 'Erro de conexão');
    });
    return this.connectionPromise;
  }

  private async doConnect(appointmentId: string): Promise<void> {
    try {
      // Importa SignalR dinamicamente
      const signalR = await import('@microsoft/signalr');

      // Constrói URL do hub baseado no host atual
      // Em desenvolvimento, o backend roda na porta 5239
      const getHubUrl = () => {
        if (typeof window !== 'undefined') {
          const host = window.location.hostname;
          // Se acessando via IP ou não-localhost, usar o mesmo host para API
          if (host !== 'localhost' && host !== '127.0.0.1') {
            return `http://${host}:5239/hubs/medical-devices`;
          }
          return 'http://localhost:5239/hubs/medical-devices';
        }
        return '/hubs/medical-devices';
      };
      
      const hubUrl = getHubUrl();
      console.log('[MedicalDevicesSync] Conectando ao hub:', hubUrl);

      const token = this.authService.getAccessToken();
      console.log('[MedicalDevicesSync] Token presente:', !!token);

      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => this.authService.getAccessToken() || ''
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Registra handlers antes de conectar
      this.registerHubHandlers();

      await this.hubConnection.start();
      console.log('[MedicalDevicesSync] Conectado com sucesso!');

      // Entra na sala da consulta
      await this.hubConnection.invoke('JoinAppointment', appointmentId);
      console.log('[MedicalDevicesSync] Entrou na consulta:', appointmentId);

      this._isConnected$.next(true);

      // Configura listeners para dispositivos Bluetooth
      this.setupBluetoothForwarding();

    } catch (error: any) {
      console.error('[MedicalDevicesSync] Erro ao conectar:', error);
      this._connectionError$.next(error.message);
      this._isConnected$.next(false);
      throw error;
    }
  }

  /**
   * Registra handlers do SignalR
   */
  private registerHubHandlers(): void {
    if (!this.hubConnection) return;

    // Recebe sinais vitais
    this.hubConnection.on('ReceiveVitalSigns', (data: VitalSignsData) => {
      this.ngZone.run(() => {
        console.log('[MedicalDevicesSync] Recebeu sinais vitais:', data);
        this._vitalSignsReceived$.next(data);
      });
    });

    // Quando outro usuário entra na sala, reenvia a oferta se estiver transmitindo
    this.hubConnection.on('UserJoinedDeviceRoom', (userId: string) => {
      this.ngZone.run(async () => {
        console.log('[MedicalDevicesSync] Usuário entrou na sala:', userId);
        console.log('[MedicalDevicesSync] Estado atual:', {
          hasLocalStream: !!this.localStream,
          currentStreamType: this.currentStreamType,
          hasPeerConnection: !!this.peerConnection
        });
        // Se estamos transmitindo (temos stream local e tipo de stream), reenviamos a oferta
        if (this.localStream && this.currentStreamType) {
          console.log('[MedicalDevicesSync] Reenviando oferta para novo usuário');
          await this.resendStreamOffer();
        }
      });
    });

    // Recebe oferta WebRTC (médico recebe do paciente)
    this.hubConnection.on('ReceiveStreamOffer', async (offer: StreamOffer) => {
      this.ngZone.run(async () => {
        console.log('[MedicalDevicesSync] Recebeu oferta de stream:', offer.streamType);
        this._streamType$.next(offer.streamType);
        this._streamArea$.next(offer.area || null);
        await this.handleStreamOffer(offer);
      });
    });

    // Recebe resposta WebRTC (paciente recebe do médico)
    this.hubConnection.on('ReceiveStreamAnswer', async (answer: StreamAnswer) => {
      this.ngZone.run(async () => {
        console.log('[MedicalDevicesSync] Recebeu resposta de stream');
        await this.handleStreamAnswer(answer);
      });
    });

    // Recebe ICE candidate
    this.hubConnection.on('ReceiveIceCandidate', async (data: IceCandidate) => {
      this.ngZone.run(async () => {
        if (this.peerConnection && data.candidate) {
          try {
            await this.peerConnection.addIceCandidate(data.candidate);
          } catch (e) {
            console.warn('[MedicalDevicesSync] Erro ao adicionar ICE candidate:', e);
          }
        }
      });
    });

    // Stream encerrado
    this.hubConnection.on('StreamEnded', () => {
      this.ngZone.run(() => {
        console.log('[MedicalDevicesSync] Stream remoto encerrado');
        this.cleanupWebRTC();
        this._remoteStream$.next(null);
        this._streamType$.next(null);
        this._streamArea$.next(null);
      });
    });

    // Modo ditado do profissional mudou
    this.hubConnection.on('DictationModeChanged', (data: { isActive: boolean; userId: string; userRole: string }) => {
      this.ngZone.run(() => {
        console.log('[MedicalDevicesSync] Modo ditado do profissional:', data.isActive ? 'ATIVO' : 'INATIVO');
        this._dictationModeActive$.next(data.isActive);
      });
    });

    // Médico solicita atualização de sinais vitais
    this.hubConnection.on('VitalsUpdateRequested', (data: { requestedBy: string; timestamp: Date }) => {
      this.ngZone.run(() => {
        console.log('[MedicalDevicesSync] Médico solicitou atualização de sinais vitais');
        this._vitalsUpdateRequested$.next();
      });
    });

    // Médico solicita streaming de dispositivo
    this.hubConnection.on('StreamRequested', (data: { deviceType: 'auscultation' | 'video'; requestedBy: string; timestamp: Date }) => {
      this.ngZone.run(() => {
        console.log('[MedicalDevicesSync] Médico solicitou streaming:', data.deviceType);
        this._streamRequested$.next({ deviceType: data.deviceType, requestedBy: data.requestedBy });
      });
    });

    // Handlers de reconexão
    this.hubConnection.onreconnecting((error: any) => {
      console.warn('[MedicalDevicesSync] Reconectando...', error);
      this._isConnected$.next(false);
    });

    this.hubConnection.onreconnected(async (connectionId: string) => {
      console.log('[MedicalDevicesSync] Reconectado:', connectionId);
      this._isConnected$.next(true);
      
      if (this.currentAppointmentId) {
        await this.hubConnection.invoke('JoinAppointment', this.currentAppointmentId);
      }
    });

    this.hubConnection.onclose((error: any) => {
      console.warn('[MedicalDevicesSync] Conexão fechada:', error);
      this._isConnected$.next(false);
    });
  }

  /**
   * Configura forwarding de dados Bluetooth para o hub
   */
  private setupBluetoothForwarding(): void {
    const sub = this.bluetoothService.readings$.subscribe(reading => {
      this.sendVitalSigns(reading);
    });
    this.subscriptions.add(sub);
  }

  /**
   * Envia sinais vitais via SignalR
   * Aceita tanto VitalReading (do Bluetooth) quanto objeto simples de sinais vitais
   */
  async sendVitalSigns(reading: VitalReading | Record<string, any>): Promise<void> {
    if (!this.hubConnection || !this.currentAppointmentId) return;

    try {
      // Verifica se é um VitalReading ou um objeto simples
      const isVitalReading = 'timestamp' in reading && 'values' in reading;
      
      const vitals = isVitalReading 
        ? (reading as VitalReading).values 
        : {
            spo2: (reading as any).oxygenSaturation,
            heartRate: (reading as any).heartRate,
            systolic: (reading as any).bloodPressureSystolic,
            diastolic: (reading as any).bloodPressureDiastolic,
            temperature: (reading as any).temperature,
            weight: (reading as any).weight
          };

      const data: VitalSignsData = {
        appointmentId: this.currentAppointmentId,
        senderRole: this.authService.currentUser()?.role || 'unknown',
        timestamp: isVitalReading ? (reading as VitalReading).timestamp : new Date(),
        vitals
      };

      await this.hubConnection.invoke('SendVitalSigns', data);
      console.log('[MedicalDevicesSync] Sinais vitais enviados:', data.vitals);
    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao enviar sinais vitais:', error);
    }
  }

  /**
   * Notifica os outros participantes sobre o estado do modo ditado
   */
  async notifyDictationMode(isActive: boolean): Promise<void> {
    console.log('[MedicalDevicesSync] notifyDictationMode chamado:', {
      isActive,
      hasHubConnection: !!this.hubConnection,
      currentAppointmentId: this.currentAppointmentId,
      hubState: this.hubConnection?.state
    });

    if (!this.hubConnection || !this.currentAppointmentId) {
      console.warn('[MedicalDevicesSync] Não conectado ao hub! Não pode notificar modo ditado');
      return;
    }

    try {
      await this.hubConnection.invoke('NotifyDictationMode', this.currentAppointmentId, isActive);
      console.log('[MedicalDevicesSync] ✓ Notificação de modo ditado enviada:', isActive);
    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao notificar modo ditado:', error);
    }
  }

  /**
   * Solicita atualização de sinais vitais (médico solicita ao paciente)
   */
  async requestVitalsUpdate(appointmentId: string): Promise<void> {
    console.log('[MedicalDevicesSync] Solicitando atualização de sinais vitais...');
    
    if (!this.hubConnection) {
      console.warn('[MedicalDevicesSync] Não conectado ao hub');
      return;
    }

    try {
      await this.hubConnection.invoke('RequestVitalsUpdate', appointmentId);
      console.log('[MedicalDevicesSync] ✓ Solicitação de vitais enviada');
    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao solicitar vitais:', error);
    }
  }

  /**
   * Solicita que o paciente inicie streaming de um dispositivo (ausculta ou câmera)
   */
  async requestDeviceStream(appointmentId: string, deviceType: 'auscultation' | 'video'): Promise<void> {
    console.log('[MedicalDevicesSync] Solicitando stream:', deviceType);
    
    if (!this.hubConnection) {
      console.warn('[MedicalDevicesSync] Não conectado ao hub');
      return;
    }

    try {
      await this.hubConnection.invoke('RequestDeviceStream', appointmentId, deviceType);
      console.log('[MedicalDevicesSync] ✓ Solicitação de stream enviada:', deviceType);
    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao solicitar stream:', error);
    }
  }

  /**
   * Inicia streaming de mídia (ausculta ou vídeo)
   */
  async startStreaming(stream: MediaStream, type: 'auscultation' | 'video' = 'auscultation', area?: string): Promise<void> {
    console.log('[MedicalDevicesSync] startStreaming chamado:', {
      type,
      area,
      hasHubConnection: !!this.hubConnection,
      appointmentId: this.currentAppointmentId,
      hubState: this.hubConnection?.state,
      streamTracks: stream?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
    });

    if (!this.hubConnection || !this.currentAppointmentId) {
      console.error('[MedicalDevicesSync] Não conectado ao hub - hubConnection:', !!this.hubConnection, 'appointmentId:', this.currentAppointmentId);
      this._connectionError$.next('Não conectado ao hub de dispositivos médicos');
      return;
    }

    try {
      console.log('[MedicalDevicesSync] Iniciando streaming:', type, 'para consulta:', this.currentAppointmentId);
      
      this.localStream = stream;
      this.currentStreamType = type;
      this.currentStreamArea = area || null;
      
      // Se já existe uma peer connection, feche antes de criar nova
      if (this.peerConnection) {
        console.log('[MedicalDevicesSync] Fechando peer connection anterior do paciente');
        this.peerConnection.close();
      }

      // Cria peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });

      // Log de estado da conexão
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[MedicalDevicesSync] [Paciente] Estado da conexão WebRTC:', this.peerConnection?.connectionState);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[MedicalDevicesSync] [Paciente] Estado ICE:', this.peerConnection?.iceConnectionState);
      };

      // Adiciona tracks ao peer connection
      stream.getTracks().forEach(track => {
        console.log('[MedicalDevicesSync] Adicionando track:', track.kind);
        this.peerConnection!.addTrack(track, stream);
      });

      // Handler para ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.hubConnection) {
          this.hubConnection.invoke('SendIceCandidate', {
            appointmentId: this.currentAppointmentId,
            candidate: event.candidate.toJSON()
          });
        }
      };

      // Cria oferta
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Envia oferta via SignalR
      const streamOffer: StreamOffer = {
        appointmentId: this.currentAppointmentId,
        streamType: type,
        offer: offer,
        area
      };

      await this.hubConnection.invoke('SendStreamOffer', streamOffer);
      console.log('[MedicalDevicesSync] Oferta enviada');

    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao iniciar streaming:', error);
      this.cleanupWebRTC();
    }
  }

  /**
   * Reenvia a oferta de stream (quando outro usuário entra na sala)
   */
  private async resendStreamOffer(): Promise<void> {
    if (!this.hubConnection || !this.currentAppointmentId || !this.localStream || !this.currentStreamType) {
      return;
    }

    try {
      // Recria a peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });

      // Adiciona tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Handler para ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.hubConnection) {
          this.hubConnection.invoke('SendIceCandidate', {
            appointmentId: this.currentAppointmentId,
            candidate: event.candidate.toJSON()
          });
        }
      };

      // Cria nova oferta
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const streamOffer: StreamOffer = {
        appointmentId: this.currentAppointmentId,
        streamType: this.currentStreamType,
        offer: offer,
        area: this.currentStreamArea || undefined
      };

      await this.hubConnection.invoke('SendStreamOffer', streamOffer);
      console.log('[MedicalDevicesSync] Oferta reenviada para novo usuário');

    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao reenviar oferta:', error);
    }
  }

  /**
   * Reenvia a oferta de stream atual (método público)
   * Usado quando o médico solicita e o paciente já está transmitindo
   */
  async resendCurrentStreamOffer(): Promise<void> {
    console.log('[MedicalDevicesSync] resendCurrentStreamOffer chamado');
    await this.resendStreamOffer();
  }

  /**
   * Processa oferta de stream recebida (lado do médico)
   */
  private async handleStreamOffer(offer: StreamOffer): Promise<void> {
    try {
      console.log('[MedicalDevicesSync] Processando oferta de stream:', {
        streamType: offer.streamType,
        area: offer.area,
        hasOffer: !!offer.offer
      });

      // Se já existe uma peer connection, feche antes de criar nova
      if (this.peerConnection) {
        console.log('[MedicalDevicesSync] Fechando peer connection anterior');
        this.peerConnection.close();
      }

      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });

      // Log de estado da conexão
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[MedicalDevicesSync] Estado da conexão WebRTC:', this.peerConnection?.connectionState);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[MedicalDevicesSync] Estado ICE:', this.peerConnection?.iceConnectionState);
      };

      // Handler para tracks remotos
      this.peerConnection.ontrack = (event) => {
        console.log('[MedicalDevicesSync] Track remoto recebido:', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          streams: event.streams.length
        });
        this.remoteStream = event.streams[0];
        console.log('[MedicalDevicesSync] Emitindo remoteStream:', {
          hasStream: !!this.remoteStream,
          audioTracks: this.remoteStream?.getAudioTracks().length,
          videoTracks: this.remoteStream?.getVideoTracks().length
        });
        this._remoteStream$.next(this.remoteStream);
      };

      // Handler para ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.hubConnection) {
          this.hubConnection.invoke('SendIceCandidate', {
            appointmentId: this.currentAppointmentId,
            candidate: event.candidate.toJSON()
          });
        }
      };

      // Define oferta remota e cria resposta
      await this.peerConnection.setRemoteDescription(offer.offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Envia resposta
      await this.hubConnection.invoke('SendStreamAnswer', {
        appointmentId: this.currentAppointmentId,
        answer: answer
      });

      console.log('[MedicalDevicesSync] Resposta enviada');

    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao processar oferta:', error);
    }
  }

  /**
   * Processa resposta de stream (lado do paciente)
   */
  private async handleStreamAnswer(answer: StreamAnswer): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(answer.answer);
        console.log('[MedicalDevicesSync] Resposta processada, stream ativo');
      }
    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao processar resposta:', error);
    }
  }

  /**
   * Para o streaming
   */
  async stopStreaming(): Promise<void> {
    if (this.hubConnection && this.currentAppointmentId) {
      try {
        await this.hubConnection.invoke('EndStream', this.currentAppointmentId);
      } catch (e) {
        console.warn('[MedicalDevicesSync] Erro ao notificar fim de stream:', e);
      }
    }

    this.currentStreamType = null;
    this.currentStreamArea = null;
    this.cleanupWebRTC();
    this._streamType$.next(null);
    this._streamArea$.next(null);
  }

  /**
   * Limpa recursos WebRTC
   */
  private cleanupWebRTC(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    this._remoteStream$.next(null);
  }

  /**
   * Desconecta do hub
   */
  async disconnect(): Promise<void> {
    this.cleanupWebRTC();
    this.subscriptions.unsubscribe();

    if (this.hubConnection) {
      try {
        if (this.currentAppointmentId) {
          await this.hubConnection.invoke('LeaveAppointment', this.currentAppointmentId);
        }
        await this.hubConnection.stop();
      } catch (e) {
        console.warn('[MedicalDevicesSync] Erro ao desconectar:', e);
      }
    }

    this.hubConnection = null;
    this.connectionPromise = null;
    this.currentAppointmentId = null;
    this._isConnected$.next(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
