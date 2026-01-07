import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { IconComponent } from '@shared/components/atoms/icon/icon';
import { MedicalDevicesSyncService, VitalSignsData } from '@app/core/services/medical-devices-sync.service';

interface VitalDisplay {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp?: Date;
}

@Component({
  selector: 'app-vital-signs-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="vital-signs-panel">
      <div class="panel-header">
        <h4>
          <app-icon name="activity" [size]="20" />
          Sinais Vitais em Tempo Real
        </h4>
        <span class="connection-indicator" [class.connected]="isConnected">
          <span class="indicator-dot"></span>
          {{ isConnected ? 'Conectado' : 'Aguardando' }}
        </span>
      </div>

      @if (!hasAnyData) {
        <div class="waiting-state">
          <div class="waiting-icon">
            <app-icon name="bluetooth" [size]="48" />
          </div>
          <h5>Aguardando dados do paciente...</h5>
          <p>Os sinais vitais aparecerão aqui quando o paciente conectar os dispositivos</p>
        </div>
      } @else {
        <div class="vitals-grid">
          @if (vitals['spo2']) {
            <div class="vital-card spo2" [class]="getStatusClass(vitals['spo2'])">
              <div class="vital-icon">
                <app-icon name="droplet" [size]="24" />
              </div>
              <div class="vital-info">
                <span class="vital-label">SpO₂</span>
                <span class="vital-value">{{ vitals['spo2'].value }}<small>{{ vitals['spo2'].unit }}</small></span>
              </div>
              <div class="vital-indicator" [class]="vitals['spo2'].status"></div>
            </div>
          }

          @if (vitals['pulseRate']) {
            <div class="vital-card pulse" [class]="getStatusClass(vitals['pulseRate'])">
              <div class="vital-icon pulse-animation">
                <app-icon name="heart" [size]="24" />
              </div>
              <div class="vital-info">
                <span class="vital-label">Freq. Cardíaca</span>
                <span class="vital-value">{{ vitals['pulseRate'].value }}<small>{{ vitals['pulseRate'].unit }}</small></span>
              </div>
              <div class="vital-indicator" [class]="vitals['pulseRate'].status"></div>
            </div>
          }

          @if (vitals['temperature']) {
            <div class="vital-card temp" [class]="getStatusClass(vitals['temperature'])">
              <div class="vital-icon">
                <app-icon name="thermometer" [size]="24" />
              </div>
              <div class="vital-info">
                <span class="vital-label">Temperatura</span>
                <span class="vital-value">{{ vitals['temperature'].value }}<small>{{ vitals['temperature'].unit }}</small></span>
              </div>
              <div class="vital-indicator" [class]="vitals['temperature'].status"></div>
            </div>
          }

          @if (vitals['bloodPressure']) {
            <div class="vital-card bp" [class]="getStatusClass(vitals['bloodPressure'])">
              <div class="vital-icon">
                <app-icon name="activity" [size]="24" />
              </div>
              <div class="vital-info">
                <span class="vital-label">Pressão Arterial</span>
                <span class="vital-value">{{ vitals['bloodPressure'].value }}<small>{{ vitals['bloodPressure'].unit }}</small></span>
              </div>
              <div class="vital-indicator" [class]="vitals['bloodPressure'].status"></div>
            </div>
          }

          @if (vitals['weight']) {
            <div class="vital-card weight">
              <div class="vital-icon">
                <app-icon name="box" [size]="24" />
              </div>
              <div class="vital-info">
                <span class="vital-label">Peso</span>
                <span class="vital-value">{{ vitals['weight'].value }}<small>{{ vitals['weight'].unit }}</small></span>
              </div>
            </div>
          }
        </div>

        @if (lastUpdate) {
          <div class="last-update">
            <app-icon name="clock" [size]="14" />
            Última atualização: {{ formatTime(lastUpdate) }}
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .vital-signs-panel {
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .connection-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--text-secondary);

        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-secondary);
        }

        &.connected {
          color: var(--text-success);

          .indicator-dot {
            background: var(--color-success);
            animation: pulse-dot 2s infinite;
          }
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
      color: var(--text-secondary);

      .waiting-icon {
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-secondary);
        border-radius: 50%;
        margin-bottom: 16px;
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
        max-width: 280px;
      }
    }

    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      flex: 1;
    }

    .vital-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 16px;
      border-left: 4px solid transparent;
      position: relative;
      transition: all 0.3s ease;

      &.spo2 { border-left-color: #3b82f6; }
      &.pulse { border-left-color: #ef4444; }
      &.temp { border-left-color: #f97316; }
      &.bp { border-left-color: #10b981; }
      &.weight { border-left-color: #8b5cf6; }

      &.warning {
        background: var(--bg-warning-subtle);
      }

      &.critical {
        background: var(--bg-danger-subtle);
        animation: critical-pulse 1s infinite;
      }

      .vital-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary);
        border-radius: 12px;

        &.pulse-animation {
          animation: heartbeat 1s infinite;
        }
      }

      .vital-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .vital-label {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .vital-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;

          small {
            font-size: 14px;
            font-weight: 400;
            margin-left: 4px;
            color: var(--text-secondary);
          }
        }
      }

      .vital-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &.normal { background: #10b981; }
        &.warning { background: #f59e0b; }
        &.critical { background: #ef4444; animation: blink 0.5s infinite; }
      }
    }

    .last-update {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-secondary);
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    @keyframes waiting-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      14% { transform: scale(1.1); }
      28% { transform: scale(1); }
      42% { transform: scale(1.1); }
      70% { transform: scale(1); }
    }

    @keyframes critical-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
      50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `]
})
export class VitalSignsPanelComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';

  isConnected = false;
  hasAnyData = false;
  lastUpdate: Date | null = null;
  
  vitals: Record<string, VitalDisplay> = {};

  private subscriptions = new Subscription();

  constructor(private syncService: MedicalDevicesSyncService) {}

  ngOnInit(): void {
    // Conecta ao hub
    if (this.appointmentId) {
      this.syncService.connect(this.appointmentId);
    }

    // Observa conexão
    this.subscriptions.add(
      this.syncService.isConnected$.subscribe(connected => {
        this.isConnected = connected;
      })
    );

    // Observa sinais vitais recebidos
    this.subscriptions.add(
      this.syncService.vitalSignsReceived$.subscribe(data => {
        this.processVitalSigns(data);
      })
    );
  }

  private processVitalSigns(data: VitalSignsData): void {
    this.hasAnyData = true;
    this.lastUpdate = new Date(data.timestamp);

    const v = data.vitals;

    if (v.spo2 !== undefined) {
      this.vitals['spo2'] = {
        label: 'SpO₂',
        value: v.spo2.toString(),
        unit: '%',
        icon: 'droplet',
        color: '#3b82f6',
        status: this.getSpo2Status(v.spo2)
      };
    }

    if (v.pulseRate !== undefined) {
      this.vitals['pulseRate'] = {
        label: 'Freq. Cardíaca',
        value: v.pulseRate.toString(),
        unit: 'bpm',
        icon: 'heart',
        color: '#ef4444',
        status: this.getPulseStatus(v.pulseRate)
      };
    }

    if (v.temperature !== undefined) {
      this.vitals['temperature'] = {
        label: 'Temperatura',
        value: v.temperature.toFixed(1),
        unit: '°C',
        icon: 'thermometer',
        color: '#f97316',
        status: this.getTemperatureStatus(v.temperature)
      };
    }

    if (v.systolic !== undefined && v.diastolic !== undefined) {
      this.vitals['bloodPressure'] = {
        label: 'Pressão Arterial',
        value: `${v.systolic}/${v.diastolic}`,
        unit: 'mmHg',
        icon: 'activity',
        color: '#10b981',
        status: this.getBloodPressureStatus(v.systolic, v.diastolic)
      };
    }

    if (v.weight !== undefined) {
      this.vitals['weight'] = {
        label: 'Peso',
        value: v.weight.toFixed(1),
        unit: 'kg',
        icon: 'box',
        color: '#8b5cf6',
        status: 'normal'
      };
    }
  }

  private getSpo2Status(value: number): 'normal' | 'warning' | 'critical' {
    if (value >= 95) return 'normal';
    if (value >= 90) return 'warning';
    return 'critical';
  }

  private getPulseStatus(value: number): 'normal' | 'warning' | 'critical' {
    if (value >= 60 && value <= 100) return 'normal';
    if (value >= 50 && value <= 120) return 'warning';
    return 'critical';
  }

  private getTemperatureStatus(value: number): 'normal' | 'warning' | 'critical' {
    if (value >= 36 && value <= 37.5) return 'normal';
    if (value >= 35 && value <= 38.5) return 'warning';
    return 'critical';
  }

  private getBloodPressureStatus(systolic: number, diastolic: number): 'normal' | 'warning' | 'critical' {
    if (systolic <= 120 && diastolic <= 80) return 'normal';
    if (systolic <= 140 && diastolic <= 90) return 'warning';
    return 'critical';
  }

  getStatusClass(vital: VitalDisplay): string {
    return vital.status;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
