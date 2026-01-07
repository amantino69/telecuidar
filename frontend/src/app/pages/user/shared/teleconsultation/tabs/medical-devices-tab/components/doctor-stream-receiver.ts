import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { IconComponent, IconName } from '@shared/components/atoms/icon/icon';
import { MedicalDevicesSyncService } from '@app/core/services/medical-devices-sync.service';

@Component({
  selector: 'app-doctor-stream-receiver',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="doctor-stream-receiver">
      <div class="panel-header">
        <h4>
          <app-icon [name]="streamType === 'auscultation' ? 'mic' : 'video'" [size]="20" />
          {{ getStreamTitle() }}
        </h4>
        <span class="stream-status" [class.active]="hasActiveStream">
          {{ hasActiveStream ? 'Recebendo' : 'Aguardando' }}
        </span>
      </div>

      @if (!hasActiveStream) {
        <div class="waiting-state">
          <div class="waiting-icon">
            <app-icon name="cast" [size]="48" />
          </div>
          <h5>Aguardando transmissão...</h5>
          <p>O paciente iniciará o streaming de {{ streamType === 'auscultation' ? 'ausculta' : 'exame visual' }}</p>
        </div>
      } @else {
        <div class="stream-container">
          <!-- Para ausculta (áudio) -->
          @if (streamType === 'auscultation') {
            <div class="audio-receiver">
              <audio #audioElement autoplay></audio>
              
              @if (needsUserInteraction) {
                <div class="play-prompt" (click)="enableAudio()">
                  <app-icon name="volume-2" [size]="32" />
                  <span>Clique para ativar o áudio</span>
                </div>
              }

              <div class="audio-visual">
                <canvas #audioCanvas class="audio-canvas"></canvas>
              </div>

              <div class="auscultation-info">
                <div class="area-badge">
                  <app-icon [name]="getAreaIcon()" [size]="18" />
                  {{ getAreaLabel() }}
                </div>
              </div>

              <div class="audio-controls">
                <button class="ctrl-btn" (click)="toggleMute()">
                  <app-icon [name]="isMuted ? 'volume-x' : 'volume-2'" [size]="20" />
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  [value]="volume"
                  (input)="onVolumeChange($event)"
                  class="volume-slider" />
              </div>
            </div>
          }

          <!-- Para vídeo (câmera de exame) -->
          @if (streamType === 'video') {
            <div class="video-receiver">
              <video #videoElement autoplay playsinline></video>
              
              <div class="video-controls">
                <button class="ctrl-btn" (click)="toggleFullscreen()">
                  <app-icon [name]="isFullscreen ? 'minimize' : 'maximize'" [size]="18" />
                </button>
                <button class="ctrl-btn" (click)="captureFrame()">
                  <app-icon name="camera" [size]="18" />
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Capturas -->
        @if (captures.length > 0) {
          <div class="captures-section">
            <h5>Capturas do Exame</h5>
            <div class="captures-grid">
              @for (capture of captures; track capture.id) {
                <div class="capture-item">
                  <img [src]="capture.dataUrl" alt="Captura" />
                  <div class="capture-actions">
                    <button (click)="downloadCapture(capture)">
                      <app-icon name="download" [size]="12" />
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .doctor-stream-receiver {
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .stream-status {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 12px;
        background: var(--bg-secondary);
        color: var(--text-secondary);

        &.active {
          background: var(--bg-success);
          color: var(--text-success);
          animation: pulse 2s infinite;
        }
      }
    }

    .waiting-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;

      .waiting-icon {
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-secondary);
        border-radius: 50%;
        margin-bottom: 16px;
        color: var(--text-secondary);
        animation: waiting-pulse 2s infinite;
      }

      h5 {
        margin: 0 0 8px 0;
        font-size: 16px;
        color: var(--text-primary);
      }

      p {
        margin: 0;
        font-size: 13px;
        color: var(--text-secondary);
        max-width: 280px;
      }
    }

    .stream-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .audio-receiver {
      display: flex;
      flex-direction: column;
      gap: 16px;

      audio {
        display: none;
      }

      .play-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 24px 32px;
        background: var(--bg-primary-subtle);
        border: 2px solid var(--color-primary);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--color-primary);
        font-weight: 500;
        margin-bottom: 16px;

        &:hover {
          background: var(--color-primary);
          color: white;
          transform: scale(1.02);
        }
      }

      .audio-visual {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 16px;
        padding: 24px;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;

        .audio-canvas {
          width: 100%;
          height: 150px;
        }
      }

      .auscultation-info {
        display: flex;
        justify-content: center;

        .area-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--bg-primary-subtle);
          color: var(--color-primary);
          border-radius: 24px;
          font-size: 14px;
          font-weight: 500;
        }
      }

      .audio-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 16px;
        background: var(--bg-secondary);
        border-radius: 12px;

        .ctrl-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: none;
          border-radius: 50%;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: var(--color-primary);
            color: white;
          }
        }

        .volume-slider {
          width: 120px;
          height: 6px;
          appearance: none;
          background: var(--bg-tertiary);
          border-radius: 3px;
          cursor: pointer;

          &::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: var(--color-primary);
            border-radius: 50%;
          }
        }
      }
    }

    .video-receiver {
      position: relative;
      flex: 1;
      background: #000;
      border-radius: 16px;
      overflow: hidden;

      video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .video-controls {
        position: absolute;
        bottom: 16px;
        right: 16px;
        display: flex;
        gap: 8px;

        .ctrl-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;

          &:hover {
            background: var(--color-primary);
          }
        }
      }
    }

    .captures-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);

      h5 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: var(--text-primary);
      }

      .captures-grid {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .capture-item {
        position: relative;
        width: 80px;
        height: 60px;
        border-radius: 8px;
        overflow: hidden;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .capture-actions {
          position: absolute;
          top: 4px;
          right: 4px;

          button {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
          }
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @keyframes waiting-pulse {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }
  `]
})
export class DoctorStreamReceiverComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';

  @ViewChild('audioElement') audioElement!: ElementRef<HTMLAudioElement>;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('audioCanvas') audioCanvas!: ElementRef<HTMLCanvasElement>;

  hasActiveStream = false;
  streamType: 'auscultation' | 'video' | null = null;
  streamArea: string | null = null;
  
  isMuted = false;
  volume = 1;
  isFullscreen = false;
  needsUserInteraction = false;
  private pendingStream: MediaStream | null = null;

  captures: Array<{ id: string; dataUrl: string }> = [];

  private subscriptions = new Subscription();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  constructor(private syncService: MedicalDevicesSyncService) {}

  ngOnInit(): void {
    // Conecta ao hub
    if (this.appointmentId) {
      this.syncService.connect(this.appointmentId);
    }

    // Observa stream remoto
    this.subscriptions.add(
      this.syncService.remoteStream$.subscribe(stream => {
        this.handleRemoteStream(stream);
      })
    );

    // Observa tipo de stream
    this.subscriptions.add(
      this.syncService.streamType$.subscribe(type => {
        this.streamType = type;
      })
    );

    // Observa área (para ausculta)
    this.subscriptions.add(
      this.syncService.streamArea$.subscribe(area => {
        this.streamArea = area;
      })
    );
  }

  ngAfterViewInit(): void {
    // Inicializa canvas de áudio quando disponível
    this.initCanvasIfNeeded();
  }

  private initCanvasIfNeeded(): void {
    if (this.audioCanvas?.nativeElement) {
      const canvas = this.audioCanvas.nativeElement;
      // Define dimensões reais do canvas (não apenas CSS)
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio || 300;
      canvas.height = rect.height * window.devicePixelRatio || 150;
      console.log('[DoctorStreamReceiver] Canvas inicializado:', canvas.width, 'x', canvas.height);
    }
  }

  private handleRemoteStream(stream: MediaStream | null): void {
    console.log('[DoctorStreamReceiver] handleRemoteStream chamado:', {
      hasStream: !!stream,
      tracks: stream?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
    });

    this.hasActiveStream = !!stream;

    if (!stream) {
      this.stopAudioVisualization();
      return;
    }

    // Verifica se é áudio ou vídeo
    const hasVideo = stream.getVideoTracks().length > 0;
    const hasAudio = stream.getAudioTracks().length > 0;

    console.log('[DoctorStreamReceiver] Stream info:', { hasVideo, hasAudio });

    if (hasVideo && this.videoElement) {
      this.videoElement.nativeElement.srcObject = stream;
    }

    if (hasAudio) {
      // Aguarda o DOM atualizar para ter acesso aos elementos
      setTimeout(() => {
        this.setupAudioPlayback(stream);
      }, 100);
    }
  }

  private setupAudioPlayback(stream: MediaStream): void {
    console.log('[DoctorStreamReceiver] setupAudioPlayback - audioElement:', !!this.audioElement);
    
    if (!this.audioElement) {
      console.warn('[DoctorStreamReceiver] audioElement não disponível, tentando novamente...');
      setTimeout(() => this.setupAudioPlayback(stream), 200);
      return;
    }

    this.pendingStream = stream;
    const audio = this.audioElement.nativeElement;
    audio.srcObject = stream;
    audio.volume = this.volume;
    audio.muted = this.isMuted;

    // Tenta reproduzir (pode falhar por política de autoplay)
    audio.play()
      .then(() => {
        console.log('[DoctorStreamReceiver] Áudio reproduzindo');
        this.needsUserInteraction = false;
      })
      .catch(err => {
        console.warn('[DoctorStreamReceiver] Autoplay bloqueado, aguardando interação:', err.message);
        this.needsUserInteraction = true;
      });

    // Inicializa visualização após o DOM estar pronto
    setTimeout(() => {
      this.initCanvasIfNeeded();
      this.startAudioVisualization(stream);
    }, 100);
  }

  /**
   * Chamado quando o usuário clica para ativar o áudio (necessário em alguns navegadores)
   */
  enableAudio(): void {
    console.log('[DoctorStreamReceiver] enableAudio chamado');
    this.needsUserInteraction = false;

    if (this.audioElement) {
      const audio = this.audioElement.nativeElement;
      audio.play().catch(err => console.error('Erro ao reproduzir:', err));
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Se temos stream pendente, reinicia a visualização
    if (this.pendingStream) {
      this.startAudioVisualization(this.pendingStream);
    }
  }

  private startAudioVisualization(stream: MediaStream): void {
    console.log('[DoctorStreamReceiver] startAudioVisualization - canvas:', !!this.audioCanvas);
    
    if (!this.audioCanvas) {
      console.warn('[DoctorStreamReceiver] audioCanvas não disponível');
      return;
    }

    try {
      // Cria AudioContext
      this.audioContext = new AudioContext();
      
      // Resume se estiver suspenso (política de autoplay)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('[DoctorStreamReceiver] AudioContext resumido');
        });
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);
      // Não conectar ao destination para evitar feedback
      
      console.log('[DoctorStreamReceiver] Visualização de áudio configurada');
      this.drawAudioVisualization();
    } catch (error) {
      console.error('[DoctorStreamReceiver] Erro ao iniciar visualização:', error);
    }
  }

  private drawAudioVisualization(): void {
    if (!this.analyser || !this.audioCanvas) return;

    const canvas = this.audioCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Garante dimensões do canvas
    if (canvas.width === 0 || canvas.height === 0) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio || 300;
      canvas.height = rect.height * window.devicePixelRatio || 150;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.analyser) return;

      this.animationFrameId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);

      // Limpa com fundo semi-transparente para efeito de trail
      ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradiente verde para visualização
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#059669');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    console.log('[DoctorStreamReceiver] Iniciando loop de desenho');
    draw();
  }

  private stopAudioVisualization(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
  }

  getStreamTitle(): string {
    if (this.streamType === 'auscultation') {
      return 'Ausculta em Tempo Real';
    }
    return 'Exame Visual em Tempo Real';
  }

  getAreaIcon(): IconName {
    switch (this.streamArea) {
      case 'cardiac': return 'heart';
      case 'pulmonary': return 'wind';
      case 'abdominal': return 'circle';
      default: return 'mic';
    }
  }

  getAreaLabel(): string {
    switch (this.streamArea) {
      case 'cardiac': return 'Ausculta Cardíaca';
      case 'pulmonary': return 'Ausculta Pulmonar';
      case 'abdominal': return 'Ausculta Abdominal';
      default: return 'Ausculta';
    }
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.audioElement) {
      this.audioElement.nativeElement.muted = this.isMuted;
    }
  }

  onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.volume = parseFloat(input.value);
    if (this.audioElement) {
      this.audioElement.nativeElement.volume = this.volume;
    }
  }

  toggleFullscreen(): void {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    
    if (!document.fullscreenElement) {
      video.requestFullscreen();
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  captureFrame(): void {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    this.captures.push({
      id: `cap_${Date.now()}`,
      dataUrl
    });
  }

  downloadCapture(capture: { id: string; dataUrl: string }): void {
    const a = document.createElement('a');
    a.href = capture.dataUrl;
    a.download = `exame_${capture.id}.jpg`;
    a.click();
  }

  ngOnDestroy(): void {
    this.stopAudioVisualization();
    this.subscriptions.unsubscribe();
  }
}
