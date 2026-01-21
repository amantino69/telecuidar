import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BluetoothDevicesService, VitalReading } from '@app/core/services/bluetooth-devices.service';

interface DeviceReading {
  timestamp: Date;
  weight?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
}

@Component({
  selector: 'app-bluetooth-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bluetooth-test-page">
      <header class="page-header">
        <h1>🩺 Teste de Dispositivos Bluetooth</h1>
        <p class="subtitle">Captura e exibição de dados - MIBFS & BLESmart</p>
      </header>

      @if (!bluetoothAvailable) {
        <div class="alert alert-error">
          <span class="icon">⚠️</span>
          <div>
            <strong>Web Bluetooth não disponível</strong>
            <p>Use Chrome ou Edge em conexão HTTPS</p>
          </div>
        </div>
      }

      <div class="devices-grid">
        <!-- Balança MIBFS -->
        <div class="device-card">
          <div class="device-header">
            <span class="device-icon">⚖️</span>
            <div>
              <h2>Balança MIBFS</h2>
              <p class="device-model">Xiaomi Mi Body Composition Scale 2</p>
            </div>
          </div>

          <div class="device-status" [class.connected]="scaleConnected">
            <span class="status-dot"></span>
            {{ scaleConnected ? 'Conectado' : 'Desconectado' }}
          </div>

          @if (!scaleConnected) {
            <button 
              class="btn-connect" 
              (click)="connectScale()"
              [disabled]="!bluetoothAvailable">
              <span class="btn-icon">🔗</span>
              Conectar Balança
            </button>
          } @else {
            <button 
              class="btn-disconnect" 
              (click)="disconnectScale()">
              <span class="btn-icon">🔌</span>
              Desconectar
            </button>
          }

          @if (scaleConnected) {
            <div class="instruction-box">
              <p>✅ <strong>Balança conectada!</strong></p>
              <p>SUBA NA BALANÇA AGORA (descalço)</p>
              <p class="small">Aguarde o bip de confirmação</p>
            </div>
          }

          @if (lastScaleReading) {
            <div class="reading-display">
              <div class="reading-value">
                <span class="value">{{ lastScaleReading.weight }}</span>
                <span class="unit">kg</span>
              </div>
              <div class="reading-time">
                {{ formatTime(lastScaleReading.timestamp) }}
              </div>
            </div>
          }

          @if (scaleHistory.length > 0) {
            <div class="history">
              <h3>Histórico de Leituras</h3>
              <div class="history-list">
                @for (reading of scaleHistory; track reading.timestamp) {
                  <div class="history-item">
                    <span class="history-value">{{ reading.weight }} kg</span>
                    <span class="history-time">{{ formatTime(reading.timestamp) }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Medidor de Pressão BLESmart -->
        <div class="device-card">
          <div class="device-header">
            <span class="device-icon">🩺</span>
            <div>
              <h2>BLESmart</h2>
              <p class="device-model">Medidor de Pressão Arterial</p>
            </div>
          </div>

          <div class="device-status" [class.connected]="bpConnected">
            <span class="status-dot"></span>
            {{ bpConnected ? 'Conectado' : 'Desconectado' }}
          </div>

          @if (!bpConnected) {
            <button 
              class="btn-connect" 
              (click)="connectBloodPressure()"
              [disabled]="!bluetoothAvailable">
              <span class="btn-icon">🔗</span>
              Conectar Medidor
            </button>
          } @else {
            <button 
              class="btn-disconnect" 
              (click)="disconnectBloodPressure()">
              <span class="btn-icon">🔌</span>
              Desconectar
            </button>
          }

          @if (bpConnected) {
            <div class="instruction-box">
              <p>✅ <strong>Medidor conectado!</strong></p>
              <p>INICIE A MEDIÇÃO NO APARELHO</p>
              <p class="small">Aguarde a conclusão da medição</p>
            </div>
          }

          @if (lastBPReading) {
            <div class="reading-display bp-display">
              <div class="bp-values">
                <div class="bp-value systolic">
                  <span class="label">Sistólica</span>
                  <span class="value">{{ lastBPReading.systolic }}</span>
                  <span class="unit">mmHg</span>
                </div>
                <div class="bp-separator">/</div>
                <div class="bp-value diastolic">
                  <span class="label">Diastólica</span>
                  <span class="value">{{ lastBPReading.diastolic }}</span>
                  <span class="unit">mmHg</span>
                </div>
              </div>
              @if (lastBPReading.heartRate) {
                <div class="bp-heart-rate">
                  <span class="icon">💓</span>
                  <span class="value">{{ lastBPReading.heartRate }} bpm</span>
                </div>
              }
              <div class="reading-time">
                {{ formatTime(lastBPReading.timestamp) }}
              </div>
            </div>
          }

          @if (bpHistory.length > 0) {
            <div class="history">
              <h3>Histórico de Leituras</h3>
              <div class="history-list">
                @for (reading of bpHistory; track reading.timestamp) {
                  <div class="history-item bp-history">
                    <span class="history-value">
                      {{ reading.systolic }}/{{ reading.diastolic }} mmHg
                      @if (reading.heartRate) {
                        <span class="hr">💓 {{ reading.heartRate }} bpm</span>
                      }
                    </span>
                    <span class="history-time">{{ formatTime(reading.timestamp) }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Console de Logs -->
      <div class="logs-panel">
        <div class="logs-header">
          <h3>📋 Console de Logs</h3>
          <button class="btn-clear" (click)="clearLogs()">Limpar</button>
        </div>
        <div class="logs-content" #logsContainer>
          @for (log of logs; track log.timestamp) {
            <div class="log-entry" [class]="'log-' + log.type">
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          }
          @if (logs.length === 0) {
            <div class="log-empty">Nenhum log ainda. Conecte um dispositivo para começar.</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bluetooth-test-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }

    .page-header {
      text-align: center;
      color: white;
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .subtitle {
      font-size: 18px;
      opacity: 0.9;
      margin: 0;
    }

    .alert {
      background: white;
      padding: 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .alert-error {
      border-left: 4px solid #ef4444;
    }

    .alert .icon {
      font-size: 32px;
    }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .device-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .device-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .device-icon {
      font-size: 48px;
    }

    .device-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }

    .device-model {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #6b7280;
    }

    .device-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .device-status.connected {
      background: #d1fae5;
      color: #059669;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
    }

    .device-status.connected .status-dot {
      background: #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .btn-connect, .btn-disconnect {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: all 0.2s;
      margin-bottom: 16px;
    }

    .btn-connect {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-connect:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn-connect:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    .btn-disconnect {
      background: #ef4444;
      color: white;
    }

    .btn-disconnect:hover {
      background: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
    }

    .btn-icon {
      font-size: 20px;
    }

    .instruction-box {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .instruction-box p {
      margin: 0 0 8px 0;
      color: #92400e;
    }

    .instruction-box p:last-child {
      margin-bottom: 0;
    }

    .instruction-box .small {
      font-size: 13px;
      opacity: 0.8;
    }

    .reading-display {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 3px solid #10b981;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 16px;
      text-align: center;
    }

    .reading-value {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
    }

    .reading-value .value {
      font-size: 64px;
      font-weight: 700;
      color: #059669;
      line-height: 1;
    }

    .reading-value .unit {
      font-size: 28px;
      font-weight: 600;
      color: #047857;
    }

    .reading-time {
      font-size: 14px;
      color: #047857;
      margin-top: 12px;
      opacity: 0.8;
    }

    .bp-display {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-color: #ef4444;
    }

    .bp-values {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .bp-value {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .bp-value .label {
      font-size: 12px;
      font-weight: 600;
      color: #dc2626;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .bp-value .value {
      font-size: 48px;
      font-weight: 700;
      color: #dc2626;
      line-height: 1;
    }

    .bp-value .unit {
      font-size: 14px;
      font-weight: 600;
      color: #b91c1c;
      margin-top: 4px;
    }

    .bp-separator {
      font-size: 48px;
      font-weight: 300;
      color: #dc2626;
      margin: 0 8px;
    }

    .bp-heart-rate {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #fecaca;
    }

    .bp-heart-rate .icon {
      font-size: 24px;
    }

    .bp-heart-rate .value {
      font-size: 20px;
      font-weight: 600;
      color: #dc2626;
    }

    .history {
      margin-top: 16px;
    }

    .history h3 {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px 0;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 3px solid #10b981;
    }

    .history-item.bp-history {
      border-left-color: #ef4444;
    }

    .history-value {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }

    .history-value .hr {
      font-size: 14px;
      color: #6b7280;
      margin-left: 12px;
    }

    .history-time {
      font-size: 13px;
      color: #6b7280;
    }

    .logs-panel {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .logs-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
    }

    .btn-clear {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-clear:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .logs-content {
      max-height: 400px;
      overflow-y: auto;
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px;
    }

    .log-entry {
      display: flex;
      gap: 12px;
      padding: 8px;
      margin-bottom: 4px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
    }

    .log-info {
      background: #dbeafe;
      color: #1e40af;
    }

    .log-success {
      background: #d1fae5;
      color: #065f46;
    }

    .log-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .log-error {
      background: #fee2e2;
      color: #991b1b;
    }

    .log-time {
      font-weight: 600;
      min-width: 80px;
    }

    .log-message {
      flex: 1;
    }

    .log-empty {
      text-align: center;
      color: #9ca3af;
      padding: 40px 20px;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .devices-grid {
        grid-template-columns: 1fr;
      }

      .reading-value .value {
        font-size: 48px;
      }

      .bp-value .value {
        font-size: 36px;
      }
    }
  `]
})
export class BluetoothTestComponent implements OnInit, OnDestroy {
  bluetoothAvailable = false;
  scaleConnected = false;
  bpConnected = false;

  lastScaleReading: DeviceReading | null = null;
  lastBPReading: DeviceReading | null = null;

  scaleHistory: DeviceReading[] = [];
  bpHistory: DeviceReading[] = [];

  logs: Array<{timestamp: Date, type: 'info' | 'success' | 'warning' | 'error', message: string}> = [];

  private subscriptions = new Subscription();
  private connectedDevices = new Set<string>();

  constructor(private bluetoothService: BluetoothDevicesService) {}

  ngOnInit(): void {
    this.bluetoothAvailable = this.bluetoothService.isBluetoothAvailable();
    this.addLog('info', 'Sistema iniciado - Pronto para conectar dispositivos');

    if (!this.bluetoothAvailable) {
      this.addLog('error', 'Web Bluetooth API não disponível neste navegador');
    }

    // Subscribe to readings
    const sub = this.bluetoothService.readings$.subscribe(reading => {
      this.handleReading(reading);
    });
    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.connectedDevices.forEach(deviceId => {
      this.bluetoothService.disconnect(deviceId);
    });
  }

  async connectScale(): Promise<void> {
    this.addLog('info', 'Iniciando conexão com balança MIBFS...');
    try {
      const device = await this.bluetoothService.connectScale();
      if (device) {
        this.scaleConnected = true;
        this.connectedDevices.add(device.id);
        this.addLog('success', `Balança conectada: ${device.name} (${device.id})`);
        this.addLog('warning', 'SUBA NA BALANÇA AGORA! Você tem 10 segundos.');
      }
    } catch (error: any) {
      this.addLog('error', `Erro ao conectar balança: ${error.message}`);
      console.error('Error connecting scale:', error);
    }
  }

  async connectBloodPressure(): Promise<void> {
    this.addLog('info', 'Iniciando conexão com medidor BLESmart...');
    try {
      const device = await this.bluetoothService.connectBloodPressure();
      if (device) {
        this.bpConnected = true;
        this.connectedDevices.add(device.id);
        this.addLog('success', `Medidor conectado: ${device.name} (${device.id})`);
        this.addLog('warning', 'INICIE A MEDIÇÃO NO APARELHO agora!');
      }
    } catch (error: any) {
      this.addLog('error', `Erro ao conectar medidor: ${error.message}`);
      console.error('Error connecting blood pressure:', error);
    }
  }

  disconnectScale(): void {
    const devices = Array.from(this.connectedDevices);
    devices.forEach(deviceId => {
      if (deviceId.includes('MIBFS') || deviceId.includes('MI')) {
        this.bluetoothService.disconnect(deviceId);
        this.connectedDevices.delete(deviceId);
        this.addLog('info', `Balança desconectada: ${deviceId}`);
      }
    });
    this.scaleConnected = false;
  }

  disconnectBloodPressure(): void {
    const devices = Array.from(this.connectedDevices);
    devices.forEach(deviceId => {
      if (!deviceId.includes('MIBFS') && !deviceId.includes('MI')) {
        this.bluetoothService.disconnect(deviceId);
        this.connectedDevices.delete(deviceId);
        this.addLog('info', `Medidor desconectado: ${deviceId}`);
      }
    });
    this.bpConnected = false;
  }

  private handleReading(reading: VitalReading): void {
    console.log('📊 Reading received:', reading);

    if (reading.deviceType === 'scale' && reading.values.weight !== undefined) {
      const deviceReading: DeviceReading = {
        timestamp: reading.timestamp,
        weight: reading.values.weight
      };
      this.lastScaleReading = deviceReading;
      this.scaleHistory.unshift(deviceReading);
      if (this.scaleHistory.length > 10) this.scaleHistory.pop();
      
      this.addLog('success', `⚖️ Peso capturado: ${reading.values.weight} kg`);
    }

    if (reading.deviceType === 'blood_pressure') {
      const deviceReading: DeviceReading = {
        timestamp: reading.timestamp,
        systolic: reading.values.systolic,
        diastolic: reading.values.diastolic,
        heartRate: reading.values.heartRate
      };
      this.lastBPReading = deviceReading;
      this.bpHistory.unshift(deviceReading);
      if (this.bpHistory.length > 10) this.bpHistory.pop();
      
      const hrText = reading.values.heartRate ? ` | 💓 ${reading.values.heartRate} bpm` : '';
      this.addLog('success', `🩺 Pressão capturada: ${reading.values.systolic}/${reading.values.diastolic} mmHg${hrText}`);
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  addLog(type: 'info' | 'success' | 'warning' | 'error', message: string): void {
    this.logs.unshift({
      timestamp: new Date(),
      type,
      message
    });
    if (this.logs.length > 100) this.logs.pop();
  }

  clearLogs(): void {
    this.logs = [];
    this.addLog('info', 'Logs limpos');
  }
}
