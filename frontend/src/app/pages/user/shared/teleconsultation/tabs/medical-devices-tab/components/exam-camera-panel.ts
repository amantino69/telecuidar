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

      <!-- Info da câmera ativa -->
      @if (isStreaming && activeCameraLabel) {
        <div class="active-camera-info">
          <app-icon name="check-circle" [size]="14" />
          <span>Câmera ativa: <strong>{{ activeCameraLabel }}</strong></span>
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
        <select [(ngModel)]="selectedDeviceId" (ngModelChange)="onCameraChange($event)" [disabled]="isStarting">
          <option value="">Selecione a câmera</option>
          @for (device of videoDevices; track device.deviceId) {
            <option [value]="device.deviceId">{{ device.label }} ({{ device.deviceId.slice(0, 8) }}...)</option>
          }
        </select>
        <button class="btn-refresh" (click)="refreshDevices()" [disabled]="isStarting">
          <app-icon name="refresh-cw" [size]="16" />
        </button>
      </div>

      <!-- Mensagem de erro -->
      @if (errorMessage) {
        <div class="error-message">
          <app-icon name="alert-circle" [size]="16" />
          <span>{{ errorMessage }}</span>
          <button class="btn-dismiss" (click)="errorMessage = null">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }

      <!-- Preview de vídeo -->
      <div class="video-container" [class.active]="isStreaming" [class.loading]="isStarting">
        <video 
          #videoElement 
          autoplay 
          playsinline 
          muted
          [class.mirrored]="mirrorVideo">
        </video>
        
        @if (isStarting) {
          <div class="video-placeholder loading">
            <div class="spinner"></div>
            <span>Conectando à câmera...</span>
            <small>Isso pode levar alguns segundos para câmeras USB</small>
          </div>
        } @else if (!isStreaming) {
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
            [disabled]="!selectedDeviceId || isStarting"
            (click)="startStream()">
            @if (isStarting) {
              <div class="btn-spinner"></div>
              Conectando...
            } @else {
              <app-icon name="play" [size]="20" />
              Iniciar Exame
            }
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

    .active-camera-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--bg-success);
      border-radius: 8px;
      color: var(--text-success);
      font-size: 12px;

      strong {
        font-weight: 600;
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

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-danger);
      border: 1px solid var(--color-danger);
      border-radius: 8px;
      color: var(--text-danger);
      font-size: 13px;

      span {
        flex: 1;
      }

      .btn-dismiss {
        padding: 4px;
        background: transparent;
        border: none;
        color: var(--text-danger);
        cursor: pointer;
        opacity: 0.7;

        &:hover {
          opacity: 1;
        }
      }
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .video-container {
      position: relative;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      min-height: 200px;

      &.loading {
        border: 2px solid var(--color-primary);
      }

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
        
        &:hover:not(.loading) {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-primary);
        }

        &.loading {
          cursor: default;
          color: var(--color-primary);
          background: rgba(0, 0, 0, 0.7);
        }
        
        span {
          font-size: 14px;
          font-weight: 500;
        }

        small {
          font-size: 11px;
          color: var(--text-secondary);
          text-align: center;
          max-width: 80%;
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
    { id: 'laryngoscope' as ExamType, label: 'Lagosta', icon: 'mic' }
  ];

  selectedType: ExamType = 'otoscope';
  selectedDeviceId: string = '';
  videoDevices: MediaDeviceInfo[] = [];
  
  isStreaming = false;
  mirrorVideo = false;
  isZoomed = false;

  captures: Array<{
    id: string;
    type: ExamType;
    dataUrl: string;
    timestamp: Date;
  }> = [];

  activeCameraLabel: string | null = null;

  private subscriptions = new Subscription();

  constructor(
    private streamingService: MedicalStreamingService,
    private syncService: MedicalDevicesSyncService
  ) {}

  ngOnInit(): void {
    this.refreshDevices();

    // Verifica se já existe um stream de vídeo ativo (restauração após mudança de aba)
    this.restoreExistingStream();

    // Observa dispositivos de vídeo
    this.subscriptions.add(
      this.streamingService.availableVideoDevices$.subscribe(devices => {
        console.log('[ExamCamera] Lista de câmeras atualizada:', devices.map(d => ({ id: d.deviceId.slice(0, 8), label: d.label })));
        this.videoDevices = devices;
        if (devices.length > 0 && !this.selectedDeviceId) {
          // Prioridade de seleção automática:
          // 1. Câmera USB externa (para exames)
          // 2. Primeira câmera disponível
          const usbCamera = devices.find(d => 
            d.label.toLowerCase().includes('usb') ||
            d.label.toLowerCase().includes('external') ||
            d.label.toLowerCase().includes('exame') ||
            d.label.toLowerCase().includes('dermatoscope') ||
            d.label.toLowerCase().includes('otoscope')
          );
          
          this.selectedDeviceId = usbCamera?.deviceId || devices[0].deviceId;
          console.log('[ExamCamera] Câmera selecionada automaticamente:', 
            usbCamera?.label || devices[0].label);
          
          // AUTO-INICIAR: Se não há stream ativo e temos dispositivo, inicia automaticamente
          if (!this.isStreaming && this.selectedDeviceId && !this.syncService.isVideoCurrentlyActive) {
            console.log('[ExamCamera] Auto-iniciando câmera de exame...');
            setTimeout(() => this.startStream(), 500);
          }
        }
      })
    );

    // Observa stream de vídeo persistente
    this.subscriptions.add(
      this.syncService.localVideoStream$.subscribe(stream => {
        if (stream && !this.isStreaming) {
          console.log('[ExamCamera] Stream persistente detectado, restaurando...');
          this.restoreStreamToVideo(stream);
        }
      })
    );

    // Observa estado de transmissão
    this.subscriptions.add(
      this.syncService.isVideoTransmitting$.subscribe(isTransmitting => {
        // Não sobrescreve isStreaming se temos stream local ativo
        if (isTransmitting || !this.syncService.isVideoCurrentlyActive) {
          this.isStreaming = isTransmitting || this.syncService.isVideoCurrentlyActive;
        }
      })
    );
  }

  /**
   * Restaura stream existente (após mudança de aba)
   */
  private restoreExistingStream(): void {
    const existingStream = this.syncService.currentLocalVideoStream;
    if (existingStream) {
      console.log('[ExamCamera] Restaurando stream de vídeo existente');
      this.restoreStreamToVideo(existingStream);
    }
  }

  /**
   * Conecta stream ao elemento de vídeo
   */
  private restoreStreamToVideo(stream: MediaStream): void {
    this.isStreaming = true;
    
    // Aguarda o videoElement estar disponível
    setTimeout(() => {
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          this.activeCameraLabel = track.label;
        }
        console.log('[ExamCamera] Stream restaurado para videoElement');
      }
    }, 100);
  }

  ngAfterViewInit(): void {
    // Canvas resize se necessário
  }

  refreshDevices(): void {
    console.log('[ExamCamera] Atualizando lista de dispositivos...');
    this.streamingService.refreshDeviceList();
  }

  selectType(type: ExamType): void {
    this.selectedType = type;
  }

  getSelectedTypeIcon(): IconName {
    return this.examTypes.find(t => t.id === this.selectedType)?.icon || 'video';
  }

  isStarting = false;
  errorMessage: string | null = null;

  /**
   * Chamado quando o usuário muda a câmera selecionada no dropdown
   */
  onCameraChange(newDeviceId: string): void {
    console.log('[ExamCamera] Câmera selecionada mudou:', {
      anterior: this.selectedDeviceId,
      nova: newDeviceId,
      isStreaming: this.isStreaming
    });

    // Se já está transmitindo, para e reinicia com a nova câmera
    if (this.isStreaming && newDeviceId) {
      console.log('[ExamCamera] Trocando câmera durante streaming...');
      this.stopStream();
      // Pequeno delay para garantir que o stream anterior foi parado
      setTimeout(() => {
        this.startStream();
      }, 300);
    }
  }

  async startStream(): Promise<void> {
    // Se já existe stream ativo, apenas restaura
    if (this.syncService.isVideoCurrentlyActive) {
      console.log('[ExamCamera] Stream já ativo, restaurando...');
      this.restoreExistingStream();
      return;
    }

    if (!this.selectedDeviceId) {
      console.warn('[ExamCamera] Nenhuma câmera selecionada');
      this.errorMessage = 'Por favor, selecione uma câmera antes de iniciar.';
      return;
    }

    // Evita cliques múltiplos
    if (this.isStarting) {
      console.warn('[ExamCamera] Já está iniciando, ignorando clique');
      return;
    }

    this.isStarting = true;
    this.errorMessage = null;

    // Log detalhado da câmera selecionada
    const selectedDevice = this.videoDevices.find(d => d.deviceId === this.selectedDeviceId);
    console.log('[ExamCamera] Iniciando stream...', { 
      type: this.selectedType, 
      deviceId: this.selectedDeviceId,
      deviceLabel: selectedDevice?.label || 'desconhecido',
      appointmentId: this.appointmentId,
      totalDevices: this.videoDevices.length,
      allDevices: this.videoDevices.map(d => ({ id: d.deviceId.slice(0, 8), label: d.label }))
    });

    try {
      const session = await this.streamingService.startExamStream(
        this.selectedType,
        this.selectedDeviceId
      );

      if (session && this.videoElement) {
        // Verifica se o stream veio da câmera correta
        const track = session.stream.getVideoTracks()[0];
        if (track) {
          // Captura o label da câmera realmente ativa
          this.activeCameraLabel = track.label;
          console.log('[ExamCamera] ✓ Stream obtido da câmera:', {
            label: track.label,
            deviceId: track.getSettings().deviceId
          });
        }
        
        this.videoElement.nativeElement.srcObject = session.stream;
        this.isStreaming = true;
        
        // REGISTRA STREAM PERSISTENTE no sync service
        this.syncService.setLocalVideoStream(session.stream, false);

        // Se tem appointmentId, inicia streaming via WebRTC para o médico
        if (this.appointmentId) {
          try {
            // Garante conexão ao hub antes de transmitir
            await this.syncService.connect(this.appointmentId);
            await this.syncService.startStreaming(session.stream, 'video');
            this.syncService.setVideoTransmitting(true);
            console.log('[ExamCamera] Streaming para médico iniciado');
          } catch (syncError: any) {
            console.error('[ExamCamera] Erro ao enviar stream para médico:', syncError);
            // Não para o stream local, apenas notifica
            this.errorMessage = 'Câmera local funcionando, mas houve erro ao transmitir para o médico.';
          }
        }
      } else {
        console.error('[ExamCamera] Falha ao obter stream ou videoElement não disponível');
        this.errorMessage = 'Não foi possível acessar a câmera. Verifique se está conectada.';
      }
    } catch (error: any) {
      console.error('[ExamCamera] Erro ao iniciar stream:', error);
      
      // Mensagens de erro amigáveis baseadas no tipo de erro
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.errorMessage = 'Câmera não encontrada. Verifique se está conectada corretamente.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.errorMessage = 'Permissão de câmera negada. Por favor, permita o acesso à câmera.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        this.errorMessage = 'A câmera está em uso por outro aplicativo. Feche outros programas que possam estar usando-a.';
      } else if (error.message?.includes('Timeout')) {
        this.errorMessage = 'A câmera demorou muito para responder. Reconecte o dispositivo USB e tente novamente.';
      } else if (error.message?.includes('Não foi possível acessar')) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = `Erro ao acessar câmera: ${error.message || 'Erro desconhecido'}`;
      }
      
      // Atualiza lista de dispositivos para refletir estado atual
      this.refreshDevices();
    } finally {
      this.isStarting = false;
    }
  }

  stopStream(): void {
    console.log('[ExamCamera] Parando stream...');
    this.streamingService.stopStream();
    this.syncService.stopStreaming();
    
    // Remove stream do sync service
    this.syncService.setLocalVideoStream(null, false);
    
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    
    this.isStreaming = false;
    this.errorMessage = null;
    this.activeCameraLabel = null;
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
    // NÃO paramos o stream aqui - ele continua ativo no serviço
    // Apenas limpamos recursos locais do componente
    console.log('[ExamCamera] ngOnDestroy - mantendo stream ativo no serviço');
    
    // Remove a referência do elemento de vídeo mas NÃO para o stream
    // O stream será reconectado quando o componente for recriado
    
    this.subscriptions.unsubscribe();
    
    // NÃO chamamos stopStream() para manter o stream ativo
  }
}
