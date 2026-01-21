import { Injectable, Inject, PLATFORM_ID, NgZone, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { MedicalDevicesSyncService } from './medical-devices-sync.service';

/**
 * Serviço de streaming de áudio PCM de baixa latência
 * Otimizado para fonocardiograma (estetoscópio digital)
 * 
 * Características:
 * - Captura PCM raw a 44100Hz mono
 * - Filtro passa-baixa para sons cardíacos (20-600Hz)
 * - Transmite chunks de 50ms via SignalR
 * - Visualização em tempo real (waveform)
 * - Latência típica: 50-100ms
 */

export interface PcmAudioChunk {
  samples: Float32Array;  // Amostras PCM normalizadas -1 a 1
  timestamp: number;      // Timestamp em ms
  sampleRate: number;     // Taxa de amostragem
  duration: number;       // Duração em ms
}

export interface WaveformData {
  peaks: number[];        // Picos para visualização
  volume: number;         // Volume RMS (0-1)
  frequency: number;      // Frequência dominante
  heartRate?: number;     // BPM estimado (se detectado)
}

export interface PcmStreamConfig {
  deviceId?: string;
  sampleRate?: number;           // Default: 44100
  chunkDuration?: number;        // Default: 50ms
  enableCardiacFilter?: boolean; // Default: true
  enableVisualization?: boolean; // Default: true
}

@Injectable({
  providedIn: 'root'
})
export class PcmAudioStreamingService implements OnDestroy {
  private isBrowser: boolean;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private stream: MediaStream | null = null;
  private appointmentId: string | null = null;
  private signalRSubscription?: Subscription;
  
  // Configuração
  private config: Required<PcmStreamConfig> = {
    deviceId: 'default',
    sampleRate: 44100,
    chunkDuration: 50,
    enableCardiacFilter: true,
    enableVisualization: true
  };
  
  // Buffer para detecção de batimentos
  private beatDetectionBuffer: number[] = [];
  private lastBeatTime = 0;
  private beatIntervals: number[] = [];
  
  // Playback no lado do receptor
  private playbackContext: AudioContext | null = null;
  private playbackBuffer: Float32Array[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;

  // Estado reativo
  private _isStreaming$ = new BehaviorSubject<boolean>(false);
  public isStreaming$ = this._isStreaming$.asObservable();

  private _isReceiving$ = new BehaviorSubject<boolean>(false);
  public isReceiving$ = this._isReceiving$.asObservable();

  private _waveformData$ = new Subject<WaveformData>();
  public waveformData$ = this._waveformData$.asObservable();

  private _receivedWaveform$ = new Subject<WaveformData>();
  public receivedWaveform$ = this._receivedWaveform$.asObservable();

  private _estimatedHeartRate$ = new BehaviorSubject<number | null>(null);
  public estimatedHeartRate$ = this._estimatedHeartRate$.asObservable();

  private _latency$ = new BehaviorSubject<number>(0);
  public latency$ = this._latency$.asObservable();

  private _error$ = new Subject<string>();
  public error$ = this._error$.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private medicalDevicesSync: MedicalDevicesSyncService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.setupSignalRListeners();
    }
  }

  /**
   * Configura listeners SignalR para receber áudio
   */
  private setupSignalRListeners(): void {
    // Listener para chunks de áudio recebidos
    this.signalRSubscription = this.medicalDevicesSync.audioChunkReceived$.subscribe(
      (data: any) => {
        if (data && data.samples) {
          this.handleReceivedAudioChunk(data);
        }
      }
    );
  }

  /**
   * Inicia streaming de áudio PCM
   */
  async startStreaming(appointmentId: string, config?: PcmStreamConfig): Promise<boolean> {
    if (!this.isBrowser) return false;
    
    console.log('[PCM-Audio] Iniciando streaming para sala:', appointmentId);
    
    this.appointmentId = appointmentId;
    this.config = { ...this.config, ...config };
    
    try {
      // Captura áudio do microfone (estetoscópio)
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.config.deviceId !== 'default' ? { exact: this.config.deviceId } : undefined,
          echoCancellation: false,      // Importante: não queremos cancelamento de eco
          noiseSuppression: false,      // Não queremos supressão de ruído
          autoGainControl: false,       // Ganho manual para consistência
          sampleRate: this.config.sampleRate,
          channelCount: 1               // Mono é suficiente
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Cria contexto de áudio
      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      
      // Filtro passa-baixa para sons cardíacos (corta acima de 600Hz)
      if (this.config.enableCardiacFilter) {
        this.filterNode = this.audioContext.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 600;  // Sons cardíacos: 20-600Hz
        this.filterNode.Q.value = 0.7;
      }
      
      // Processador para captura de samples
      const bufferSize = Math.floor(this.config.sampleRate * this.config.chunkDuration / 1000);
      // Arredonda para potência de 2
      const actualBufferSize = Math.pow(2, Math.ceil(Math.log2(bufferSize)));
      
      this.processorNode = this.audioContext.createScriptProcessor(actualBufferSize, 1, 1);
      
      this.processorNode.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        this.processAudioChunk(inputData, event.inputBuffer.sampleRate);
      };
      
      // Conecta os nós
      if (this.filterNode) {
        this.sourceNode.connect(this.filterNode);
        this.filterNode.connect(this.processorNode);
      } else {
        this.sourceNode.connect(this.processorNode);
      }
      this.processorNode.connect(this.audioContext.destination);
      
      this._isStreaming$.next(true);
      console.log('[PCM-Audio] Streaming iniciado com sucesso');
      
      return true;
      
    } catch (error: any) {
      console.error('[PCM-Audio] Erro ao iniciar streaming:', error);
      this._error$.next(error.message || 'Erro ao acessar microfone');
      return false;
    }
  }

  /**
   * Processa chunk de áudio e envia via SignalR
   */
  private processAudioChunk(samples: Float32Array, sampleRate: number): void {
    const timestamp = Date.now();
    
    // Calcula waveform para visualização
    const waveformData = this.calculateWaveform(samples);
    
    // Detecta batimentos cardíacos
    this.detectHeartbeat(waveformData.volume, timestamp);
    
    // Emite dados de visualização localmente
    this.ngZone.run(() => {
      this._waveformData$.next(waveformData);
    });
    
    // Prepara dados para envio (comprime para base64)
    const chunk: PcmAudioChunk = {
      samples,
      timestamp,
      sampleRate,
      duration: (samples.length / sampleRate) * 1000
    };
    
    // Envia via SignalR
    this.sendAudioChunk(chunk);
  }

  /**
   * Calcula dados de visualização do áudio
   */
  private calculateWaveform(samples: Float32Array): WaveformData {
    // Calcula volume RMS
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const volume = Math.sqrt(sum / samples.length);
    
    // Calcula picos para visualização (downsample para ~64 pontos)
    const peakCount = 64;
    const samplesPerPeak = Math.floor(samples.length / peakCount);
    const peaks: number[] = [];
    
    for (let i = 0; i < peakCount; i++) {
      let max = 0;
      for (let j = 0; j < samplesPerPeak; j++) {
        const idx = i * samplesPerPeak + j;
        if (idx < samples.length) {
          max = Math.max(max, Math.abs(samples[idx]));
        }
      }
      peaks.push(max);
    }
    
    // Estima frequência dominante usando zero-crossing
    let zeroCrossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || 
          (samples[i] < 0 && samples[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const frequency = (zeroCrossings * this.config.sampleRate) / (2 * samples.length);
    
    return {
      peaks,
      volume: Math.min(volume * 5, 1), // Normalizado e amplificado
      frequency: Math.round(frequency),
      heartRate: this._estimatedHeartRate$.value ?? undefined
    };
  }

  /**
   * Detecta batimentos cardíacos por análise de picos
   */
  private detectHeartbeat(volume: number, timestamp: number): void {
    // Adiciona ao buffer de detecção
    this.beatDetectionBuffer.push(volume);
    
    // Mantém últimos 2 segundos
    const maxSamples = Math.floor(2000 / this.config.chunkDuration);
    if (this.beatDetectionBuffer.length > maxSamples) {
      this.beatDetectionBuffer.shift();
    }
    
    // Calcula média e threshold
    const avg = this.beatDetectionBuffer.reduce((a, b) => a + b, 0) / this.beatDetectionBuffer.length;
    const threshold = avg * 1.5;
    
    // Detecta pico (volume acima do threshold)
    if (volume > threshold && (timestamp - this.lastBeatTime) > 400) {  // Mínimo 400ms entre batimentos (150 BPM max)
      if (this.lastBeatTime > 0) {
        const interval = timestamp - this.lastBeatTime;
        this.beatIntervals.push(interval);
        
        // Mantém últimos 10 intervalos
        if (this.beatIntervals.length > 10) {
          this.beatIntervals.shift();
        }
        
        // Calcula BPM médio
        if (this.beatIntervals.length >= 3) {
          const avgInterval = this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length;
          const bpm = Math.round(60000 / avgInterval);
          
          // Valida range normal (40-200 BPM)
          if (bpm >= 40 && bpm <= 200) {
            this.ngZone.run(() => {
              this._estimatedHeartRate$.next(bpm);
            });
          }
        }
      }
      this.lastBeatTime = timestamp;
    }
  }

  /**
   * Envia chunk de áudio via SignalR
   */
  private sendAudioChunk(chunk: PcmAudioChunk): void {
    if (!this.appointmentId) return;
    
    // Converte Float32Array para array regular para serialização
    const samplesArray = Array.from(chunk.samples);
    
    // Envia via SignalR (método será adicionado ao hub)
    this.medicalDevicesSync.sendAudioChunk(this.appointmentId, {
      samples: samplesArray,
      timestamp: chunk.timestamp,
      sampleRate: chunk.sampleRate,
      duration: chunk.duration
    });
  }

  /**
   * Processa chunk de áudio recebido
   */
  private handleReceivedAudioChunk(data: any): void {
    if (!this.isBrowser) return;
    
    const receivedTime = Date.now();
    const latency = receivedTime - data.timestamp;
    
    this.ngZone.run(() => {
      this._latency$.next(latency);
      this._isReceiving$.next(true);
    });
    
    // Reconstrói Float32Array
    const samples = new Float32Array(data.samples);
    
    // Calcula waveform para visualização
    const waveformData = this.calculateWaveform(samples);
    
    this.ngZone.run(() => {
      this._receivedWaveform$.next(waveformData);
    });
    
    // Reproduz áudio
    this.playAudioChunk(samples, data.sampleRate);
  }

  /**
   * Reproduz chunk de áudio recebido
   */
  private playAudioChunk(samples: Float32Array, sampleRate: number): void {
    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate });
    }
    
    // Cria buffer de áudio
    const buffer = this.playbackContext.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    
    // Cria source node
    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);
    
    // Agenda reprodução
    const currentTime = this.playbackContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }
    
    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
  }

  /**
   * Para o streaming
   */
  stopStreaming(): void {
    console.log('[PCM-Audio] Parando streaming');
    
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    
    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    
    this.appointmentId = null;
    this.beatDetectionBuffer = [];
    this.beatIntervals = [];
    this.lastBeatTime = 0;
    
    this._isStreaming$.next(false);
    this._estimatedHeartRate$.next(null);
  }

  /**
   * Para recepção
   */
  stopReceiving(): void {
    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
    }
    
    this.playbackBuffer = [];
    this.nextPlayTime = 0;
    this._isReceiving$.next(false);
  }

  /**
   * Retorna dispositivos de áudio disponíveis
   */
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    if (!this.isBrowser) return [];
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }

  ngOnDestroy(): void {
    this.stopStreaming();
    this.stopReceiving();
    this.signalRSubscription?.unsubscribe();
  }
}
