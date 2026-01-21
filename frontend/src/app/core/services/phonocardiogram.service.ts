import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject } from 'rxjs';
import { TeleconsultationRealTimeService } from './teleconsultation-realtime.service';

/**
 * Frame de dados do fonocardiograma
 * Estrutura compacta (~200 bytes) para transmissão em tempo real
 */
export interface PhonocardiogramFrame {
  timestamp: number;
  waveform: number[];      // Forma de onda filtrada (20-200Hz) - 64 pontos
  heartRate: number;       // BPM estimado
  s1Amplitude: number;     // Amplitude do S1 (primeiro som cardíaco)
  s2Amplitude: number;     // Amplitude do S2 (segundo som cardíaco)
}

/**
 * Serviço de Fonocardiograma em Tempo Real
 * 
 * Captura áudio do microfone do paciente, filtra na faixa cardíaca (20-200Hz),
 * processa para detectar batimentos e envia apenas os dados do traçado
 * via SignalR para o médico visualizar em tempo real.
 * 
 * Vantagens:
 * - Transmite ~3KB/s vs ~176KB/s de áudio bruto
 * - Latência instantânea (~50-100ms)
 * - Processamento no cliente (não sobrecarrega servidor)
 */
@Injectable({
  providedIn: 'root'
})
export class PhonocardiogramService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isRecording = false;
  private animationFrameId: number | null = null;
  private consultaId: string | null = null;
  
  // Filtros para fonocardiograma (20-200Hz - faixa dos sons cardíacos)
  private lowPassFilter: BiquadFilterNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  
  // Buffer para detecção de batimentos
  private lastPeakTime = 0;
  private heartRates: number[] = [];
  
  // Controle de taxa de envio (10fps para SignalR - mais estável sobre rede)
  private lastSendTime = 0;
  private readonly SEND_INTERVAL = 100; // 10fps (era 33ms/30fps)
  private frameCount = 0;
  
  // Estados observáveis
  private _isCapturing$ = new BehaviorSubject<boolean>(false);
  public isCapturing$ = this._isCapturing$.asObservable();
  
  private _currentHeartRate$ = new BehaviorSubject<number>(0);
  public currentHeartRate$ = this._currentHeartRate$.asObservable();
  
  // Frames locais para preview
  public localFrame$ = new Subject<PhonocardiogramFrame>();
  
  // Frames recebidos do paciente (para o médico)
  public remoteFrame$ = new Subject<PhonocardiogramFrame>();

  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private realtimeService: TeleconsultationRealTimeService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Escutar frames recebidos via SignalR
    if (this.isBrowser) {
      this.setupSignalRListener();
    }
  }

  private setupSignalRListener(): void {
    // O TeleconsultationRealtimeService deve ter um método para escutar frames
    // Vamos adicionar um listener genérico
    this.realtimeService.onPhonocardiogramFrame((frame: PhonocardiogramFrame) => {
      this.remoteFrame$.next(frame);
    });
  }

  /**
   * Inicia a captura de áudio do microfone
   */
  async startCapture(consultaId: string, microphoneDeviceId?: string): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('Fonocardiograma só pode ser capturado no navegador');
    }

    if (this.isRecording) {
      console.warn('[Fono] Captura já está em andamento');
      return;
    }

    try {
      this.consultaId = consultaId;

      // Solicitar acesso ao microfone
      const constraints: MediaStreamConstraints = {
        audio: microphoneDeviceId 
          ? { deviceId: { exact: microphoneDeviceId } }
          : { 
              echoCancellation: false,  // Desativar para captura fiel
              noiseSuppression: false,
              autoGainControl: false
            }
      };
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Criar contexto de áudio com sample rate baixo (suficiente para sons cardíacos)
      this.audioContext = new AudioContext({ sampleRate: 4000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Criar filtros passa-banda (20-200Hz) - faixa dos sons cardíacos
      this.highPassFilter = this.audioContext.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.value = 20;
      this.highPassFilter.Q.value = 0.7;
      
      this.lowPassFilter = this.audioContext.createBiquadFilter();
      this.lowPassFilter.type = 'lowpass';
      this.lowPassFilter.frequency.value = 200;
      this.lowPassFilter.Q.value = 0.7;
      
      // Criar analisador
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;  // Resolução adequada para sons cardíacos
      this.analyser.smoothingTimeConstant = 0.3;
      
      // Conectar: source -> highpass -> lowpass -> analyser
      source.connect(this.highPassFilter);
      this.highPassFilter.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.analyser);
      
      this.isRecording = true;
      this._isCapturing$.next(true);
      
      console.log('[Fono] Captura iniciada para consulta:', consultaId);
      this.processAudio();
      
    } catch (error) {
      console.error('[Fono] Erro ao iniciar captura:', error);
      this._isCapturing$.next(false);
      throw error;
    }
  }

  /**
   * Processa o áudio continuamente e envia frames
   */
  private processAudio(): void {
    if (!this.isRecording || !this.analyser) return;

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    
    const process = () => {
      if (!this.isRecording || !this.analyser) return;
      
      // Obter dados de forma de onda
      this.analyser.getFloatTimeDomainData(dataArray);
      
      // Processar e criar frame
      const frame = this.createFrame(dataArray);
      
      // Emitir localmente para preview (60fps)
      this.localFrame$.next(frame);
      
      // Atualizar BPM
      this._currentHeartRate$.next(frame.heartRate);
      
      // Enviar via SignalR com rate limiting (30fps)
      const now = Date.now();
      if (this.consultaId && (now - this.lastSendTime) >= this.SEND_INTERVAL) {
        this.lastSendTime = now;
        this.frameCount++;
        
        // Log a cada 30 frames (~1 segundo)
        if (this.frameCount % 30 === 0) {
          console.log('[Fono] Enviando frame #' + this.frameCount + ' via SignalR');
        }
        
        this.sendFrame(this.consultaId, frame);
      }
      
      // Próximo frame (~60fps)
      this.animationFrameId = requestAnimationFrame(process);
    };
    
    process();
  }

  /**
   * Cria um frame de dados do fonocardiograma
   */
  private createFrame(dataArray: Float32Array): PhonocardiogramFrame {
    const now = Date.now();
    
    // 128 pontos para boa resolução (10fps × 128pts = 1280 pontos/s)
    const waveform = this.downsample(dataArray, 128);
    
    // Detectar picos (S1, S2)
    const { s1Amplitude, s2Amplitude } = this.detectHeartSounds(dataArray);
    
    // Calcular frequência cardíaca
    const heartRate = this.calculateHeartRate(dataArray, now);
    
    return {
      timestamp: now,
      waveform: Array.from(waveform.map(v => Math.round(v * 1000) / 1000)), // 3 casas decimais
      heartRate,
      s1Amplitude: Math.round(s1Amplitude * 100) / 100,
      s2Amplitude: Math.round(s2Amplitude * 100) / 100
    };
  }

  /**
   * Reduz a quantidade de pontos mantendo a forma da onda
   */
  private downsample(data: Float32Array, targetLength: number): Float32Array {
    const result = new Float32Array(targetLength);
    const step = data.length / targetLength;
    
    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += data[j];
      }
      result[i] = sum / (end - start);
    }
    
    return result;
  }

  /**
   * Detecta os sons cardíacos S1 e S2
   */
  private detectHeartSounds(data: Float32Array): { s1Amplitude: number, s2Amplitude: number } {
    // Encontrar os dois maiores picos (S1 e S2)
    let max1 = 0, max2 = 0;
    
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs(data[i]);
      if (val > max1) {
        max2 = max1;
        max1 = val;
      } else if (val > max2) {
        max2 = val;
      }
    }
    
    return { s1Amplitude: max1, s2Amplitude: max2 };
  }

  /**
   * Calcula a frequência cardíaca baseada nos intervalos entre picos
   */
  private calculateHeartRate(data: Float32Array, now: number): number {
    // Detectar pico atual
    const maxVal = Math.max(...Array.from(data).map(Math.abs));
    const threshold = 0.3;
    
    if (maxVal > threshold && now - this.lastPeakTime > 300) { // Mínimo 300ms entre batimentos (200bpm max)
      if (this.lastPeakTime > 0) {
        const interval = now - this.lastPeakTime;
        const bpm = Math.round(60000 / interval);
        
        if (bpm >= 40 && bpm <= 200) { // Faixa fisiológica
          this.heartRates.push(bpm);
          if (this.heartRates.length > 10) {
            this.heartRates.shift();
          }
        }
      }
      this.lastPeakTime = now;
    }
    
    // Média dos últimos batimentos
    if (this.heartRates.length > 0) {
      return Math.round(this.heartRates.reduce((a, b) => a + b, 0) / this.heartRates.length);
    }
    
    return 0;
  }

  /**
   * Envia frame via SignalR
   */
  private sendFrame(consultaId: string, frame: PhonocardiogramFrame): void {
    this.realtimeService.sendPhonocardiogramFrame(consultaId, frame);
  }

  /**
   * Para a captura de áudio
   */
  stopCapture(): void {
    this.isRecording = false;
    this._isCapturing$.next(false);
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.heartRates = [];
    this.lastPeakTime = 0;
    this.consultaId = null;
    
    console.log('[Fono] Captura parada');
  }

  /**
   * Lista microfones disponíveis
   */
  async getAvailableMicrophones(): Promise<MediaDeviceInfo[]> {
    if (!this.isBrowser) return [];
    
    try {
      // Solicitar permissão primeiro
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch (error) {
      console.error('[Fono] Erro ao listar microfones:', error);
      return [];
    }
  }
}
