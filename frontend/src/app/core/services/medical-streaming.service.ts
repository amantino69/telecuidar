import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject } from 'rxjs';

// Tipos de stream
export type StreamType = 'auscultation' | 'otoscope' | 'dermatoscope' | 'laryngoscope';
export type AuscultationArea = 'cardiac' | 'pulmonary' | 'abdominal';

// Interfaces
export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput';
}

export interface StreamSession {
  id: string;
  type: StreamType;
  stream: MediaStream;
  startedAt: Date;
  deviceId: string;
  area?: AuscultationArea;
}

export interface AudioAnalysis {
  volume: number;
  frequency: number;
  waveform: Float32Array;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalStreamingService {
  private isBrowser: boolean;
  private activeSessions = new Map<string, StreamSession>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  // Estado reativo
  private _availableAudioDevices$ = new BehaviorSubject<MediaDeviceInfo[]>([]);
  public availableAudioDevices$ = this._availableAudioDevices$.asObservable();

  private _availableVideoDevices$ = new BehaviorSubject<MediaDeviceInfo[]>([]);
  public availableVideoDevices$ = this._availableVideoDevices$.asObservable();

  private _activeStream$ = new BehaviorSubject<StreamSession | null>(null);
  public activeStream$ = this._activeStream$.asObservable();

  private _audioAnalysis$ = new Subject<AudioAnalysis>();
  public audioAnalysis$ = this._audioAnalysis$.asObservable();

  private _streamError$ = new Subject<{ type: StreamType; error: string }>();
  public streamError$ = this._streamError$.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.refreshDeviceList();
      
      // Atualiza lista quando dispositivos mudam
      navigator.mediaDevices?.addEventListener('devicechange', () => {
        this.ngZone.run(() => this.refreshDeviceList());
      });
    }
  }

  /**
   * Atualiza lista de dispositivos disponíveis
   */
  async refreshDeviceList(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      // Solicita permissão primeiro (necessário para ver labels)
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(s => {
        s.getTracks().forEach(t => t.stop());
      }).catch(() => {});

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioDevices: MediaDeviceInfo[] = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microfone ${d.deviceId.slice(0, 8)}`,
          kind: 'audioinput' as const
        }));

      const videoDevices: MediaDeviceInfo[] = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Câmera ${d.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const
        }));

      this._availableAudioDevices$.next(audioDevices);
      this._availableVideoDevices$.next(videoDevices);

      console.log('[MedicalStreaming] Dispositivos encontrados:', {
        audio: audioDevices.length,
        video: videoDevices.length
      });

    } catch (error) {
      console.error('[MedicalStreaming] Erro ao listar dispositivos:', error);
    }
  }

  /**
   * Inicia stream de ausculta (estetoscópio digital)
   */
  async startAuscultation(deviceId?: string, area: AuscultationArea = 'cardiac'): Promise<StreamSession | null> {
    console.log('[MedicalStreaming] Iniciando ausculta...', { deviceId, area });

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // Alta qualidade para ausculta médica
          sampleRate: 44100,
          channelCount: 1
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[MedicalStreaming] Stream de áudio obtido');

      // Inicia análise de áudio
      this.startAudioAnalysis(stream);

      const session: StreamSession = {
        id: this.generateSessionId(),
        type: 'auscultation',
        stream,
        startedAt: new Date(),
        deviceId: deviceId || 'default',
        area
      };

      this.activeSessions.set(session.id, session);
      this._activeStream$.next(session);

      console.log('[MedicalStreaming] Sessão de ausculta criada:', session.id);
      return session;

    } catch (error: any) {
      console.error('[MedicalStreaming] Erro ao iniciar ausculta:', error);
      this._streamError$.next({ type: 'auscultation', error: error.message });
      return null;
    }
  }

  /**
   * Inicia stream de câmera de exame (otoscópio/dermatoscópio)
   */
  async startExamStream(type: 'otoscope' | 'dermatoscope' | 'laryngoscope', deviceId?: string): Promise<StreamSession | null> {
    console.log('[MedicalStreaming] Iniciando stream de exame:', type, { deviceId });

    try {
      // IMPORTANTE: Usa exact para forçar a câmera específica selecionada
      // ideal não funciona bem - navegador ignora e usa câmera padrão
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
        frameRate: { ideal: 30, min: 15 }
      };

      // Força câmera específica com exact (não ideal!)
      if (deviceId && deviceId !== 'default' && deviceId !== '') {
        videoConstraints.deviceId = { exact: deviceId };
        console.log('[MedicalStreaming] Forçando câmera específica:', deviceId);
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: videoConstraints
      };

      console.log('[MedicalStreaming] Solicitando getUserMedia com constraints:', JSON.stringify(constraints));
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[MedicalStreaming] Stream de vídeo obtido com tracks:', stream.getVideoTracks().length);

      // Log info do track obtido
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('[MedicalStreaming] Video track settings:', {
          deviceId: settings.deviceId,
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          label: videoTrack.label
        });
      }

      const session: StreamSession = {
        id: this.generateSessionId(),
        type,
        stream,
        startedAt: new Date(),
        deviceId: deviceId || 'default'
      };

      this.activeSessions.set(session.id, session);
      this._activeStream$.next(session);

      console.log('[MedicalStreaming] Sessão de exame criada:', session.id);
      return session;

    } catch (error: any) {
      console.error('[MedicalStreaming] Erro ao iniciar exame:', error);
      console.error('[MedicalStreaming] Erro name:', error.name, 'message:', error.message);
      this._streamError$.next({ type, error: error.message });
      return null;
    }
  }

  /**
   * Inicia análise de áudio para visualização
   */
  private startAudioAnalysis(stream: MediaStream): void {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      source.connect(this.analyser);
      
      this.analyzeAudio();
    } catch (error) {
      console.error('[MedicalStreaming] Erro na análise de áudio:', error);
    }
  }

  /**
   * Loop de análise de áudio
   */
  private analyzeAudio(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!this.analyser) return;

      this.analyser.getFloatTimeDomainData(dataArray);
      this.analyser.getByteFrequencyData(frequencyData);

      // Calcula volume (RMS)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const volume = Math.sqrt(sum / dataArray.length);

      // Calcula frequência dominante
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxValue) {
          maxValue = frequencyData[i];
          maxIndex = i;
        }
      }
      const frequency = (maxIndex * this.audioContext!.sampleRate) / (this.analyser!.fftSize * 2);

      this.ngZone.run(() => {
        this._audioAnalysis$.next({
          volume: Math.min(volume * 10, 1), // Normalizado 0-1
          frequency: Math.round(frequency),
          waveform: dataArray.slice(0, 256) // Primeiros 256 samples para visualização
        });
      });

      this.animationFrameId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Para stream ativo
   */
  stopStream(sessionId?: string): void {
    if (sessionId) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.stream.getTracks().forEach(t => t.stop());
        this.activeSessions.delete(sessionId);
        console.log('[MedicalStreaming] Sessão encerrada:', sessionId);
      }
    } else {
      // Para todas as sessões
      this.activeSessions.forEach((session, id) => {
        session.stream.getTracks().forEach(t => t.stop());
        console.log('[MedicalStreaming] Sessão encerrada:', id);
      });
      this.activeSessions.clear();
    }

    // Para análise de áudio
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }

    this._activeStream$.next(null);
  }

  /**
   * Retorna stream ativo
   */
  getActiveStream(): MediaStream | null {
    const session = this._activeStream$.value;
    return session?.stream || null;
  }

  /**
   * Retorna sessão ativa
   */
  getActiveSession(): StreamSession | null {
    return this._activeStream$.value;
  }

  /**
   * Grava o stream atual
   */
  async startRecording(): Promise<MediaRecorder | null> {
    const stream = this.getActiveStream();
    if (!stream) {
      console.warn('[MedicalStreaming] Nenhum stream ativo para gravar');
      return null;
    }

    try {
      const mimeType = stream.getVideoTracks().length > 0 
        ? 'video/webm;codecs=vp9'
        : 'audio/webm;codecs=opus';

      const recorder = new MediaRecorder(stream, { mimeType });
      console.log('[MedicalStreaming] Gravação iniciada');
      return recorder;
    } catch (error) {
      console.error('[MedicalStreaming] Erro ao iniciar gravação:', error);
      return null;
    }
  }

  /**
   * Captura screenshot do stream de vídeo
   */
  captureFrame(videoElement: HTMLVideoElement): string | null {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoElement, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      console.error('[MedicalStreaming] Erro ao capturar frame:', error);
      return null;
    }
  }

  /**
   * Gera ID único para sessão
   */
  private generateSessionId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopStream();
  }
}
