import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { IconComponent, IconName } from '@shared/components/atoms/icon/icon';
import { MedicalStreamingService, MediaDeviceInfo } from '@app/core/services/medical-streaming.service';
import { MedicalDevicesSyncService } from '@app/core/services/medical-devices-sync.service';

type ExamType = 'otoscope' | 'dermatoscope' | 'laryngoscope';

interface ExamTypeOption {
  id: ExamType;
  label: string;
  icon: IconName;
  description: string;
}

interface CapturedImage {
  id: string;
  dataUrl: string;
  type: ExamType;
  timestamp: Date;
}

@Component({
  selector: 'app-exam-camera-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="exam-camera-panel">
      <!-- Header -->
      <div class="panel-header">
        <h4>
          <app-icon name="video" [size]="20" />
          Câmera de Exame
        </h4>
        <span class="status-badge" [class]="getStatusClass()">
          <span class="status-dot"></span>
          {{ getStatusText() }}
        </span>
      </div>

      <!-- Seletor de tipo de exame -->
      <div class="exam-type-section">
        <label>Tipo de Exame:</label>
        <div class="exam-type-grid">
          @for (examType of examTypes; track examType.id) {
            <button 
              class="exam-type-btn"
              [class.active]="selectedType === examType.id"
              [class.disabled]="isStreaming"
              (click)="selectExamType(examType.id)"
              [disabled]="isStreaming"
              [title]="examType.description">
              <app-icon [name]="examType.icon" [size]="24" />
              <span>{{ examType.label }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Seletor de câmera -->
      <div class="camera-selector">
        <label>Câmera:</label>
        <div class="selector-row">
          <select 
            [(ngModel)]="selectedCameraId" 
            [disabled]="isStreaming"
            class="camera-select">
            <option value="">Selecione uma câmera</option>
            @for (camera of availableCameras; track camera.deviceId) {
              <option [value]="camera.deviceId">{{ camera.label }}</option>
            }
          </select>
          <button 
            class="btn-icon" 
            (click)="refreshCameras()" 
            [disabled]="isStreaming"
            title="Atualizar lista de câmeras">
            <app-icon name="refresh-cw" [size]="18" />
          </button>
        </div>
      </div>

      <!-- Preview de vídeo -->
      <div class="video-section">
        <div class="video-container" [class.streaming]="isStreaming">
          <video 
            #videoPreview 
            autoplay 
            playsinline 
            muted
            [class.mirror]="mirrorEnabled">
          </video>
          
          @if (!isStreaming) {
            <div class="video-overlay" (click)="startCamera()">
              <app-icon [name]="getExamTypeIcon()" [size]="48" />
              <p>Clique para iniciar a câmera</p>
              @if (!selectedCameraId) {
                <small class="warning-text">Selecione uma câmera primeiro</small>
              }
            </div>
          }
          
          <!-- Controles flutuantes -->
          @if (isStreaming) {
            <div class="floating-controls">
              <button 
                class="ctrl-btn" 
                (click)="toggleMirror()" 
                [class.active]="mirrorEnabled"
                title="Espelhar imagem">
                <app-icon name="flip-horizontal" [size]="18" />
              </button>
              <button 
                class="ctrl-btn capture" 
                (click)="captureImage()" 
                title="Capturar imagem">
                <app-icon name="camera" [size]="18" />
              </button>
              <button 
                class="ctrl-btn stop" 
                (click)="stopCamera()" 
                title="Parar câmera">
                <app-icon name="square" [size]="18" />
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Botões de ação -->
      <div class="action-buttons">
        @if (!isStreaming) {
          <button 
            class="btn-primary"
            [disabled]="!selectedCameraId"
            (click)="startCamera()">
            <app-icon name="play" [size]="18" />
            Iniciar Transmissão
          </button>
        } @else {
          <button class="btn-danger" (click)="stopCamera()">
            <app-icon name="square" [size]="18" />
            Encerrar
          </button>
        }
      </div>

      <!-- Galeria de capturas -->
      @if (capturedImages.length > 0) {
        <div class="captures-gallery">
          <div class="gallery-header">
            <h5>
              <app-icon name="image" [size]="16" />
              Capturas ({{ capturedImages.length }})
            </h5>
            <button class="btn-text" (click)="clearAllCaptures()">Limpar todas</button>
          </div>
          <div class="gallery-grid">
            @for (img of capturedImages; track img.id) {
              <div class="gallery-item">
                <img [src]="img.dataUrl" [alt]="img.type" />
                <div class="item-overlay">
                  <button (click)="downloadImage(img)" title="Baixar">
                    <app-icon name="download" [size]="14" />
                  </button>
                  <button (click)="removeCapture(img.id)" title="Remover">
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

      .status-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 12px;
        background: var(--bg-secondary);
        color: var(--text-secondary);

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        &.ready {
          color: var(--color-warning);
        }

        &.streaming {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;

          .status-dot {
            animation: pulse 1.5s infinite;
          }
        }

        &.error {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .exam-type-section {
      label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .exam-type-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .exam-type-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px 8px;
        background: var(--bg-secondary);
        border: 2px solid transparent;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(.disabled) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        &.active {
          border-color: var(--color-primary);
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-primary);
        }

        &.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .camera-selector {
      label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .selector-row {
        display: flex;
        gap: 8px;
      }

      .camera-select {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 13px;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .btn-icon {
        padding: 10px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .video-section {
      flex: 1;
      min-height: 200px;

      .video-container {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 200px;
        background: #1a1a1a;
        border-radius: 12px;
        overflow: hidden;

        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: none;

          &.mirror {
            transform: scaleX(-1);
          }
        }

        &.streaming video {
          display: block;
        }

        .video-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            color: var(--color-primary);
            background: rgba(255, 255, 255, 0.02);
          }

          p {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
          }

          .warning-text {
            font-size: 11px;
            color: var(--color-warning);
          }
        }

        .floating-controls {
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
            backdrop-filter: blur(4px);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              background: rgba(0, 0, 0, 0.8);
            }

            &.active {
              background: var(--color-primary);
            }

            &.capture {
              background: var(--color-primary);

              &:hover {
                background: #2563eb;
              }
            }

            &.stop {
              background: #ef4444;

              &:hover {
                background: #dc2626;
              }
            }
          }
        }
      }
    }

    .action-buttons {
      button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-primary {
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background: #2563eb;
        }
      }

      .btn-danger {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;

        &:hover {
          background: #ef4444;
          color: white;
        }
      }
    }

    .captures-gallery {
      border-top: 1px solid var(--border-color);
      padding-top: 16px;

      .gallery-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h5 {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .btn-text {
          background: none;
          border: none;
          color: var(--color-primary);
          font-size: 12px;
          cursor: pointer;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 8px;
      }

      .gallery-item {
        position: relative;
        aspect-ratio: 4/3;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s;

          button {
            width: 28px;
            height: 28px;
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

        &:hover .item-overlay {
          opacity: 1;
        }
      }
    }
  `]
})
export class ExamCameraPanelComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';

  @ViewChild('videoPreview') videoPreview!: ElementRef<HTMLVideoElement>;

  // Tipos de exame disponíveis
  examTypes: ExamTypeOption[] = [
    { id: 'otoscope', label: 'Otoscópio', icon: 'ear', description: 'Exame do canal auditivo' },
    { id: 'dermatoscope', label: 'Dermatoscópio', icon: 'scan', description: 'Exame dermatológico' },
    { id: 'laryngoscope', label: 'Laringoscópio', icon: 'mic', description: 'Exame da laringe' }
  ];

  // Estado
  selectedType: ExamType = 'otoscope';
  selectedCameraId = '';
  availableCameras: MediaDeviceInfo[] = [];
  isStreaming = false;
  mirrorEnabled = false;
  capturedImages: CapturedImage[] = [];
  errorMessage = '';

  private subscriptions = new Subscription();
  private currentStream: MediaStream | null = null;

  constructor(
    private streamingService: MedicalStreamingService,
    private syncService: MedicalDevicesSyncService
  ) {}

  ngOnInit(): void {
    // Carrega câmeras disponíveis
    this.refreshCameras();

    // Observa mudanças na lista de câmeras
    this.subscriptions.add(
      this.streamingService.availableVideoDevices$.subscribe(cameras => {
        this.availableCameras = cameras;
        // Auto-seleciona primeira câmera se nenhuma selecionada
        if (!this.selectedCameraId && cameras.length > 0) {
          this.selectedCameraId = cameras[0].deviceId;
        }
      })
    );
  }

  ngAfterViewInit(): void {
    // Componente pronto
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.subscriptions.unsubscribe();
  }

  // === Métodos de UI ===

  getStatusClass(): string {
    if (this.errorMessage) return 'error';
    if (this.isStreaming) return 'streaming';
    if (this.selectedCameraId) return 'ready';
    return '';
  }

  getStatusText(): string {
    if (this.errorMessage) return 'Erro';
    if (this.isStreaming) return 'Transmitindo';
    if (this.selectedCameraId) return 'Pronto';
    return 'Aguardando';
  }

  getExamTypeIcon(): IconName {
    const type = this.examTypes.find(t => t.id === this.selectedType);
    return type?.icon || 'video';
  }

  selectExamType(type: ExamType): void {
    if (!this.isStreaming) {
      this.selectedType = type;
    }
  }

  refreshCameras(): void {
    this.streamingService.refreshDeviceList();
  }

  toggleMirror(): void {
    this.mirrorEnabled = !this.mirrorEnabled;
  }

  // === Métodos de câmera ===

  async startCamera(): Promise<void> {
    if (!this.selectedCameraId) {
      console.warn('[ExamCamera] Nenhuma câmera selecionada');
      return;
    }

    this.errorMessage = '';

    try {
      console.log('[ExamCamera] Iniciando câmera:', {
        type: this.selectedType,
        cameraId: this.selectedCameraId
      });

      // Obtém stream via MedicalStreamingService
      const session = await this.streamingService.startExamStream(
        this.selectedType,
        this.selectedCameraId
      );

      if (!session) {
        throw new Error('Falha ao iniciar stream');
      }

      this.currentStream = session.stream;

      // Atribui stream ao elemento de vídeo
      if (this.videoPreview?.nativeElement) {
        this.videoPreview.nativeElement.srcObject = session.stream;
        await this.videoPreview.nativeElement.play();
      }

      this.isStreaming = true;

      // Transmite para o médico via WebRTC se em consulta
      if (this.appointmentId) {
        await this.syncService.startStreaming(session.stream, 'video');
        console.log('[ExamCamera] Streaming para médico iniciado');
      }

    } catch (error: any) {
      console.error('[ExamCamera] Erro ao iniciar câmera:', error);
      this.errorMessage = error.message || 'Erro ao acessar câmera';
      this.isStreaming = false;
    }
  }

  stopCamera(): void {
    console.log('[ExamCamera] Parando câmera');

    // Para streaming do MedicalStreamingService
    this.streamingService.stopStream();

    // Para streaming do SyncService
    this.syncService.stopStreaming();

    // Limpa elemento de vídeo
    if (this.videoPreview?.nativeElement) {
      this.videoPreview.nativeElement.srcObject = null;
    }

    // Para tracks do stream local
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    this.isStreaming = false;
    this.errorMessage = '';
  }

  // === Métodos de captura ===

  captureImage(): void {
    if (!this.videoPreview?.nativeElement || !this.isStreaming) return;

    const video = this.videoPreview.nativeElement;
    
    // Cria canvas para captura
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Desenha frame atual
    ctx.drawImage(video, 0, 0);
    
    // Converte para data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Adiciona à galeria
    this.capturedImages.unshift({
      id: `cap_${Date.now()}`,
      dataUrl,
      type: this.selectedType,
      timestamp: new Date()
    });

    console.log('[ExamCamera] Imagem capturada');
  }

  downloadImage(img: CapturedImage): void {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = `exame_${img.type}_${new Date(img.timestamp).toISOString().slice(0, 10)}.jpg`;
    link.click();
  }

  removeCapture(id: string): void {
    this.capturedImages = this.capturedImages.filter(img => img.id !== id);
  }

  clearAllCaptures(): void {
    this.capturedImages = [];
  }
}
