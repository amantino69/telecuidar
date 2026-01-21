import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { JitsiService } from '@core/services/jitsi.service';

interface MediaDeviceOption {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

@Component({
  selector: 'app-device-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="device-settings-tab">
      <div class="panel-header">
        <h4>
          <app-icon name="settings" [size]="20" />
          Configurações de Dispositivos
        </h4>
      </div>

      <div class="settings-content">
        <!-- Status -->
        @if (isLoading) {
          <div class="loading-state">
            <app-icon name="loader" [size]="24" />
            <span>Carregando dispositivos...</span>
          </div>
        } @else if (errorMessage) {
          <div class="error-state">
            <app-icon name="alert-circle" [size]="24" />
            <span>{{ errorMessage }}</span>
            <button class="btn-retry" (click)="loadDevices()">
              <app-icon name="refresh-cw" [size]="16" />
              Tentar novamente
            </button>
          </div>
        } @else {
          <!-- Câmera -->
          <div class="device-section">
            <label class="device-label">
              <app-icon name="video" [size]="18" />
              Câmera
            </label>
            <select 
              class="device-select"
              [(ngModel)]="selectedVideoDevice"
              (ngModelChange)="onVideoDeviceChange($event)"
              [disabled]="videoDevices.length === 0">
              @if (videoDevices.length === 0) {
                <option value="">Nenhuma câmera encontrada</option>
              } @else {
                @for (device of videoDevices; track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              }
            </select>
            <div class="device-preview" *ngIf="selectedVideoDevice">
              <video #videoPreview autoplay muted playsinline class="preview-video"></video>
            </div>
          </div>

          <!-- Microfone -->
          <div class="device-section">
            <label class="device-label">
              <app-icon name="mic" [size]="18" />
              Microfone
            </label>
            <select 
              class="device-select"
              [(ngModel)]="selectedAudioInputDevice"
              (ngModelChange)="onAudioInputChange($event)"
              [disabled]="audioInputDevices.length === 0">
              @if (audioInputDevices.length === 0) {
                <option value="">Nenhum microfone encontrado</option>
              } @else {
                @for (device of audioInputDevices; track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              }
            </select>
            <!-- Indicador de nível de áudio -->
            <div class="audio-level-container">
              <div class="audio-level-bar" [style.width.%]="audioLevel"></div>
            </div>
            <span class="audio-level-hint">Fale algo para testar o microfone</span>
          </div>

          <!-- Alto-falante -->
          <div class="device-section">
            <label class="device-label">
              <app-icon name="volume-2" [size]="18" />
              Alto-falante
            </label>
            <select 
              class="device-select"
              [(ngModel)]="selectedAudioOutputDevice"
              (ngModelChange)="onAudioOutputChange($event)"
              [disabled]="audioOutputDevices.length === 0">
              @if (audioOutputDevices.length === 0) {
                <option value="">Padrão do sistema</option>
              } @else {
                @for (device of audioOutputDevices; track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              }
            </select>
            <button class="btn-test-speaker" (click)="testSpeaker()">
              <app-icon name="play" [size]="16" />
              Testar
            </button>
          </div>

          <!-- Botão de aplicar -->
          <div class="actions-section">
            <button class="btn-apply" (click)="applyToJitsi()" [disabled]="!hasChanges">
              <app-icon name="check" [size]="16" />
              Aplicar na Videochamada
            </button>
            <button class="btn-refresh" (click)="loadDevices()">
              <app-icon name="refresh-cw" [size]="16" />
              Atualizar Lista
            </button>
          </div>

          <!-- Dica -->
          <div class="hint-box">
            <app-icon name="info" [size]="16" />
            <span>As alterações serão aplicadas imediatamente na videochamada em andamento.</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .device-settings-tab {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);

      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .settings-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
    }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px 20px;
      text-align: center;
      color: var(--text-secondary);

      app-icon {
        opacity: 0.6;
      }
    }

    .error-state {
      color: var(--color-error);
    }

    .btn-retry {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 13px;

      &:hover {
        background: var(--bg-tertiary);
      }
    }

    .device-section {
      margin-bottom: 20px;
    }

    .device-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .device-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 13px;
      cursor: pointer;
      transition: border-color 0.2s;

      &:hover:not(:disabled) {
        border-color: var(--color-primary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .device-preview {
      margin-top: 12px;
      border-radius: 8px;
      overflow: hidden;
      background: #000;

      .preview-video {
        width: 100%;
        height: 120px;
        object-fit: cover;
      }
    }

    .audio-level-container {
      margin-top: 8px;
      height: 6px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      overflow: hidden;
    }

    .audio-level-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--color-success), var(--color-warning));
      border-radius: 3px;
      transition: width 0.1s;
    }

    .audio-level-hint {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .btn-test-speaker {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 6px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 12px;

      &:hover {
        background: var(--bg-tertiary);
      }
    }

    .actions-section {
      display: flex;
      gap: 10px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .btn-apply {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      background: var(--color-primary);
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;

      &:hover:not(:disabled) {
        background: var(--color-primary-dark);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-refresh {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 13px;
      cursor: pointer;

      &:hover {
        background: var(--bg-tertiary);
      }
    }

    .hint-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      background: var(--bg-info-subtle);
      color: var(--color-info);
      font-size: 12px;
      line-height: 1.4;

      app-icon {
        flex-shrink: 0;
        margin-top: 1px;
      }
    }
  `]
})
export class DeviceSettingsTabComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';

  videoDevices: MediaDeviceOption[] = [];
  audioInputDevices: MediaDeviceOption[] = [];
  audioOutputDevices: MediaDeviceOption[] = [];

  selectedVideoDevice = '';
  selectedAudioInputDevice = '';
  selectedAudioOutputDevice = '';

  initialVideoDevice = '';
  initialAudioInputDevice = '';
  initialAudioOutputDevice = '';

  audioLevel = 0;
  isLoading = true;
  errorMessage = '';

  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  constructor(private jitsiService: JitsiService) {}

  ngOnInit(): void {
    this.loadDevices();
  }

  ngOnDestroy(): void {
    this.stopAudioMonitor();
    this.stopVideoPreview();
  }

  get hasChanges(): boolean {
    return (
      this.selectedVideoDevice !== this.initialVideoDevice ||
      this.selectedAudioInputDevice !== this.initialAudioInputDevice ||
      this.selectedAudioOutputDevice !== this.initialAudioOutputDevice
    );
  }

  async loadDevices(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Solicitar permissão para acessar dispositivos
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();

      this.videoDevices = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Câmera ${i + 1}`,
          kind: d.kind as 'videoinput'
        }));

      this.audioInputDevices = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microfone ${i + 1}`,
          kind: d.kind as 'audioinput'
        }));

      this.audioOutputDevices = devices
        .filter(d => d.kind === 'audiooutput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Alto-falante ${i + 1}`,
          kind: d.kind as 'audiooutput'
        }));

      // Selecionar dispositivos padrão
      if (this.videoDevices.length > 0 && !this.selectedVideoDevice) {
        this.selectedVideoDevice = this.videoDevices[0].deviceId;
        this.initialVideoDevice = this.selectedVideoDevice;
      }

      if (this.audioInputDevices.length > 0 && !this.selectedAudioInputDevice) {
        this.selectedAudioInputDevice = this.audioInputDevices[0].deviceId;
        this.initialAudioInputDevice = this.selectedAudioInputDevice;
        this.startAudioMonitor();
      }

      if (this.audioOutputDevices.length > 0 && !this.selectedAudioOutputDevice) {
        this.selectedAudioOutputDevice = this.audioOutputDevices[0].deviceId;
        this.initialAudioOutputDevice = this.selectedAudioOutputDevice;
      }

    } catch (error: any) {
      console.error('[DeviceSettings] Erro ao carregar dispositivos:', error);
      if (error.name === 'NotAllowedError') {
        this.errorMessage = 'Permissão negada. Por favor, permita o acesso à câmera e microfone.';
      } else {
        this.errorMessage = 'Erro ao acessar dispositivos. Verifique as permissões do navegador.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  async onVideoDeviceChange(deviceId: string): Promise<void> {
    this.selectedVideoDevice = deviceId;
    // Preview será implementado futuramente
  }

  async onAudioInputChange(deviceId: string): Promise<void> {
    this.selectedAudioInputDevice = deviceId;
    this.stopAudioMonitor();
    this.startAudioMonitor();
  }

  onAudioOutputChange(deviceId: string): void {
    this.selectedAudioOutputDevice = deviceId;
  }

  private async startAudioMonitor(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: this.selectedAudioInputDevice }
      });

      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);

      this.monitorAudioLevel();
    } catch (error) {
      console.error('[DeviceSettings] Erro ao iniciar monitor de áudio:', error);
    }
  }

  private monitorAudioLevel(): void {
    if (!this.audioAnalyser) return;

    const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);

    const update = () => {
      if (!this.audioAnalyser) return;

      this.audioAnalyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      this.audioLevel = Math.min(100, (average / 128) * 100);

      this.animationFrameId = requestAnimationFrame(update);
    };

    update();
  }

  private stopAudioMonitor(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.audioLevel = 0;
  }

  private stopVideoPreview(): void {
    // Para futuro preview de vídeo
  }

  testSpeaker(): void {
    // Criar um tom de teste
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // Nota A4
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 500);
    } catch (error) {
      console.error('[DeviceSettings] Erro ao testar alto-falante:', error);
    }
  }

  applyToJitsi(): void {
    // Aplicar dispositivos selecionados ao Jitsi
    this.jitsiService.setVideoDevice(this.selectedVideoDevice);
    this.jitsiService.setAudioInputDevice(this.selectedAudioInputDevice);
    this.jitsiService.setAudioOutputDevice(this.selectedAudioOutputDevice);

    // Atualizar valores iniciais
    this.initialVideoDevice = this.selectedVideoDevice;
    this.initialAudioInputDevice = this.selectedAudioInputDevice;
    this.initialAudioOutputDevice = this.selectedAudioOutputDevice;

    console.log('[DeviceSettings] Dispositivos aplicados ao Jitsi');
  }
}
