import { Injectable, Inject, PLATFORM_ID, NgZone, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject, Observable, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

// Interfaces para dados de ausculta
export interface AuscultationData {
  orderId: string;
  recipientUserId: string;
  timestamp: string;
  phonogramImage: string;
  fftData?: number[][];
  audioBlob?: Blob;
  frequency?: number;
  estimatedBPM?: number;
  duration: number;
  isStreaming: boolean;
  packetNumber?: number;
  totalPackets?: number;
}

// Interface para dados da câmera de exames
export interface ExamCameraData {
  orderId: string;
  recipientUserId: string;
  timestamp: string;
  imageData: string;
  frameNumber: number;
  isStreaming: boolean;
  deviceType?: 'otoscope' | 'dermatoscope' | 'laryngoscope';
}

// Interface para status de streaming
export interface StreamingStatus {
  type: 'auscultation' | 'examCamera';
  status: 'connecting' | 'connected' | 'transmitting' | 'received' | 'error' | 'disconnected';
  packetNumber?: number;
  latencyMs?: number;
  message?: string;
  timestamp?: Date;
}

// Interface para dados recebidos de ausculta
export interface ReceivedAuscultationData {
  senderId: string;
  phonogramImage: string;
  fftData?: number[][];
  frequency?: number;
  estimatedBPM?: number;
  duration: number;
  packetNumber: number;
  timestamp: Date;
  latencyMs: number;
}

// Interface para dados recebidos da câmera
export interface ReceivedExamCameraData {
  senderId: string;
  imageData: string;
  frameNumber: number;
  deviceType?: string;
  timestamp: Date;
  latencyMs: number;
}

/**
 * Serviço para Internet of Medical Things (IoMT)
 * Gerencia streaming de dados de dispositivos médicos via SignalR
 * 
 * Este serviço complementa o WebRTC existente enviando:
 * - Imagem do fonocardiograma a cada 2-3 segundos
 * - Dados FFT para análise
 * - Estatísticas de BPM e frequência
 * - Frames da câmera de exames
 */
@Injectable({
  providedIn: 'root'
})
export class IoMTService implements OnDestroy {
  private isBrowser: boolean;
  private hubConnection: any = null;
  private connectionPromise: Promise<void> | null = null;
  private currentAppointmentId: string | null = null;
  private subscriptions = new Subscription();
  
  // Estado de conexão
  private _isConnected$ = new BehaviorSubject<boolean>(false);
  public isConnected$ = this._isConnected$.asObservable();
  
  // Status de streaming
  private _streamingStatus$ = new Subject<StreamingStatus>();
  public streamingStatus$ = this._streamingStatus$.asObservable();
  
  // Dados recebidos de ausculta (lado do médico)
  private _auscultationReceived$ = new Subject<ReceivedAuscultationData>();
  public auscultationReceived$ = this._auscultationReceived$.asObservable();
  
  // Dados recebidos da câmera (lado do médico)
  private _examCameraReceived$ = new Subject<ReceivedExamCameraData>();
  public examCameraReceived$ = this._examCameraReceived$.asObservable();
  
  // Erros de conexão
  private _connectionError$ = new Subject<string>();
  public connectionError$ = this._connectionError$.asObservable();
  
  // Estatísticas
  private packetsSent = 0;
  private packetsConfirmed = 0;
  private lastLatencyMs = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private authService: AuthService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Conecta ao hub de IoMT
   */
  async connect(appointmentId: string): Promise<void> {
    if (!this.isBrowser) {
      console.log('[IoMT] Não é browser, ignorando conexão');
      return;
    }

    // Evita múltiplas conexões
    if (this.connectionPromise && this.currentAppointmentId === appointmentId) {
      console.log('[IoMT] Conexão já existe para appointment:', appointmentId);
      return this.connectionPromise;
    }

    console.log('[IoMT] Iniciando conexão para appointment:', appointmentId);
    this.currentAppointmentId = appointmentId;

    this.connectionPromise = this.doConnect(appointmentId);
    return this.connectionPromise;
  }

  private async doConnect(appointmentId: string): Promise<void> {
    try {
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'connecting',
        message: 'Conectando ao hub IoMT...'
      });

      // Importa SignalR dinamicamente
      const signalR = await import('@microsoft/signalr');

      // Constrói URL do hub baseado no host atual
      const getHubUrl = () => {
        if (typeof window !== 'undefined') {
          const protocol = window.location.protocol;
          const host = window.location.host;
          return `${protocol}//${host}/hubs/iomt`;
        }
        return '/hubs/iomt';
      };
      
      const hubUrl = getHubUrl();
      console.log('[IoMT] Conectando ao hub:', hubUrl);

      const token = this.authService.getAccessToken();
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
      console.log('[IoMT] Conectado com sucesso!');

      // Entra na sala da consulta
      await this.hubConnection.invoke('JoinAppointment', appointmentId);
      console.log('[IoMT] Entrou na consulta:', appointmentId);

      this._isConnected$.next(true);
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'connected',
        message: 'Conectado ao hub IoMT'
      });

    } catch (error: any) {
      console.error('[IoMT] Erro ao conectar:', error);
      this._connectionError$.next(error.message);
      this._isConnected$.next(false);
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'error',
        message: `Erro: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Registra handlers do SignalR
   */
  private registerHubHandlers(): void {
    if (!this.hubConnection) return;

    // Recebe dados de ausculta
    this.hubConnection.on('ReceiveAuscultationStream', (data: any) => {
      this.ngZone.run(() => {
        const receiveTime = Date.now();
        const sendTime = new Date(data.timestamp).getTime();
        const latencyMs = receiveTime - sendTime;
        
        console.log('[IoMT] Recebeu ausculta, pacote #', data.packetNumber, 'latência:', latencyMs, 'ms');
        
        this._auscultationReceived$.next({
          senderId: data.senderId,
          phonogramImage: data.phonogramImage,
          fftData: data.fftData,
          frequency: data.frequency,
          estimatedBPM: data.estimatedBPM,
          duration: data.duration,
          packetNumber: data.packetNumber,
          timestamp: new Date(data.timestamp),
          latencyMs
        });

        this._streamingStatus$.next({
          type: 'auscultation',
          status: 'received',
          packetNumber: data.packetNumber,
          latencyMs
        });
      });
    });

    // Recebe dados da câmera de exames
    this.hubConnection.on('ReceiveExamCameraStream', (data: any) => {
      this.ngZone.run(() => {
        const receiveTime = Date.now();
        const sendTime = new Date(data.timestamp).getTime();
        const latencyMs = receiveTime - sendTime;
        
        console.log('[IoMT] Recebeu frame câmera #', data.frameNumber, 'latência:', latencyMs, 'ms');
        
        this._examCameraReceived$.next({
          senderId: data.senderId,
          imageData: data.imageData,
          frameNumber: data.frameNumber,
          deviceType: data.deviceType,
          timestamp: new Date(data.timestamp),
          latencyMs
        });

        this._streamingStatus$.next({
          type: 'examCamera',
          status: 'received',
          packetNumber: data.frameNumber,
          latencyMs
        });
      });
    });

    // Confirmação de pacote recebido pelo médico
    this.hubConnection.on('PacketAcknowledged', (data: any) => {
      this.ngZone.run(() => {
        this.packetsConfirmed++;
        this.lastLatencyMs = data.latencyMs || 0;
        
        this._streamingStatus$.next({
          type: data.type || 'auscultation',
          status: 'received',
          packetNumber: data.packetNumber,
          latencyMs: data.latencyMs
        });
      });
    });

    // Reconexão
    this.hubConnection.onreconnecting(() => {
      console.log('[IoMT] Reconectando...');
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'connecting',
        message: 'Reconectando...'
      });
    });

    this.hubConnection.onreconnected(() => {
      console.log('[IoMT] Reconectado!');
      this._isConnected$.next(true);
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'connected',
        message: 'Reconectado!'
      });
      
      // Reentra na sala
      if (this.currentAppointmentId) {
        this.hubConnection.invoke('JoinAppointment', this.currentAppointmentId);
      }
    });

    this.hubConnection.onclose(() => {
      console.log('[IoMT] Conexão fechada');
      this._isConnected$.next(false);
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'disconnected',
        message: 'Desconectado'
      });
    });
  }

  // ========== AUSCULTA - STREAMING EM TEMPO REAL ==========

  /**
   * Envia dados de ausculta em streaming (a cada 2 segundos)
   */
  async sendAuscultationStream(data: AuscultationData): Promise<void> {
    if (!this.hubConnection || !this._isConnected$.value) {
      throw new Error('Não conectado ao hub IoMT');
    }

    const startTime = Date.now();

    try {
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'transmitting',
        packetNumber: data.packetNumber,
        message: 'Enviando dados...'
      });

      await this.hubConnection.invoke('SendAuscultationStream', {
        appointmentId: this.currentAppointmentId,
        recipientUserId: data.recipientUserId,
        timestamp: data.timestamp,
        phonogramImage: data.phonogramImage,
        fftData: data.fftData,
        frequency: data.frequency,
        estimatedBPM: data.estimatedBPM,
        duration: data.duration,
        packetNumber: data.packetNumber
      });

      this.packetsSent++;
      const latencyMs = Date.now() - startTime;
      this.lastLatencyMs = latencyMs;

      console.log('[IoMT] Pacote ausculta #', data.packetNumber, 'enviado, latência:', latencyMs, 'ms');

      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'transmitting',
        packetNumber: data.packetNumber,
        latencyMs,
        message: `Pacote #${data.packetNumber} enviado`
      });

    } catch (error: any) {
      console.error('[IoMT] Erro ao enviar ausculta:', error);
      this._streamingStatus$.next({
        type: 'auscultation',
        status: 'error',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Envia a gravação final completa da ausculta (HTTP para arquivos grandes)
   */
  async sendAuscultationFinal(data: AuscultationData): Promise<void> {
    if (!this.hubConnection || !this._isConnected$.value) {
      throw new Error('Não conectado ao hub IoMT');
    }

    try {
      await this.hubConnection.invoke('SendAuscultationFinal', {
        appointmentId: this.currentAppointmentId,
        recipientUserId: data.recipientUserId,
        timestamp: data.timestamp,
        phonogramImage: data.phonogramImage,
        duration: data.duration,
        estimatedBPM: data.estimatedBPM,
        totalPackets: data.totalPackets
      });

      console.log('[IoMT] Gravação final enviada');

    } catch (error: any) {
      console.error('[IoMT] Erro ao enviar gravação final:', error);
      throw error;
    }
  }

  // ========== CÂMERA DE EXAMES - STREAMING ==========

  /**
   * Envia frame da câmera de exames em tempo real
   */
  async sendExamCameraStream(data: ExamCameraData): Promise<void> {
    if (!this.hubConnection || !this._isConnected$.value) {
      throw new Error('Não conectado ao hub IoMT');
    }

    const startTime = Date.now();

    try {
      this._streamingStatus$.next({
        type: 'examCamera',
        status: 'transmitting',
        packetNumber: data.frameNumber,
        message: 'Enviando frame...'
      });

      await this.hubConnection.invoke('SendExamCameraStream', {
        appointmentId: this.currentAppointmentId,
        recipientUserId: data.recipientUserId,
        timestamp: data.timestamp,
        imageData: data.imageData,
        frameNumber: data.frameNumber,
        deviceType: data.deviceType
      });

      this.packetsSent++;
      const latencyMs = Date.now() - startTime;
      this.lastLatencyMs = latencyMs;

      console.log('[IoMT] Frame câmera #', data.frameNumber, 'enviado, latência:', latencyMs, 'ms');

      this._streamingStatus$.next({
        type: 'examCamera',
        status: 'transmitting',
        packetNumber: data.frameNumber,
        latencyMs,
        message: `Frame #${data.frameNumber} enviado`
      });

    } catch (error: any) {
      console.error('[IoMT] Erro ao enviar frame:', error);
      this._streamingStatus$.next({
        type: 'examCamera',
        status: 'error',
        message: error.message
      });
      throw error;
    }
  }

  // ========== ESTATÍSTICAS ==========

  getStats(): { packetsSent: number; packetsConfirmed: number; lastLatencyMs: number } {
    return {
      packetsSent: this.packetsSent,
      packetsConfirmed: this.packetsConfirmed,
      lastLatencyMs: this.lastLatencyMs
    };
  }

  resetStats(): void {
    this.packetsSent = 0;
    this.packetsConfirmed = 0;
    this.lastLatencyMs = 0;
  }

  // ========== CLEANUP ==========

  async disconnect(): Promise<void> {
    if (this.hubConnection) {
      try {
        if (this.currentAppointmentId) {
          await this.hubConnection.invoke('LeaveAppointment', this.currentAppointmentId);
        }
        await this.hubConnection.stop();
      } catch (error) {
        console.error('[IoMT] Erro ao desconectar:', error);
      }
      
      this.hubConnection = null;
      this.currentAppointmentId = null;
      this.connectionPromise = null;
    }
    
    this._isConnected$.next(false);
    this.resetStats();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.disconnect();
  }
}
