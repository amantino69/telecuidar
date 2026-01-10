import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { IconComponent, IconName } from '@shared/components/atoms/icon/icon';
import { 
  MedicalStreamingService, 
  MediaDeviceInfo,
  StreamType 
} from '@app/core/services/medical-streaming.service';
import { MedicalDevicesSyncService } from '@app/core/services/medical-devices-sync.service';

type ExamType = 'otoscope' | 'dermatoscope' | 'laryngoscope';

@Component({
  selector: 'app-exam-camera-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="exam-camera-panel">
      <div class="panel-header">
        <h4>
          <app-icon name="video" [size]="20" />
          Câmera de Exame
        </h4>
        <span class="stream-status" [class.active]="isStreaming">
          {{ isStreaming ? 'Transmitindo' : 'Parado' }}
        </span>
      </div>

      <!-- Notificação de solicitação do médico -->
      @if (showDoctorRequest) {
        <div class="doctor-request-alert">
          <app-icon name="bell" [size]="18" />
          <span>{{ doctorRequestMessage }}</span>
          <button class="btn-dismiss" (click)="dismissDoctorRequest()">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }

      <!-- Tipo de exame -->
      <div class="exam-type-selector">
        <label>Tipo de Exame:</label>
        <div class="type-buttons">
          @for (type of examTypes; track type.id) {
            <button 
              class="type-btn"
              [class.active]="selectedType === type.id"
              (click)="selectType(type.id)"
              [disabled]="isStreaming">
              <app-icon [name]="type.icon" [size]="22" />
              <span>{{ type.label }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Seleção de câmera -->
      <div class="device-selector">
        <label>Câmera:</label>
        <select [(ngModel)]="selectedDeviceId" [disabled]="isStreaming">
          <option value="">Selecione a câmera</option>
          @for (device of videoDevices; track device.deviceId) {
            <option [value]="device.deviceId">{{ device.label }}</option>
          }
        </select>
        <button class="btn-refresh" (click)="refreshDevices()" [disabled]="isStreaming">
          <app-icon name="refresh-cw" [size]="16" />
        </button>
      </div>

      <!-- Preview de vídeo -->
      <div class="video-container" [class.active]="isStreaming">
        <video 
          #videoElement 
          autoplay 
          playsinline 
          muted
          [class.mirrored]="mirrorVideo">
        </video>
        
        @if (!isStreaming) {
          <div class="video-placeholder" (click)="startStream()">
            <app-icon [name]="getSelectedTypeIcon()" [size]="48" />
            <span>Clique aqui para iniciar</span>
            @if (!selectedDeviceId) {
              <small class="warning">Selecione uma câmera primeiro</small>
            }
          </div>
        }

        <!-- Controles sobre o vídeo -->
        @if (isStreaming) {
          <div class="video-controls">
            <button class="ctrl-btn" (click)="toggleMirror()" [title]="mirrorVideo ? 'Desfazer espelho' : 'Espelhar'">
              <app-icon name="flip-horizontal" [size]="18" />
            </button>
            <button class="ctrl-btn" (click)="capturePhoto()" title="Capturar foto">
              <app-icon name="camera" [size]="18" />
            </button>
            <button class="ctrl-btn" (click)="toggleZoom()" title="Zoom">
              <app-icon [name]="isZoomed ? 'zoom-out' : 'zoom-in'" [size]="18" />
            </button>
            <button class="ctrl-btn stop" (click)="stopStream()" title="Parar">
              <app-icon name="square" [size]="18" />
            </button>
          </div>
        }
      </div>

      <!-- Controles -->
      <div class="controls">
        @if (!isStreaming) {
          <button 
            class="btn-start" 
            [disabled]="!selectedDeviceId"
            (click)="startStream()">
            <app-icon name="play" [size]="20" />
            Iniciar Exame
          </button>
        } @else {
          <button class="btn-stop" (click)="stopStream()">
            <app-icon name="square" [size]="20" />
            Encerrar
          </button>
        }
      </div>

      <!-- Capturas salvas -->
      @if (captures.length > 0) {
        <div class="captures-section">
          <h5>
            <app-icon name="image" [size]="16" />
            Capturas ({{ captures.length }})
          </h5>
          <div class="captures-grid">
            @for (capture of captures; track capture.id) {
              <div class="capture-item">
                <img [src]="capture.dataUrl" [alt]="capture.type" />
                <div class="capture-overlay">
                  <button (click)="downloadCapture(capture)">
                    <app-icon name="download" [size]="14" />
                  </button>
                  <button (click)="deleteCapture(capture.id)">
                    <app-icon name="trash-2" [size]="14" />
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .exam-camera-panel {
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

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
        }
      }
    }

    .doctor-request-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08));
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      color: #3b82f6;
      font-size: 13px;
      animation: pulse-alert 2s infinite;

      span {
        flex: 1;
      }

      .btn-dismiss {
        background: transparent;
        border: none;
        color: #3b82f6;
        cursor: pointer;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;

        &:hover {
          opacity: 1;
        }
      }
    }

    @keyframes pulse-alert {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
      }
    }

    .exam-type-selector {
      label {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .type-buttons {
        display: flex;
        gap: 8px;
      }

      .type-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 14px 8px;
        background: var(--bg-secondary);
        border: 2px solid transparent;
        border-radius: 12px;
        font-size: 12px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        &.active {
          border-color: var(--color-primary);
          background: var(--bg-primary-subtle);
          color: var(--color-primary);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .device-selector {
      display: flex;
      align-items: flex-end;
      gap: 8px;

      label {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      select {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 14px;
      }

      .btn-refresh {
        padding: 10px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-secondary);
        cursor: pointer;

        &:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }
      }
    }

    .video-container {
      position: relative;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      min-height: 200px;

      video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: none;

        &.mirrored {
          transform: scaleX(-1);
        }
      }

      &.active video {
        display: block;
      }

      .video-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #888;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-primary);
        }
        
        span {
          font-size: 14px;
          font-weight: 500;
        }

        small.warning {
          font-size: 11px;
          color: var(--color-warning);
        }
      }

      .video-controls {
        position: absolute;
        bottom: 12px;
        right: 12px;
        display: flex;
        gap: 8px;

        .ctrl-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(0, 0, 0, 0.8);
          }

          &.stop {
            background: var(--color-error);
            
            &:hover {
              background: #dc2626;
            }
          }
        }
      }
    }

    .controls {
      display: flex;
      gap: 12px;

      button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 20px;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-start {
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-stop {
        background: var(--bg-danger);
        color: var(--text-danger);

        &:hover {
          background: var(--color-danger);
          color: white;
        }
      }
    }

    .captures-section {
      padding-top: 16px;
      border-top: 1px solid var(--border-color);

      h5 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 12px 0;
        font-size: 14px;
        color: var(--text-primary);
      }

      .captures-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
      }

      .capture-item {
        position: relative;
        aspect-ratio: 4 / 3;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .capture-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s ease;

          button {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border: none;
            border-radius: 6px;
            color: #333;
            cursor: pointer;

            &:hover {
              background: var(--color-primary);
              color: white;
            }
          }
        }

        &:hover .capture-overlay {
          opacity: 1;
        }
      }
    }
  `]
})
export class ExamCameraPanelComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';
  
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  examTypes: Array<{id: ExamType; label: string; icon: IconName}> = [
    { id: 'otoscope' as ExamType, label: 'Otoscópio', icon: 'ear' },
    { id: 'dermatoscope' as ExamType, label: 'Dermatoscópio', icon: 'scan' },
    { id: 'laryngoscope' as ExamType, label: 'Laringoscópio', icon: 'mic' }
  ];

  selectedType: ExamType = 'otoscope';
  selectedDeviceId: string = '';
  videoDevices: MediaDeviceInfo[] = [];
  
  isStreaming = false;
  mirrorVideo = false;
  isZoomed = false;
  
  // Solicitação do médico
  showDoctorRequest = false;
  doctorRequestMessage = '';

  captures: Array<{
    id: string;
    type: ExamType;
    dataUrl: string;
    timestamp: Date;
  }> = [];

  private subscriptions = new Subscription();

  constructor(
    private streamingService: MedicalStreamingService,
    private syncService: MedicalDevicesSyncService
  ) {}

  ngOnInit(): void {
    // Conecta ao hub SignalR para streaming
    if (this.appointmentId) {
      this.syncService.connect(this.appointmentId);
    }
    
    this.refreshDevices();

    // Observa dispositivos de vídeo
    this.subscriptions.add(
      this.streamingService.availableVideoDevices$.subscribe(devices => {
        this.videoDevices = devices;
        if (devices.length > 0 && !this.selectedDeviceId) {
          this.selectedDeviceId = devices[0].deviceId;
        }
      })
    );
    
    // Observa solicitações do médico para câmera de exame
    this.subscriptions.add(
      this.syncService.streamRequested$.subscribe(async request => {
        if (request && request.deviceType === 'video') {
          console.log('[ExamCamera] Médico solicitou câmera de exame');
          
          // Se já está transmitindo, reenvia a oferta automaticamente
          if (this.isStreaming) {
            console.log('[ExamCamera] Já transmitindo, reenviando oferta...');
            try {
              await this.syncService.resendCurrentStreamOffer();
              console.log('[ExamCamera] Oferta reenviada com sucesso');
            } catch (error) {
              console.error('[ExamCamera] Erro ao reenviar oferta:', error);
            }
          } else {
            // Se não está transmitindo, mostra notificação para o paciente
            this.showDoctorRequest = true;
            this.doctorRequestMessage = 'O médico está solicitando a câmera de exame. Por favor, inicie a transmissão.';
            
            // Remove notificação após 15 segundos
            setTimeout(() => {
              this.showDoctorRequest = false;
            }, 15000);
          }
        }
      })
    );
  }

  ngAfterViewInit(): void {
    // Canvas resize se necessário
  }

  refreshDevices(): void {
    this.streamingService.refreshDeviceList();
  }

  dismissDoctorRequest(): void {
    this.showDoctorRequest = false;
    this.doctorRequestMessage = '';
  }

  selectType(type: ExamType): void {
    this.selectedType = type;
  }

  getSelectedTypeIcon(): IconName {
    return this.examTypes.find(t => t.id === this.selectedType)?.icon || 'video';
  }

  async startStream(): Promise<void> {
    if (!this.selectedDeviceId) {
      console.warn('[ExamCamera] Nenhuma câmera selecionada');
      return;
    }

    console.log('[ExamCamera] Iniciando stream...', { 
      type: this.selectedType, 
      deviceId: this.selectedDeviceId,
      appointmentId: this.appointmentId
    });

    try {
      const session = await this.streamingService.startExamStream(
        this.selectedType,
        this.selectedDeviceId
      );

      if (session && this.videoElement) {
        console.log('[ExamCamera] Stream obtido, atribuindo ao video element');
        this.videoElement.nativeElement.srcObject = session.stream;
        this.isStreaming = true;

        // Se tem appointmentId, inicia streaming via WebRTC para o médico
        if (this.appointmentId) {
          await this.syncService.startStreaming(session.stream, 'video');
          console.log('[ExamCamera] Streaming para médico iniciado');
        }
      } else {
        console.error('[ExamCamera] Falha ao obter stream ou videoElement não disponível');
      }
    } catch (error: any) {
      console.error('[ExamCamera] Erro ao iniciar stream:', error);
    }
  }

  stopStream(): void {
    this.streamingService.stopStream();
    this.syncService.stopStreaming();
    
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    
    this.isStreaming = false;
  }

  toggleMirror(): void {
    this.mirrorVideo = !this.mirrorVideo;
  }

  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
    // Implementar zoom via CSS transform ou canvas
  }

  capturePhoto(): void {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const dataUrl = this.streamingService.captureFrame(video);
    
    if (dataUrl) {
      this.captures.push({
        id: `cap_${Date.now()}`,
        type: this.selectedType,
        dataUrl,
        timestamp: new Date()
      });
    }
  }

  downloadCapture(capture: { id: string; type: ExamType; dataUrl: string }): void {
    const a = document.createElement('a');
    a.href = capture.dataUrl;
    a.download = `exame_${capture.type}_${capture.id}.jpg`;
    a.click();
  }

  deleteCapture(id: string): void {
    this.captures = this.captures.filter(c => c.id !== id);
  }

  ngOnDestroy(): void {
    this.stopStream();
    this.subscriptions.unsubscribe();
  }
}
