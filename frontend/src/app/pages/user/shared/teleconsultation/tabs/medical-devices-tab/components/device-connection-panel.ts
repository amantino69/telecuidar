import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { IconComponent, IconName } from '@shared/components/atoms/icon/icon';
import { 
  BluetoothDevicesService, 
  BluetoothDevice, 
  DeviceType,
  VitalReading 
} from '@app/core/services/bluetooth-devices.service';
import { MedicalDevicesSyncService } from '@app/core/services/medical-devices-sync.service';

interface DeviceConfig {
  type: DeviceType;
  name: string;
  icon: IconName;
  description: string;
}

@Component({
  selector: 'app-device-connection-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="device-connection-panel">
      <div class="panel-header">
        <h4>
          <app-icon name="bluetooth" [size]="20" />
          Dispositivos Bluetooth
        </h4>
        <span class="connection-status" [class.connected]="isHubConnected">
          {{ isHubConnected ? 'Sincronizado' : 'Offline' }}
        </span>
      </div>

      @if (!bluetoothAvailable) {
        <div class="warning-banner">
          <app-icon name="alert-triangle" [size]="18" />
          <span>Web Bluetooth não disponível. Use Chrome/Edge em HTTPS.</span>
        </div>
      }

      <div class="devices-grid">
        @for (config of deviceConfigs; track config.type) {
          <div class="device-card" [class.connected]="isDeviceConnected(config.type)">
            <div class="device-icon">
              <app-icon [name]="config.icon" [size]="32" />
            </div>
            <div class="device-info">
              <span class="device-name">{{ config.name }}</span>
              <span class="device-desc">{{ config.description }}</span>
            </div>
            
            @if (isDeviceConnected(config.type)) {
              <div class="device-status connected">
                <app-icon name="check-circle" [size]="16" />
                <span>Conectado</span>
              </div>
              <button class="btn-disconnect" (click)="disconnectDevice(config.type)">
                Desconectar
              </button>
            } @else {
              <button 
                class="btn-connect" 
                [disabled]="!bluetoothAvailable || isConnecting"
                (click)="connectDevice(config.type)">
                @if (connectingType === config.type) {
                  <app-icon name="loader" [size]="16" class="spin" />
                  Conectando...
                } @else {
                  <app-icon name="bluetooth" [size]="16" />
                  Conectar
                }
              </button>
            }
          </div>
        }
      </div>

      @if (connectedDevices.length > 0) {
        <div class="readings-section">
          <h5>
            <app-icon name="activity" [size]="18" />
            Leituras em Tempo Real
          </h5>
          
          <div class="readings-grid">
            @if (latestReadings['spo2']) {
              <div class="reading-card spo2">
                <span class="reading-label">SpO₂</span>
                <span class="reading-value">{{ latestReadings['spo2'] }}<small>%</small></span>
              </div>
            }
            @if (latestReadings['pulseRate']) {
              <div class="reading-card pulse">
                <span class="reading-label">Pulso</span>
                <span class="reading-value">{{ latestReadings['pulseRate'] }}<small>bpm</small></span>
              </div>
            }
            @if (latestReadings['temperature']) {
              <div class="reading-card temp">
                <span class="reading-label">Temperatura</span>
                <span class="reading-value">{{ latestReadings['temperature'] }}<small>°C</small></span>
              </div>
            }
            @if (latestReadings['weight']) {
              <div class="reading-card weight">
                <span class="reading-label">Peso</span>
                <span class="reading-value">{{ latestReadings['weight'] }}<small>kg</small></span>
              </div>
            }
            @if (latestReadings['systolic'] && latestReadings['diastolic']) {
              <div class="reading-card bp">
                <span class="reading-label">Pressão</span>
                <span class="reading-value">{{ latestReadings['systolic'] }}/{{ latestReadings['diastolic'] }}<small>mmHg</small></span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .device-connection-panel {
      padding: 16px;
      height: 100%;
      overflow-y: auto;
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

      .connection-status {
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 12px;
        background: var(--bg-danger);
        color: var(--text-danger);

        &.connected {
          background: var(--bg-success);
          color: var(--text-success);
        }
      }
    }

    .warning-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--bg-warning);
      color: var(--text-warning);
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .devices-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .device-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 2px solid transparent;
      transition: all 0.2s ease;

      &.connected {
        border-color: var(--color-success);
        background: var(--bg-success-subtle);
      }

      .device-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: var(--bg-tertiary);
        color: var(--color-primary);
      }

      .device-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .device-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .device-desc {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .device-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--text-success);
      }

      .btn-connect, .btn-disconnect {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-connect {
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

      .btn-disconnect {
        background: var(--bg-danger);
        color: var(--text-danger);

        &:hover {
          background: var(--color-danger);
          color: white;
        }
      }
    }

    .readings-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);

      h5 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 16px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .readings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }

    .reading-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      text-align: center;

      .reading-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }

      .reading-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--text-primary);

        small {
          font-size: 12px;
          font-weight: 400;
          margin-left: 2px;
        }
      }

      &.spo2 .reading-value { color: #3b82f6; }
      &.pulse .reading-value { color: #ef4444; }
      &.temp .reading-value { color: #f97316; }
      &.weight .reading-value { color: #8b5cf6; }
      &.bp .reading-value { color: #10b981; }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class DeviceConnectionPanelComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';

  deviceConfigs: DeviceConfig[] = [
    { type: 'oximeter', name: 'Oxímetro', icon: 'heart', description: 'SpO₂ e frequência cardíaca' },
    { type: 'thermometer', name: 'Termômetro', icon: 'thermometer', description: 'Temperatura corporal' },
    { type: 'scale', name: 'Balança', icon: 'box', description: 'Peso corporal' },
    { type: 'blood_pressure', name: 'Pressão Arterial', icon: 'activity', description: 'Sistólica / Diastólica' }
  ];

  bluetoothAvailable = false;
  isHubConnected = false;
  isConnecting = false;
  connectingType: DeviceType | null = null;
  connectedDevices: BluetoothDevice[] = [];
  latestReadings: Record<string, number> = {};

  private subscriptions = new Subscription();

  constructor(
    private bluetoothService: BluetoothDevicesService,
    private syncService: MedicalDevicesSyncService
  ) {}

  ngOnInit(): void {
    this.bluetoothAvailable = this.bluetoothService.isBluetoothAvailable();

    // Conecta ao hub
    if (this.appointmentId) {
      this.syncService.connect(this.appointmentId);
    }

    // Observa estado da conexão
    this.subscriptions.add(
      this.syncService.isConnected$.subscribe(connected => {
        this.isHubConnected = connected;
      })
    );

    // Observa dispositivos conectados
    this.subscriptions.add(
      this.bluetoothService.devices$.subscribe(devices => {
        this.connectedDevices = devices.filter(d => d.connected);
      })
    );

    // Observa leituras
    this.subscriptions.add(
      this.bluetoothService.readings$.subscribe(reading => {
        this.processReading(reading);
      })
    );
  }

  isDeviceConnected(type: DeviceType): boolean {
    return this.connectedDevices.some(d => d.type === type);
  }

  async connectDevice(type: DeviceType): Promise<void> {
    this.isConnecting = true;
    this.connectingType = type;

    try {
      switch (type) {
        case 'oximeter':
          await this.bluetoothService.connectOximeter();
          break;
        case 'thermometer':
          await this.bluetoothService.connectThermometer();
          break;
        case 'scale':
          await this.bluetoothService.connectScale();
          break;
        case 'blood_pressure':
          await this.bluetoothService.connectBloodPressure();
          break;
      }
    } catch (error) {
      console.error('Erro ao conectar dispositivo:', error);
    } finally {
      this.isConnecting = false;
      this.connectingType = null;
    }
  }

  disconnectDevice(type: DeviceType): void {
    const device = this.connectedDevices.find(d => d.type === type);
    if (device) {
      this.bluetoothService.disconnect(device.id);
    }
  }

  private processReading(reading: VitalReading): void {
    const values = reading.values;
    
    if (values.spo2 !== undefined) this.latestReadings['spo2'] = values.spo2;
    if (values.pulseRate !== undefined) this.latestReadings['pulseRate'] = values.pulseRate;
    if (values.temperature !== undefined) this.latestReadings['temperature'] = values.temperature;
    if (values.weight !== undefined) this.latestReadings['weight'] = values.weight;
    if (values.systolic !== undefined) this.latestReadings['systolic'] = values.systolic;
    if (values.diastolic !== undefined) this.latestReadings['diastolic'] = values.diastolic;
    if (values.heartRate !== undefined) this.latestReadings['heartRate'] = values.heartRate;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
