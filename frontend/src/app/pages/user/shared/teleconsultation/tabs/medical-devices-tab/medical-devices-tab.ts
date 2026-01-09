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
      <!-- Header compacto -->
      <div class="tab-header">
        <div class="header-title">
          <app-icon name="activity" [size]="18" />
          <span>Dispositivos IoMT</span>
        </div>
        <div class="connection-badge" [class.connected]="isConnected">
          <span class="dot"></span>
          {{ isConnected ? 'Sincronizado' : 'Conectando...' }}
        </div>
      </div>

      <!-- Sub-tabs compactas -->
      <div class="sub-tabs">
        <button 
          class="sub-tab-btn"
          [class.active]="activeSubTab === 'vitals'"
          (click)="setActiveSubTab('vitals')">
          <app-icon name="heart" [size]="16" />
          <span>Sinais Vitais</span>
        </button>
        <button 
          class="sub-tab-btn"
          [class.active]="activeSubTab === 'auscultation'"
          (click)="setActiveSubTab('auscultation')">
          <app-icon name="mic" [size]="16" />
          <span>Ausculta</span>
        </button>
      </div>

      <!-- Seção Câmera de Exame (accordion) -->
      <div class="exam-section" [class.expanded]="activeSubTab === 'exam'">
        <button class="section-header" (click)="setActiveSubTab(activeSubTab === 'exam' ? 'vitals' : 'exam')">
          <div class="section-title">
            <app-icon name="video" [size]="16" />
            <span>Câmera de Exame</span>
          </div>
          <div class="section-status">
            <span class="status-text">{{ activeSubTab === 'exam' ? 'Transmitindo' : '' }}</span>
            <app-icon name="chevron-down" [size]="16" class="chevron" />
          </div>
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
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);

      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;

        span {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
      }

      .connection-badge {
        display: flex;
        align-items: center;
        gap: 5px;
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
          background: var(--color-secondary);
        }

        &.connected {
          background: var(--bg-success-subtle);
          color: var(--color-success);

          .dot {
            background: var(--color-success);
          }
        }
      }
    }

    .sub-tabs {
      display: flex;
      padding: 8px 12px;
      gap: 6px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-primary);

      .sub-tab-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 12px;
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
          border-color: var(--color-primary);
        }
      }
    }

    .exam-section {
      border-bottom: 1px solid var(--border-color);

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 10px 16px;
        border: none;
        background: var(--bg-secondary);
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-status {
          display: flex;
          align-items: center;
          gap: 8px;

          .status-text {
            font-size: 11px;
            color: var(--color-primary);
          }

          .chevron {
            transition: transform 0.2s ease;
            opacity: 0.5;
          }
        }

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      &.expanded {
        .section-header {
          background: var(--color-primary);
          color: white;

          .section-status .status-text {
            color: rgba(255, 255, 255, 0.8);
          }

          .chevron {
            transform: rotate(180deg);
            opacity: 1;
          }
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
