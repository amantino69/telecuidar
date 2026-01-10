import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { IconComponent } from '@shared/components/atoms/icon/icon';
import { MedicalDevicesSyncService } from '@app/core/services/medical-devices-sync.service';

// Componentes do paciente/operador
import { DeviceConnectionPanelComponent } from './components/device-connection-panel';
import { AuscultationPanelComponent } from './components/auscultation-panel';
import { ExamCameraPanelComponent } from './components/exam-camera-panel';

// Componentes do médico
import { VitalSignsPanelComponent } from './components/vital-signs-panel';
import { DoctorStreamReceiverComponent } from './components/doctor-stream-receiver';

type SubTab = 'vitals' | 'auscultation' | 'exam';

@Component({
  selector: 'app-medical-devices-tab',
  standalone: true,
  imports: [
    CommonModule, 
    IconComponent,
    DeviceConnectionPanelComponent,
    AuscultationPanelComponent,
    ExamCameraPanelComponent,
    VitalSignsPanelComponent,
    DoctorStreamReceiverComponent
  ],
  template: `
    <div class="medical-devices-tab">
      <!-- Header com status de conexão -->
      <div class="sync-status" [class.connected]="isConnected">
        <span class="sync-dot"></span>
        <span class="sync-text">{{ isConnected ? 'Sincronizado' : 'Conectando...' }}</span>
      </div>

      <!-- Conteúdo baseado no papel do usuário -->
      <div class="sections-container">
        @if (isOperator) {
          <!-- ========== INTERFACE DO PACIENTE/ASSISTENTE ========== -->
          
          <!-- Seção: Sinais Vitais -->
          <section class="content-section" [class.active]="activeSubTab === 'vitals'">
            <button class="section-header" (click)="setActiveSubTab('vitals')">
              <div class="section-info">
                <app-icon name="heart" [size]="20" class="section-icon" />
                <div class="section-text">
                  <h3 class="section-title">Sinais Vitais</h3>
                  <p class="section-desc">Oximetria, pressão arterial e frequência</p>
                </div>
              </div>
              <app-icon name="chevron-down" [size]="18" class="section-arrow" />
            </button>
            @if (activeSubTab === 'vitals') {
              <div class="section-content">
                <app-device-connection-panel
                  [appointmentId]="appointmentId"
                  [userrole]="userrole">
                </app-device-connection-panel>
              </div>
            }
          </section>

          <!-- Seção: Ausculta -->
          <section class="content-section" [class.active]="activeSubTab === 'auscultation'">
            <button class="section-header" (click)="setActiveSubTab('auscultation')">
              <div class="section-info">
                <app-icon name="mic" [size]="20" class="section-icon" />
                <div class="section-text">
                  <h3 class="section-title">Ausculta</h3>
                  <p class="section-desc">Estetoscópio digital para sons cardíacos</p>
                </div>
              </div>
              <app-icon name="chevron-down" [size]="18" class="section-arrow" />
            </button>
            @if (activeSubTab === 'auscultation') {
              <div class="section-content">
                <app-auscultation-panel
                  [appointmentId]="appointmentId"
                  [userrole]="userrole">
                </app-auscultation-panel>
              </div>
            }
          </section>

          <!-- Seção: Câmera de Exame -->
          <section class="content-section" [class.active]="activeSubTab === 'exam'">
            <button class="section-header" (click)="setActiveSubTab('exam')">
              <div class="section-info">
                <app-icon name="video" [size]="20" class="section-icon" />
                <div class="section-text">
                  <h3 class="section-title">Câmera de Exame</h3>
                  <p class="section-desc">Otoscópio, dermatoscópio e outras câmeras</p>
                </div>
              </div>
              <app-icon name="chevron-down" [size]="18" class="section-arrow" />
            </button>
            @if (activeSubTab === 'exam') {
              <div class="section-content">
                <app-exam-camera-panel
                  [appointmentId]="appointmentId"
                  [userrole]="userrole">
                </app-exam-camera-panel>
              </div>
            }
          </section>

        } @else {
          <!-- ========== INTERFACE DO MÉDICO ========== -->
          
          <!-- Seção: Sinais Vitais -->
          <section class="content-section" [class.active]="activeSubTab === 'vitals'">
            <button class="section-header" (click)="setActiveSubTab('vitals')">
              <div class="section-info">
                <app-icon name="heart" [size]="20" class="section-icon" />
                <div class="section-text">
                  <h3 class="section-title">Sinais Vitais</h3>
                  <p class="section-desc">Dados recebidos do paciente</p>
                </div>
              </div>
              <app-icon name="chevron-down" [size]="18" class="section-arrow" />
            </button>
            @if (activeSubTab === 'vitals') {
              <div class="section-content">
                <div class="refresh-bar">
                  <button class="btn-refresh" (click)="refreshVitals()" [disabled]="isRefreshing">
                    <app-icon name="refresh-cw" [size]="16" [class.spinning]="isRefreshing" />
                    {{ isRefreshing ? 'Atualizando...' : 'Atualizar Agora' }}
                  </button>
                </div>
                <app-vital-signs-panel
                  #vitalSignsPanel
                  [appointmentId]="appointmentId"
                  [userrole]="userrole">
                </app-vital-signs-panel>
              </div>
            }
          </section>

          <!-- Seção: Ausculta -->
          <section class="content-section" [class.active]="activeSubTab === 'auscultation'">
            <button class="section-header" (click)="setActiveSubTab('auscultation')">
              <div class="section-info">
                <app-icon name="mic" [size]="20" class="section-icon" />
                <div class="section-text">
                  <h3 class="section-title">Ausculta</h3>
                  <p class="section-desc">Stream de áudio do estetoscópio</p>
                </div>
              </div>
              <app-icon name="chevron-down" [size]="18" class="section-arrow" />
            </button>
            @if (activeSubTab === 'auscultation') {
              <div class="section-content">
                <div class="refresh-bar">
                  <button class="btn-refresh" (click)="requestAuscultation()" [disabled]="isRequestingStream">
                    <app-icon name="refresh-cw" [size]="16" [class.spinning]="isRequestingStream" />
                    {{ isRequestingStream ? 'Solicitando...' : 'Solicitar Ausculta' }}
                  </button>
                </div>
                <app-doctor-stream-receiver
                  [appointmentId]="appointmentId"
                  [userrole]="userrole"
                  [expectedStreamType]="'auscultation'">
                </app-doctor-stream-receiver>
              </div>
            }
          </section>

          <!-- Seção: Câmera de Exame -->
          <section class="content-section" [class.active]="activeSubTab === 'exam'">
            <button class="section-header" (click)="setActiveSubTab('exam')">
              <div class="section-info">
                <app-icon name="video" [size]="20" class="section-icon" />
                <div class="section-text">
                  <h3 class="section-title">Câmera de Exame</h3>
                  <p class="section-desc">Stream de vídeo do dispositivo</p>
                </div>
              </div>
              <app-icon name="chevron-down" [size]="18" class="section-arrow" />
            </button>
            @if (activeSubTab === 'exam') {
              <div class="section-content">
                <div class="refresh-bar">
                  <button class="btn-refresh" (click)="requestExamCamera()" [disabled]="isRequestingStream">
                    <app-icon name="refresh-cw" [size]="16" [class.spinning]="isRequestingStream" />
                    {{ isRequestingStream ? 'Solicitando...' : 'Solicitar Câmera' }}
                  </button>
                </div>
                <app-doctor-stream-receiver
                  [appointmentId]="appointmentId"
                  [userrole]="userrole"
                  [expectedStreamType]="'video'">
                </app-doctor-stream-receiver>
              </div>
            }
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .medical-devices-tab {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
    }

    /* Status de sincronização */
    .sync-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-muted);

      .sync-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-warning);
        animation: pulse 1.5s infinite;
      }

      &.connected {
        color: var(--color-success);
        
        .sync-dot {
          background: var(--color-success);
          animation: none;
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Container das seções */
    .sections-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Seção individual */
    .content-section {
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      overflow: hidden;
      transition: all 0.2s ease;

      &.active {
        border-color: var(--color-primary);
        box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.15);
      }
    }

    /* Header da seção (clicável) */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 14px 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: var(--bg-tertiary);
      }

      .content-section.active & {
        background: var(--color-primary);
        
        .section-icon, .section-title, .section-desc, .section-arrow {
          color: white !important;
        }
      }
    }

    .section-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-icon {
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .section-text {
      text-align: left;
    }

    .section-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
    }

    .section-desc {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.2;
    }

    .section-arrow {
      color: var(--text-muted);
      transition: transform 0.2s ease;
      flex-shrink: 0;

      .content-section.active & {
        transform: rotate(90deg);
      }
    }

    /* Conteúdo expandido */
    .section-content {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-primary);
      animation: slideDown 0.2s ease;
    }

    /* Barra de atualização */
    .refresh-bar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
    }

    .btn-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: var(--color-primary-dark);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .spinning {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class MedicalDevicesTabComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';
  @Input() initialSubTab: SubTab = 'vitals';

  activeSubTab: SubTab = 'vitals';
  isConnected = false;
  isRefreshing = false;
  isRequestingStream = false;

  private subscriptions = new Subscription();

  constructor(private syncService: MedicalDevicesSyncService) {}

  /**
   * Determina se o usuário é operador (quem usa os dispositivos)
   * Paciente, Assistente e Admin podem operar os dispositivos
   * Médico/Profissional apenas recebe os dados
   */
  get isOperator(): boolean {
    const role = this.userrole?.toUpperCase();
    return role === 'PATIENT' || role === 'ASSISTANT' || role === 'ADMIN';
  }

  ngOnInit(): void {
    // Define a sub-tab inicial se fornecida
    if (this.initialSubTab) {
      this.activeSubTab = this.initialSubTab;
    }
    
    // Conecta ao hub de dispositivos
    if (this.appointmentId) {
      console.log('[MedicalDevicesTab] Tentando conectar ao hub com appointmentId:', this.appointmentId);
      this.syncService.connect(this.appointmentId);
    } else {
      console.warn('[MedicalDevicesTab] appointmentId não definido!');
    }

    // Observa estado da conexão
    this.subscriptions.add(
      this.syncService.isConnected$.subscribe(connected => {
        console.log('[MedicalDevicesTab] Estado de conexão:', connected);
        this.isConnected = connected;
      })
    );

    // Observa erros de conexão
    this.subscriptions.add(
      this.syncService.connectionError$.subscribe(error => {
        console.error('[MedicalDevicesTab] Erro de conexão:', error);
      })
    );

    // Para o médico: muda automaticamente para a aba do tipo de stream recebido
    if (!this.isOperator) {
      this.subscriptions.add(
        this.syncService.streamType$.subscribe(streamType => {
          if (streamType === 'auscultation') {
            this.activeSubTab = 'auscultation';
          } else if (streamType === 'video') {
            this.activeSubTab = 'exam';
          }
        })
      );
    }
  }

  setActiveSubTab(tab: SubTab): void {
    this.activeSubTab = tab;
  }

  /**
   * Atualiza os sinais vitais buscando diretamente da API
   */
  async refreshVitals(): Promise<void> {
    if (!this.appointmentId || this.isRefreshing) return;
    
    this.isRefreshing = true;
    console.log('[MedicalDevicesTab] Atualizando sinais vitais...');
    
    try {
      // Força reconexão ao hub se necessário
      if (!this.isConnected) {
        await this.syncService.connect(this.appointmentId);
      }
      
      // Solicita atualização via hub
      await this.syncService.requestVitalsUpdate(this.appointmentId);
      
    } catch (error) {
      console.error('[MedicalDevicesTab] Erro ao atualizar vitais:', error);
    } finally {
      setTimeout(() => {
        this.isRefreshing = false;
      }, 1000);
    }
  }

  /**
   * Solicita ao paciente que inicie a transmissão de ausculta
   */
  async requestAuscultation(): Promise<void> {
    if (!this.appointmentId || this.isRequestingStream) return;
    
    this.isRequestingStream = true;
    console.log('[MedicalDevicesTab] Solicitando ausculta...');
    
    try {
      // Força reconexão ao hub se necessário
      if (!this.isConnected) {
        await this.syncService.connect(this.appointmentId);
      }
      
      // Solicita stream de ausculta
      await this.syncService.requestDeviceStream(this.appointmentId, 'auscultation');
      
    } catch (error) {
      console.error('[MedicalDevicesTab] Erro ao solicitar ausculta:', error);
    } finally {
      setTimeout(() => {
        this.isRequestingStream = false;
      }, 2000);
    }
  }

  /**
   * Solicita ao paciente que inicie a transmissão da câmera de exame
   */
  async requestExamCamera(): Promise<void> {
    if (!this.appointmentId || this.isRequestingStream) return;
    
    this.isRequestingStream = true;
    console.log('[MedicalDevicesTab] Solicitando câmera de exame...');
    
    try {
      // Força reconexão ao hub se necessário
      if (!this.isConnected) {
        await this.syncService.connect(this.appointmentId);
      }
      
      // Solicita stream de vídeo
      await this.syncService.requestDeviceStream(this.appointmentId, 'video');
      
    } catch (error) {
      console.error('[MedicalDevicesTab] Erro ao solicitar câmera:', error);
    } finally {
      setTimeout(() => {
        this.isRequestingStream = false;
      }, 2000);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.syncService.disconnect();
  }
}
