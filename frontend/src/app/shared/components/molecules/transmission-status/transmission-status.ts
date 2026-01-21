import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { IconComponent } from '@shared/components/atoms/icon/icon';
import { IoMTService, StreamingStatus } from '@app/core/services/iomt.service';

/**
 * Componente de feedback visual para status de transmissão IoMT.
 * Mostra indicadores de:
 * - Status de conexão (conectando, conectado, erro)
 * - Pacotes enviados/confirmados
 * - Latência em milissegundos
 * - Barra de progresso animada durante transmissão
 */
@Component({
  selector: 'app-transmission-status',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="transmission-status" [class]="statusClass" [class.compact]="compact">
      <!-- Indicador de status principal -->
      <div class="status-indicator">
        <span class="status-dot" [class]="statusClass"></span>
        <span class="status-text">{{ statusMessage }}</span>
      </div>

      <!-- Estatísticas (modo expandido) -->
      @if (!compact && isTransmitting) {
        <div class="transmission-stats">
          <div class="stat">
            <app-icon name="upload-cloud" [size]="12" />
            <span>{{ packetsSent }}</span>
          </div>
          <div class="stat">
            <app-icon name="check-circle" [size]="12" />
            <span>{{ packetsConfirmed }}</span>
          </div>
          <div class="stat latency">
            <app-icon name="activity" [size]="12" />
            <span>{{ latencyMs }}ms</span>
          </div>
        </div>
      }

      <!-- Barra de progresso de transmissão -->
      @if (isTransmitting) {
        <div class="progress-bar">
          <div class="progress-fill" [class.active]="isTransmitting"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .transmission-status {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--bg-secondary);
      transition: all 0.3s ease;
    }

    .transmission-status.compact {
      flex-direction: row;
      align-items: center;
      padding: 4px 10px;
      gap: 8px;
    }

    /* Status Classes */
    .transmission-status.connecting {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .transmission-status.connected {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .transmission-status.transmitting {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .transmission-status.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .transmission-status.disconnected {
      background: rgba(107, 114, 128, 0.1);
      border: 1px solid rgba(107, 114, 128, 0.3);
    }

    /* Status Indicator */
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot.connecting {
      background: #3b82f6;
      animation: pulse 1.5s infinite;
    }

    .status-dot.connected {
      background: #10b981;
    }

    .status-dot.transmitting {
      background: #3b82f6;
      animation: pulse 0.8s infinite;
    }

    .status-dot.error {
      background: #ef4444;
    }

    .status-dot.disconnected {
      background: #6b7280;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.2);
      }
    }

    .status-text {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary);
    }

    /* Stats */
    .transmission-stats {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .stat.latency {
      color: #10b981;
    }

    .stat.latency span {
      font-weight: 600;
    }

    /* Progress Bar */
    .progress-bar {
      height: 3px;
      background: rgba(59, 130, 246, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      width: 30%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6);
      background-size: 200% 100%;
      border-radius: 2px;
    }

    .progress-fill.active {
      animation: flow 1s linear infinite;
    }

    @keyframes flow {
      0% {
        background-position: 200% 0;
        width: 30%;
      }
      50% {
        width: 60%;
      }
      100% {
        background-position: -200% 0;
        width: 30%;
      }
    }

    /* Compact mode adjustments */
    .compact .status-text {
      font-size: 11px;
    }

    .compact .transmission-stats {
      display: none;
    }

    .compact .progress-bar {
      display: none;
    }
  `]
})
export class TransmissionStatusComponent implements OnInit, OnDestroy {
  @Input() type: 'auscultation' | 'examCamera' = 'auscultation';
  @Input() compact = false;
  
  statusClass: 'connecting' | 'connected' | 'transmitting' | 'error' | 'disconnected' = 'disconnected';
  statusMessage = 'Aguardando conexão...';
  isTransmitting = false;
  packetsSent = 0;
  packetsConfirmed = 0;
  latencyMs = 0;
  
  private destroy$ = new Subject<void>();

  constructor(private iomtService: IoMTService) {}

  ngOnInit() {
    // Observar status de conexão
    this.iomtService.isConnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        if (connected && !this.isTransmitting) {
          this.statusClass = 'connected';
          this.statusMessage = 'Conectado';
        } else if (!connected) {
          this.statusClass = 'disconnected';
          this.statusMessage = 'Desconectado';
          this.isTransmitting = false;
        }
      });

    // Observar status de streaming
    this.iomtService.streamingStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        // Filtrar por tipo
        if (status.type !== this.type) return;
        
        this.updateFromStatus(status);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateFromStatus(status: StreamingStatus) {
    switch (status.status) {
      case 'connecting':
        this.statusClass = 'connecting';
        this.statusMessage = 'Conectando...';
        this.isTransmitting = false;
        break;
        
      case 'connected':
        this.statusClass = 'connected';
        this.statusMessage = 'Conectado';
        this.isTransmitting = false;
        break;
        
      case 'transmitting':
        this.statusClass = 'transmitting';
        this.isTransmitting = true;
        this.packetsSent++;
        if (status.latencyMs) {
          this.latencyMs = status.latencyMs;
        }
        this.statusMessage = this.type === 'auscultation' 
          ? 'Transmitindo ausculta...' 
          : 'Transmitindo imagens...';
        break;
        
      case 'received':
        this.packetsConfirmed++;
        if (status.latencyMs) {
          this.latencyMs = status.latencyMs;
        }
        break;
        
      case 'error':
        this.statusClass = 'error';
        this.statusMessage = status.message || 'Erro na transmissão';
        this.isTransmitting = false;
        break;
        
      case 'disconnected':
        this.statusClass = 'disconnected';
        this.statusMessage = 'Desconectado';
        this.isTransmitting = false;
        break;
    }
  }

  reset() {
    this.packetsSent = 0;
    this.packetsConfirmed = 0;
    this.latencyMs = 0;
  }
}
