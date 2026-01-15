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
  
  // Fila de ICE candidates pendentes (chegam antes de remote description ser definida)
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  // Streams locais persistentes (não são parados quando componente é destruído)
  private _localAuscultationStream$ = new BehaviorSubject<MediaStream | null>(null);
  public localAuscultationStream$ = this._localAuscultationStream$.asObservable();

  private _localVideoStream$ = new BehaviorSubject<MediaStream | null>(null);
  public localVideoStream$ = this._localVideoStream$.asObservable();

  private _isAuscultationActive$ = new BehaviorSubject<boolean>(false);
  public isAuscultationActive$ = this._isAuscultationActive$.asObservable();

  private _isVideoActive$ = new BehaviorSubject<boolean>(false);
  public isVideoActive$ = this._isVideoActive$.asObservable();

  private _isAuscultationTransmitting$ = new BehaviorSubject<boolean>(false);
  public isAuscultationTransmitting$ = this._isAuscultationTransmitting$.asObservable();

  private _isVideoTransmitting$ = new BehaviorSubject<boolean>(false);
  public isVideoTransmitting$ = this._isVideoTransmitting$.asObservable();

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

  // Audio chunks para streaming de ausculta PCM
  private _audioChunkReceived$ = new Subject<{appointmentId: string; chunk: any}>();
  public audioChunkReceived$ = this._audioChunkReceived$.asObservable();

  // Log visual para debug
  private _debugLog$ = new Subject<{message: string; type: 'info' | 'success' | 'error' | 'warning'}>();
  public debugLog$ = this._debugLog$.asObservable();

  // Estado do modo ditado do profissional
  private _dictationModeActive$ = new BehaviorSubject<boolean>(false);
  public dictationModeActive$ = this._dictationModeActive$.asObservable();

  // Getters síncronos para acesso imediato ao cache
  get currentRemoteStream(): MediaStream | null {
    return this._remoteStream$.getValue();
  }

  get currentStreamTypeValue(): 'auscultation' | 'video' | null {
    return this._streamType$.getValue();
  }

  get currentStreamAreaValue(): string | null {
    return this._streamArea$.getValue();
  }

  get isCurrentlyConnected(): boolean {
    return this._isConnected$.getValue();
  }

  // Getters síncronos para streams locais
  get currentLocalAuscultationStream(): MediaStream | null {
    return this._localAuscultationStream$.getValue();
  }

  get currentLocalVideoStream(): MediaStream | null {
    return this._localVideoStream$.getValue();
  }

  get isAuscultationCurrentlyActive(): boolean {
    return this._isAuscultationActive$.getValue();
  }

  get isVideoCurrentlyActive(): boolean {
    return this._isVideoActive$.getValue();
  }

  get isAuscultationCurrentlyTransmitting(): boolean {
    return this._isAuscultationTransmitting$.getValue();
  }

  get isVideoCurrentlyTransmitting(): boolean {
    return this._isVideoTransmitting$.getValue();
  }

  // ICE Servers para WebRTC - Com TURN servers para garantir conexão
  // STUN: descobre IP público (gratuito, rápido)
  // TURN: relay de mídia quando P2P falha (necessário para NAT restritivo)
  private iceServers: RTCIceServer[] = [
    // STUN servers (descoberta de IP)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // TURN servers públicos (relay quando P2P falha)
    // OpenRelay - serviço gratuito confiável
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
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

    console.log('[MedicalDevicesSync] Iniciando nova conexão para appointment:', appointmentId);
    this.currentAppointmentId = appointmentId;

    this.connectionPromise = this.doConnect(appointmentId);
    return this.connectionPromise;
  }

  private async doConnect(appointmentId: string): Promise<void> {
    try {
      // Importa SignalR dinamicamente
      const signalR = await import('@microsoft/signalr');

      // Constrói URL do hub baseado no apiUrl do environment (backend)
      const getHubUrl = () => {
        // Remove /api do final para obter a URL base do backend
        const baseUrl = environment.apiUrl.replace(/\/api$/, '');
        return `${baseUrl}/hubs/medical-devices`;
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
      this._debugLog$.next({ message: '✓ Hub conectado!', type: 'success' });

      // Entra na sala da consulta
      await this.hubConnection.invoke('JoinAppointment', appointmentId);
      console.log('[MedicalDevicesSync] Entrou na consulta:', appointmentId);
      this._debugLog$.next({ message: `✓ Entrou na sala: ${appointmentId}`, type: 'success' });

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
        this._debugLog$.next({ message: `✓ OFERTA RECEBIDA do paciente! Tipo: ${offer.streamType}`, type: 'success' });
        this._streamType$.next(offer.streamType);
        this._streamArea$.next(offer.area || null);
        this._debugLog$.next({ message: 'Processando oferta e enviando resposta...', type: 'info' });
        await this.handleStreamOffer(offer);
      });
    });

    // Recebe resposta WebRTC (paciente recebe do médico)
    this.hubConnection.on('ReceiveStreamAnswer', async (answer: StreamAnswer) => {
      this.ngZone.run(async () => {
        console.log('[MedicalDevicesSync] Recebeu resposta de stream');
        this._debugLog$.next({ message: '✓ Médico respondeu! Estabelecendo conexão...', type: 'success' });
        await this.handleStreamAnswer(answer);
      });
    });

    // Médico solicitou o stream (paciente deve reenviar a oferta)
    this.hubConnection.on('StreamRequested', async (data: { deviceType: string; requestedBy: string }) => {
      this.ngZone.run(async () => {
        console.log('[MedicalDevicesSync] 📢 STREAM REQUESTED RECEBIDO:', data);
        console.log('[MedicalDevicesSync] Estado atual:', {
          localStream: !!this.localStream,
          currentStreamType: this.currentStreamType,
          currentAppointmentId: this.currentAppointmentId
        });
        this._debugLog$.next({ message: `📢 MÉDICO SOLICITOU STREAM: ${data.deviceType}`, type: 'warning' });
        // Se o paciente está transmitindo, reenvia a oferta
        if (this.localStream && this.currentStreamType) {
          console.log('[MedicalDevicesSync] Reenviando oferta a pedido do médico');
          this._debugLog$.next({ message: 'Reenviando oferta WebRTC...', type: 'info' });
          await this.resendStreamOffer();
          this._debugLog$.next({ message: '✓ Oferta reenviada ao médico!', type: 'success' });
        } else {
          console.log('[MedicalDevicesSync] Não há stream ativo para reenviar!');
          this._debugLog$.next({ message: 'Não há stream ativo para reenviar', type: 'warning' });
        }
      });
    });

    // Recebe ICE candidate - com suporte a candidates pendentes
    this.hubConnection.on('ReceiveIceCandidate', async (data: IceCandidate) => {
      this.ngZone.run(async () => {
        if (!data.candidate) return;
        
        // Se não temos peer connection ou remote description ainda, guarda na fila
        if (!this.peerConnection || !this.peerConnection.remoteDescription) {
          console.log('[MedicalDevicesSync] ICE candidate recebido antes de remote description, enfileirando...');
          this.pendingIceCandidates.push(data.candidate);
          return;
        }
        
        try {
          await this.peerConnection.addIceCandidate(data.candidate);
          console.log('[MedicalDevicesSync] ✓ ICE candidate adicionado');
        } catch (e) {
          console.warn('[MedicalDevicesSync] Erro ao adicionar ICE candidate:', e);
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
   * Envia chunk de áudio PCM para streaming de ausculta
   */
  async sendAudioChunk(appointmentId: string, chunk: any): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== 'Connected') return;

    try {
      await this.hubConnection.invoke('SendAudioChunk', appointmentId, chunk);
    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao enviar audio chunk:', error);
    }
  }

  /**
   * Solicita que o paciente envie o stream (usado pelo médico)
   */
  async requestStream(deviceType: 'auscultation' | 'video'): Promise<void> {
    console.log('[MedicalDevicesSync] requestStream chamado:', {
      deviceType,
      hubConnection: !!this.hubConnection,
      hubState: this.hubConnection?.state,
      currentAppointmentId: this.currentAppointmentId
    });
    
    if (!this.hubConnection || !this.currentAppointmentId) {
      console.warn('[MedicalDevicesSync] Não conectado ao hub! Não pode solicitar stream');
      this._debugLog$.next({ message: 'ERRO: Não conectado ao hub!', type: 'error' });
      return;
    }

    try {
      console.log('[MedicalDevicesSync] Solicitando stream do paciente:', deviceType, 'sala:', this.currentAppointmentId);
      this._debugLog$.next({ message: `Solicitando stream ${deviceType} do paciente... (sala: ${this.currentAppointmentId})`, type: 'info' });
      await this.hubConnection.invoke('RequestDeviceStream', this.currentAppointmentId, deviceType);
      console.log('[MedicalDevicesSync] ✓ Solicitação de stream enviada com sucesso para sala:', this.currentAppointmentId);
      this._debugLog$.next({ message: '✓ Solicitação enviada ao paciente', type: 'success' });
    } catch (error: any) {
      console.error('[MedicalDevicesSync] Erro ao solicitar stream:', error);
      this._debugLog$.next({ message: `ERRO: ${error.message}`, type: 'error' });
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
   * Inicia streaming de mídia (ausculta ou vídeo)
   */
  async startStreaming(stream: MediaStream, type: 'auscultation' | 'video' = 'auscultation', area?: string): Promise<void> {
    console.log('[MedicalDevicesSync] startStreaming chamado:', {
      type,
      area,
      hasHubConnection: !!this.hubConnection,
      appointmentId: this.currentAppointmentId,
      hubState: this.hubConnection?.state,
      streamTracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState, label: t.label }))
    });

    if (!this.hubConnection || !this.currentAppointmentId) {
      console.error('[MedicalDevicesSync] Não conectado ao hub - hubConnection:', !!this.hubConnection, 'appointmentId:', this.currentAppointmentId);
      this._connectionError$.next('Não conectado ao hub de dispositivos médicos');
      throw new Error('Não conectado ao hub de dispositivos médicos');
    }

    // Limpa conexão anterior se existir
    if (this.peerConnection) {
      console.log('[MedicalDevicesSync] Limpando peer connection anterior');
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Limpa candidates pendentes
    this.pendingIceCandidates = [];

    try {
      console.log('[MedicalDevicesSync] Iniciando streaming:', type, 'para consulta:', this.currentAppointmentId);
      this._debugLog$.next({ message: `Iniciando stream ${type}...`, type: 'info' });
      
      this.localStream = stream;
      this.currentStreamType = type;
      this.currentStreamArea = area || null;
      
      // Cria peer connection - CONFIGURAÇÃO SIMPLES (versão que funcionava!)
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });

      // Log de eventos de conexão para debug
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[MedicalDevicesSync] Connection state:', state);
        if (state === 'connected') {
          console.log('[MedicalDevicesSync] ✓✓✓ CONEXÃO WEBRTC ESTABELECIDA! ✓✓✓');
          this._debugLog$.next({ message: '✓✓✓ CONEXÃO ESTABELECIDA! Stream ativo!', type: 'success' });
        } else if (state === 'failed') {
          console.error('[MedicalDevicesSync] ✗✗✗ CONEXÃO WEBRTC FALHOU ✗✗✗');
          this._connectionError$.next('Conexão WebRTC falhou. Verifique sua rede.');
          this._debugLog$.next({ message: '✗✗✗ FALHA NA CONEXÃO!', type: 'error' });
        }
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

      // Adiciona tracks ao peer connection
      stream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, stream);
      });

      // Cria oferta - SIMPLES (versão que funcionava!)
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Envia oferta via SignalR - DIRETAMENTE (sem serialização manual!)
      const streamOffer: StreamOffer = {
        appointmentId: this.currentAppointmentId,
        streamType: type,
        offer: offer,  // Envia objeto direto, não serializado!
        area
      };

      await this.hubConnection.invoke('SendStreamOffer', streamOffer);
      console.log('[MedicalDevicesSync] ✓ Oferta enviada');
      this._debugLog$.next({ message: '✓ Oferta enviada! Aguardando médico...', type: 'success' });

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
      console.log('[MedicalDevicesSync] Reenviando oferta para novo usuário...');
      this._debugLog$.next({ message: 'Reenviando oferta...', type: 'info' });
      
      // Recria a peer connection - SIMPLES
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
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

      // Adiciona tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Cria nova oferta - SIMPLES
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const streamOffer: StreamOffer = {
        appointmentId: this.currentAppointmentId,
        streamType: this.currentStreamType,
        offer: offer,  // Envia direto!
        area: this.currentStreamArea || undefined
      };

      await this.hubConnection.invoke('SendStreamOffer', streamOffer);
      console.log('[MedicalDevicesSync] ✓ Oferta reenviada');
      this._debugLog$.next({ message: '✓ Oferta reenviada!', type: 'success' });

    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao reenviar oferta:', error);
    }
  }

  /**
   * Processa oferta de stream recebida (lado do médico)
   */
  private async handleStreamOffer(offer: StreamOffer): Promise<void> {
    try {
      console.log('[MedicalDevicesSync] Processando oferta de stream - início:', Date.now());

      // Limpa peer connection anterior se existir
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

      // Handler para tracks remotos - CRÍTICO: deve ser configurado antes de setRemoteDescription
      this.peerConnection.ontrack = (event) => {
        console.log('[MedicalDevicesSync] ✓ Track remoto recebido:', event.track.kind, Date.now());
        this.remoteStream = event.streams[0];
        this._remoteStream$.next(this.remoteStream);
      };

      // Handler para ICE candidates - Trickle ICE
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.hubConnection) {
          console.log('[MedicalDevicesSync] Enviando ICE candidate (resposta):', event.candidate.type, event.candidate.candidate?.substring(0, 50));
          this.hubConnection.invoke('SendIceCandidate', {
            appointmentId: this.currentAppointmentId,
            candidate: event.candidate.toJSON()
          });
        }
      };

      // Log de estados para debug - receptor
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[MedicalDevicesSync] Connection state (receptor):', state);
        if (state === 'connected') {
          console.log('[MedicalDevicesSync] ✓✓✓ MÉDICO: CONEXÃO WEBRTC ESTABELECIDA! ✓✓✓');
          this._debugLog$.next({ message: '✓✓✓ CONEXÃO ESTABELECIDA! Recebendo stream...', type: 'success' });
        } else if (state === 'failed') {
          console.error('[MedicalDevicesSync] ✗✗✗ MÉDICO: CONEXÃO WEBRTC FALHOU ✗✗✗');
          this._connectionError$.next('Conexão com paciente falhou.');
          this._debugLog$.next({ message: '✗✗✗ CONEXÃO FALHOU! Verifique rede/firewall', type: 'error' });
        } else if (state === 'connecting') {
          this._debugLog$.next({ message: 'Conectando ao paciente...', type: 'info' });
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log('[MedicalDevicesSync] ICE state (receptor):', state);
        if (state === 'failed') {
          console.error('[MedicalDevicesSync] ICE connection falhou no receptor');
        }
      };

      this.peerConnection.onicegatheringstatechange = () => {
        console.log('[MedicalDevicesSync] ICE gathering state (receptor):', this.peerConnection?.iceGatheringState);
      };

      // Define oferta remota e cria resposta
      console.log('[MedicalDevicesSync] Oferta recebida:', {
        type: offer.offer.type,
        sdpLength: offer.offer.sdp?.length || 0,
        sdpPreview: offer.offer.sdp?.substring(0, 100)
      });
      await this.peerConnection.setRemoteDescription(offer.offer);
      console.log('[MedicalDevicesSync] Remote description definida');
      this._debugLog$.next({ message: 'Remote description definida', type: 'info' });
      
      // Processa ICE candidates que chegaram antes
      await this.processPendingIceCandidates();
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[MedicalDevicesSync] Local description (answer) definida');

      // Envia resposta
      await this.hubConnection.invoke('SendStreamAnswer', {
        appointmentId: this.currentAppointmentId,
        answer: answer
      });

      console.log('[MedicalDevicesSync] ✓ Resposta enviada - negociação completa:', Date.now());
      this._debugLog$.next({ message: '✓ Resposta enviada ao paciente! Aguardando conexão...', type: 'success' });

    } catch (error: any) {
      console.error('[MedicalDevicesSync] Erro ao processar oferta:', error);
      this._debugLog$.next({ message: `ERRO ao processar oferta: ${error.message}`, type: 'error' });
    }
  }

  /**
   * Processa resposta de stream (lado do paciente)
   */
  private async handleStreamAnswer(answer: StreamAnswer): Promise<void> {
    try {
      if (this.peerConnection) {
        console.log('[MedicalDevicesSync] Resposta recebida:', {
          type: answer.answer.type,
          sdpLength: answer.answer.sdp?.length || 0
        });
        await this.peerConnection.setRemoteDescription(answer.answer);
        console.log('[MedicalDevicesSync] ✓ Resposta processada - Stream ativo!');
        this._debugLog$.next({ message: '✓ Médico respondeu! Estabelecendo conexão...', type: 'success' });
        
        // Processa ICE candidates que chegaram antes
        await this.processPendingIceCandidates();
      }
    } catch (error) {
      console.error('[MedicalDevicesSync] Erro ao processar resposta:', error);
    }
  }

  /**
   * Processa ICE candidates pendentes
   */
  private async processPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || this.pendingIceCandidates.length === 0) return;
    
    console.log('[MedicalDevicesSync] Processando', this.pendingIceCandidates.length, 'ICE candidates pendentes');
    
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
      } catch (e) {
        console.warn('[MedicalDevicesSync] Erro ao adicionar ICE candidate pendente:', e);
      }
    }
    
    this.pendingIceCandidates = [];
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

  // ================== STREAMS PERSISTENTES ==================

  /**
   * Registra um stream de ausculta persistente
   * O stream continua ativo mesmo quando o componente é destruído
   */
  setLocalAuscultationStream(stream: MediaStream | null, isTransmitting: boolean = false): void {
    console.log('[MedicalDevicesSync] setLocalAuscultationStream:', {
      hasStream: !!stream,
      isTransmitting,
      tracks: stream?.getTracks().map(t => t.kind)
    });
    this._localAuscultationStream$.next(stream);
    this._isAuscultationActive$.next(!!stream);
    this._isAuscultationTransmitting$.next(isTransmitting);
  }

  /**
   * Registra um stream de vídeo persistente
   */
  setLocalVideoStream(stream: MediaStream | null, isTransmitting: boolean = false): void {
    console.log('[MedicalDevicesSync] setLocalVideoStream:', {
      hasStream: !!stream,
      isTransmitting,
      tracks: stream?.getTracks().map(t => t.kind)
    });
    this._localVideoStream$.next(stream);
    this._isVideoActive$.next(!!stream);
    this._isVideoTransmitting$.next(isTransmitting);
  }

  /**
   * Atualiza o estado de transmissão de ausculta
   */
  setAuscultationTransmitting(isTransmitting: boolean): void {
    this._isAuscultationTransmitting$.next(isTransmitting);
  }

  /**
   * Atualiza o estado de transmissão de vídeo
   */
  setVideoTransmitting(isTransmitting: boolean): void {
    this._isVideoTransmitting$.next(isTransmitting);
  }

  /**
   * Para o stream de ausculta completamente
   */
  stopAuscultationStream(): void {
    const stream = this._localAuscultationStream$.getValue();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    this._localAuscultationStream$.next(null);
    this._isAuscultationActive$.next(false);
    this._isAuscultationTransmitting$.next(false);
  }

  /**
   * Para o stream de vídeo completamente
   */
  stopVideoStream(): void {
    const stream = this._localVideoStream$.getValue();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    this._localVideoStream$.next(null);
    this._isVideoActive$.next(false);
    this._isVideoTransmitting$.next(false);
  }

  /**
   * Limpa recursos WebRTC
   */
  private cleanupWebRTC(): void {
    console.log('[MedicalDevicesSync] cleanupWebRTC - limpando recursos');
    
    if (this.peerConnection) {
      // Remove todos os event listeners antes de fechar
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      
      // Fecha a conexão
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('[MedicalDevicesSync] Erro ao fechar peerConnection:', e);
      }
      this.peerConnection = null;
    }

    // Nota: NÃO paramos o localStream aqui pois ele é gerenciado pelo MedicalStreamingService
    // Apenas limpamos a referência
    this.localStream = null;

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
