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
          <span>Sinais Vitais</span>
        </div>
        <div class="connection-badge" [class.connected]="isConnected">
          <span class="dot"></span>
          {{ isConnected ? 'Sincronizado' : 'Conectando...' }}
        </div>
      </div>

      <!-- Conteúdo baseado no papel do usuário -->
      <div class="tab-content">
        @if (isOperator) {
          <!-- Interface do Paciente/Assistente/Admin (quem opera os dispositivos) -->
          <app-device-connection-panel
            [appointmentId]="appointmentId"
            [userrole]="userrole">
          </app-device-connection-panel>
        } @else {
          <!-- Interface do Médico (quem recebe os dados) -->
          <app-vital-signs-panel
            [appointmentId]="appointmentId"
            [userrole]="userrole">
          </app-vital-signs-panel>
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

    .accordion-nav {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--border-color);
    }

    .accordion-item {
      border-bottom: 1px solid var(--border-color);

      &:last-child {
        border-bottom: none;
      }

      .accordion-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: var(--bg-primary);
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        .accordion-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .accordion-status {
          display: flex;
          align-items: center;
          gap: 8px;

          .status-badge {
            font-size: 11px;
            color: var(--color-primary);
            padding: 2px 8px;
            background: var(--bg-success-subtle);
            border-radius: 10px;
          }
        }

        .chevron {
          transition: transform 0.2s ease;
          opacity: 0.5;
        }

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      &.expanded {
        .accordion-header {
          background: var(--color-primary);
          color: white;

          .accordion-status .status-badge {
            background: rgba(255, 255, 255, 0.2);
            color: white;
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
