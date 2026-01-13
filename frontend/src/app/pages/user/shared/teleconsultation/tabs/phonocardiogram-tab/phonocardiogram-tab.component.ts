import { 
  Component, 
  Input, 
  OnInit, 
  OnDestroy, 
  ViewChild, 
  ElementRef, 
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { 
  PhonocardiogramService, 
  PhonocardiogramFrame 
} from '@core/services/phonocardiogram.service';
import { TeleconsultationRealTimeService } from '@core/services/teleconsultation-realtime.service';

@Component({
  selector: 'app-phonocardiogram-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="phonocardiogram-tab">
      <div class="panel-header">
        <h4>
          <app-icon name="heart" [size]="20" />
          Fonocardiograma em Tempo Real
        </h4>
        <div class="status-badge" [class.active]="isCapturing" [class.receiving]="isReceiving">
          <span class="dot"></span>
          @if (isCapturing) {
            Transmitindo
          } @else if (isReceiving) {
            Recebendo
          } @else {
            Aguardando
          }
        </div>
      </div>

      <div class="panel-content">
        <!-- Controles do Paciente -->
        @if (isOperator) {
          <div class="controls-section">
            <!-- Seletor de Microfone -->
            <div class="microphone-selector">
              <label>
                <app-icon name="mic" [size]="16" />
                Microfone:
              </label>
              <select [(ngModel)]="selectedMicrophone" [disabled]="isCapturing">
                @for (mic of availableMicrophones; track mic.deviceId) {
                  <option [value]="mic.deviceId">{{ mic.label || 'Microfone ' + ($index + 1) }}</option>
                }
                @if (availableMicrophones.length === 0) {
                  <option value="">Carregando...</option>
                }
              </select>
            </div>

            <!-- Botões de Controle -->
            <div class="action-buttons">
              @if (!isCapturing) {
                <button class="btn-start" (click)="startCapture()">
                  <app-icon name="play" [size]="18" />
                  Iniciar Captura
                </button>
              } @else {
                <button class="btn-stop" (click)="stopCapture()">
                  <app-icon name="square" [size]="18" />
                  Parar
                </button>
              }
            </div>

            <!-- Dica de uso -->
            <div class="hint-box">
              <app-icon name="info" [size]="14" />
              <span>Posicione o microfone (ou estetoscópio digital) próximo ao tórax do paciente.</span>
            </div>
          </div>
        }

        <!-- Visualização do Fonocardiograma -->
        <div class="visualization-section">
          <!-- Indicadores de BPM e Sons -->
          <div class="metrics-row">
            <div class="metric-card bpm">
              <div class="metric-value">{{ currentHeartRate || '--' }}</div>
              <div class="metric-label">BPM</div>
            </div>
            <div class="metric-card s1">
              <div class="metric-value">{{ (s1Amplitude * 100).toFixed(0) }}%</div>
              <div class="metric-label">S1</div>
            </div>
            <div class="metric-card s2">
              <div class="metric-value">{{ (s2Amplitude * 100).toFixed(0) }}%</div>
              <div class="metric-label">S2</div>
            </div>
          </div>

          <!-- Canvas do Traçado -->
          <div class="waveform-container">
            <canvas #waveformCanvas width="600" height="180"></canvas>
            @if (!isCapturing && !isReceiving) {
              <div class="canvas-placeholder">
                <app-icon name="activity" [size]="40" />
                <span>Aguardando dados do fonocardiograma...</span>
              </div>
            }
          </div>

          <!-- Legenda -->
          <div class="waveform-legend">
            <span class="legend-item">
              <span class="legend-color s1"></span>
              S1 (Fechamento mitral/tricúspide)
            </span>
            <span class="legend-item">
              <span class="legend-color s2"></span>
              S2 (Fechamento aórtica/pulmonar)
            </span>
          </div>
        </div>

        <!-- Status de Conexão -->
        @if (isOperator && isCapturing) {
          <div class="connection-status">
            <app-icon name="activity" [size]="14" />
            <span>Transmitindo para o médico via SignalR (~3KB/s)</span>
          </div>
        }

        <!-- DEBUG LOG - ÁREA VISÍVEL -->
        <div class="debug-area">
          <div class="debug-header">
            <strong>🔧 DEBUG LOG (copie e envie para análise):</strong>
            <button class="btn-copy" (click)="copyDebugLog()">📋 Copiar</button>
            <button class="btn-clear" (click)="clearDebugLog()">🗑️ Limpar</button>
          </div>
          <textarea 
            class="debug-log" 
            readonly 
            [value]="debugLogText"
            #debugTextarea
          ></textarea>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phonocardiogram-tab {
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

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: var(--bg-tertiary);
      color: var(--text-secondary);

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--text-tertiary);
      }

      &.active {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        .dot { background: #ef4444; animation: pulse 1s infinite; }
      }

      &.receiving {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        .dot { background: #22c55e; animation: pulse 1s infinite; }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .panel-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
    }

    .controls-section {
      margin-bottom: 20px;
    }

    .microphone-selector {
      margin-bottom: 12px;

      label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
      }

      select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 13px;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }

    .action-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;

      button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-start {
        background: #ef4444;
        color: white;
        &:hover { background: #dc2626; }
      }

      .btn-stop {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        &:hover { background: var(--bg-secondary); }
      }
    }

    .hint-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--bg-info-subtle, rgba(59, 130, 246, 0.1));
      color: var(--color-info, #3b82f6);
      font-size: 11px;
      line-height: 1.4;
    }

    .visualization-section {
      background: #0d0d1a;
      border-radius: 12px;
      padding: 16px;
      color: white;
    }

    .metrics-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .metric-card {
      flex: 1;
      text-align: center;
      padding: 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);

      .metric-value {
        font-size: 24px;
        font-weight: bold;
        line-height: 1;
      }

      .metric-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 4px;
      }

      &.bpm .metric-value { color: #ef4444; }
      &.s1 .metric-value { color: #22c55e; }
      &.s2 .metric-value { color: #3b82f6; }
    }

    .waveform-container {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      background: #0a0a14;

      canvas {
        display: block;
        width: 100%;
        height: 180px;
      }

      .canvas-placeholder {
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
        color: rgba(255, 255, 255, 0.3);
        font-size: 12px;
      }
    }

    .waveform-legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 12px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .legend-color {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        &.s1 { background: #22c55e; }
        &.s2 { background: #3b82f6; }
      }
    }

    .connection-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 16px;
      padding: 8px;
      border-radius: 6px;
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      font-size: 11px;
    }

    .debug-area {
      margin-top: 16px;
      padding: 12px;
      background: #1a1a2e;
      border-radius: 8px;
      border: 1px solid #333;
    }

    .debug-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      color: #fbbf24;
      font-size: 12px;
    }

    .btn-copy, .btn-clear {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }

    .btn-copy {
      background: #3b82f6;
      color: white;
    }

    .btn-clear {
      background: #6b7280;
      color: white;
    }

    .debug-log {
      width: 100%;
      height: 120px;
      padding: 8px;
      background: #0d0d1a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #22c55e;
      font-family: monospace;
      font-size: 10px;
      resize: vertical;
    }
  `]
})
export class PhonocardiogramTabComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('waveformCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('debugTextarea', { static: false }) debugTextareaRef!: ElementRef<HTMLTextAreaElement>;
  
  @Input() appointmentId: string | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';

  // Estados
  isCapturing = false;
  isReceiving = false;
  currentHeartRate = 0;
  s1Amplitude = 0;
  s2Amplitude = 0;

  // DEBUG
  debugLogText = '';
  private debugLogs: string[] = [];
  private startTime = Date.now();

  // Microfones
  availableMicrophones: MediaDeviceInfo[] = [];
  selectedMicrophone = '';

  // Canvas
  private ctx: CanvasRenderingContext2D | null = null;
  private waveformHistory: number[][] = [];
  private maxHistory = 100; // ~3 segundos a 30fps (reduzido para melhor performance)
  private animationFrameId: number | null = null;
  private isBrowser: boolean;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private phonoService: PhonocardiogramService,
    private realtimeService: TeleconsultationRealTimeService,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  get isOperator(): boolean {
    return this.userrole === 'PATIENT' || this.userrole === 'ASSISTANT' || this.userrole === 'ADMIN';
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.addDebugLog('INIT', `Componente iniciado | Role: ${this.userrole} | AppointmentId: ${this.appointmentId}`);
      this.loadMicrophones();
      this.setupSubscriptions();
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser && this.canvasRef) {
      this.ctx = this.canvasRef.nativeElement.getContext('2d');
      this.addDebugLog('CANVAS', `Canvas inicializado: ${this.ctx ? 'OK' : 'FALHOU'}`);
      this.startAnimation();
    }
  }

  ngOnDestroy(): void {
    this.stopCapture();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private async loadMicrophones(): Promise<void> {
    try {
      this.availableMicrophones = await this.phonoService.getAvailableMicrophones();
      if (this.availableMicrophones.length > 0) {
        this.selectedMicrophone = this.availableMicrophones[0].deviceId;
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[Fono Tab] Erro ao carregar microfones:', error);
    }
  }

  private remoteFrameCount = 0;
  private localFrameCount = 0;
  private lastFrameTime = 0;

  private setupSubscriptions(): void {
    this.addDebugLog('SUB', 'Configurando subscriptions...');

    // Frames locais (paciente)
    this.subscriptions.push(
      this.phonoService.localFrame$.subscribe(frame => {
        this.localFrameCount++;
        const now = Date.now();
        const delta = this.lastFrameTime ? now - this.lastFrameTime : 0;
        this.lastFrameTime = now;
        
        // Log a cada 30 frames (~1 segundo)
        if (this.localFrameCount % 30 === 0) {
          this.addDebugLog('LOCAL', `Frame #${this.localFrameCount} | BPM: ${frame.heartRate} | Delta: ${delta}ms | History: ${this.waveformHistory.length}`);
        }
        this.processFrame(frame);
      })
    );

    // Frames remotos (médico recebe do paciente)
    this.subscriptions.push(
      this.realtimeService.phonocardiogramFrame$.subscribe(frame => {
        this.isReceiving = true;
        this.remoteFrameCount++;
        const now = Date.now();
        const delta = this.lastFrameTime ? now - this.lastFrameTime : 0;
        this.lastFrameTime = now;
        
        // Log a cada frame nos primeiros 10, depois a cada 30
        if (this.remoteFrameCount <= 10 || this.remoteFrameCount % 30 === 0) {
          this.addDebugLog('REMOTE', `Frame #${this.remoteFrameCount} | BPM: ${frame.heartRate} | Waveform: ${frame.waveform?.length || 0}pts | Delta: ${delta}ms | History: ${this.waveformHistory.length}`);
        }
        
        this.processFrame(frame);
        this.cdr.detectChanges();
      })
    );

    // Status de captura
    this.subscriptions.push(
      this.phonoService.isCapturing$.subscribe(capturing => {
        this.isCapturing = capturing;
        this.addDebugLog('STATUS', `Captura: ${capturing ? 'ATIVA' : 'PARADA'}`);
        this.cdr.detectChanges();
      })
    );

    this.addDebugLog('SUB', 'Subscriptions configuradas OK');
  }

  private processFrame(frame: PhonocardiogramFrame): void {
    this.currentHeartRate = frame.heartRate;
    this.s1Amplitude = frame.s1Amplitude;
    this.s2Amplitude = frame.s2Amplitude;

    // Adicionar ao histórico
    this.waveformHistory.push(frame.waveform);
    if (this.waveformHistory.length > this.maxHistory) {
      this.waveformHistory.shift();
    }
  }

  async startCapture(): Promise<void> {
    if (!this.appointmentId) {
      console.error('[Fono Tab] ID da consulta não definido');
      return;
    }

    try {
      await this.phonoService.startCapture(this.appointmentId, this.selectedMicrophone);
    } catch (error) {
      console.error('[Fono Tab] Erro ao iniciar captura:', error);
    }
  }

  stopCapture(): void {
    this.phonoService.stopCapture();
    this.waveformHistory = [];
  }

  private startAnimation(): void {
    const animate = () => {
      this.drawWaveform();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private drawWaveform(): void {
    if (!this.ctx || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    const width = canvas.width;
    const height = canvas.height;

    // Limpar com fade (efeito de persistência)
    ctx.fillStyle = 'rgba(10, 10, 20, 0.15)';
    ctx.fillRect(0, 0, width, height);

    if (this.waveformHistory.length === 0) return;

    // Desenhar grade
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Desenhar linha central
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Desenhar forma de onda
    const flatData = this.waveformHistory.flat();
    if (flatData.length === 0) return;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = width / flatData.length;
    for (let i = 0; i < flatData.length; i++) {
      const x = i * step;
      const y = height / 2 - flatData[i] * height * 3;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Glow effect
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ======== DEBUG METHODS ========
  
  private addDebugLog(tag: string, message: string): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logLine = `[${timestamp}][+${elapsed}s][${tag}] ${message}`;
    
    this.debugLogs.push(logLine);
    
    // Manter apenas os últimos 50 logs
    if (this.debugLogs.length > 50) {
      this.debugLogs.shift();
    }
    
    this.debugLogText = this.debugLogs.join('\n');
    
    // Auto-scroll para o final
    setTimeout(() => {
      if (this.debugTextareaRef?.nativeElement) {
        this.debugTextareaRef.nativeElement.scrollTop = this.debugTextareaRef.nativeElement.scrollHeight;
      }
    });
  }

  copyDebugLog(): void {
    if (this.isBrowser && navigator.clipboard) {
      const header = `=== FONO DEBUG LOG ===\nData: ${new Date().toISOString()}\nRole: ${this.userrole}\nAppointmentId: ${this.appointmentId}\nFrames Locais: ${this.localFrameCount}\nFrames Remotos: ${this.remoteFrameCount}\nHistory Size: ${this.waveformHistory.length}\n\n`;
      navigator.clipboard.writeText(header + this.debugLogText);
      this.addDebugLog('COPY', 'Log copiado para clipboard!');
    }
  }

  clearDebugLog(): void {
    this.debugLogs = [];
    this.debugLogText = '';
    this.startTime = Date.now();
    this.addDebugLog('CLEAR', 'Log limpo');
  }
}
