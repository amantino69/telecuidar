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
      <!-- Header -->
      <div class="tab-header">
        <div class="header-title">
          <app-icon name="bluetooth" [size]="22" />
          <h3>Dispositivos Médicos IoMT</h3>
        </div>
        <div class="connection-badge" [class.connected]="isConnected">
          <span class="dot"></span>
          {{ isConnected ? 'Sincronizado' : 'Conectando...' }}
        </div>
      </div>

      <!-- Sub-tabs para navegação -->
      <div class="sub-tabs">
        <button 
          class="sub-tab-btn"
          [class.active]="activeSubTab === 'vitals'"
          (click)="setActiveSubTab('vitals')">
          <app-icon name="activity" [size]="18" />
          <span>Sinais Vitais</span>
        </button>
        <button 
          class="sub-tab-btn"
          [class.active]="activeSubTab === 'auscultation'"
          (click)="setActiveSubTab('auscultation')">
          <app-icon name="mic" [size]="18" />
          <span>Ausculta</span>
        </button>
        <button 
          class="sub-tab-btn"
          [class.active]="activeSubTab === 'exam'"
          (click)="setActiveSubTab('exam')">
          <app-icon name="video" [size]="18" />
          <span>Exame Visual</span>
        </button>
      </div>

      <!-- Conteúdo baseado no papel do usuário -->
      <div class="tab-content">
        @if (isOperator) {
          <!-- Interface do Paciente/Assistente/Admin (quem opera os dispositivos) -->
          @switch (activeSubTab) {
            @case ('vitals') {
              <app-device-connection-panel
                [appointmentId]="appointmentId"
                [userrole]="userrole">
              </app-device-connection-panel>
            }
            @case ('auscultation') {
              <app-auscultation-panel
                [appointmentId]="appointmentId"
                [userrole]="userrole">
              </app-auscultation-panel>
            }
            @case ('exam') {
              <app-exam-camera-panel
                [appointmentId]="appointmentId"
                [userrole]="userrole">
              </app-exam-camera-panel>
            }
          }
        } @else {
          <!-- Interface do Médico (quem recebe os dados) -->
          @switch (activeSubTab) {
            @case ('vitals') {
              <app-vital-signs-panel
                [appointmentId]="appointmentId"
                [userrole]="userrole">
              </app-vital-signs-panel>
            }
            @case ('auscultation') {
              <app-doctor-stream-receiver
                [appointmentId]="appointmentId"
                [userrole]="userrole">
              </app-doctor-stream-receiver>
            }
            @case ('exam') {
              <app-doctor-stream-receiver
                [appointmentId]="appointmentId"
                [userrole]="userrole">
              </app-doctor-stream-receiver>
            }
          }
        }
      </div>

      <!-- Footer com informações -->
      <div class="tab-footer">
        <div class="footer-info">
          <app-icon name="info" [size]="14" />
          <span>
            @if (isOperator) {
              Conecte os dispositivos para enviar dados em tempo real ao médico
            } @else {
              Aguarde o paciente conectar os dispositivos para visualizar os dados
            }
          </span>
        </div>
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

    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border-color);

      .header-title {
        display: flex;
        align-items: center;
        gap: 10px;

        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
      }

      .connection-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        background: var(--bg-secondary);
        color: var(--text-secondary);

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-secondary);
        }

        &.connected {
          background: var(--bg-success-subtle);
          color: var(--color-success);

          .dot {
            background: var(--color-success);
            animation: pulse-dot 2s infinite;
          }
        }
      }
    }

    .sub-tabs {
      display: flex;
      padding: 12px 16px;
      gap: 8px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);

      .sub-tab-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        background: transparent;
        border: none;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        &.active {
          background: var(--color-primary);
          color: white;
        }
      }
    }

    .tab-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      > * {
        flex: 1;
        overflow-y: auto;
      }
    }

    .tab-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);

      .footer-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }
  `]
})
export class MedicalDevicesTabComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';

  activeSubTab: SubTab = 'vitals';
  isConnected = false;

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
    // Conecta ao hub de dispositivos
    if (this.appointmentId) {
      this.syncService.connect(this.appointmentId);
    }

    // Observa estado da conexão
    this.subscriptions.add(
      this.syncService.isConnected$.subscribe(connected => {
        this.isConnected = connected;
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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.syncService.disconnect();
  }
}
