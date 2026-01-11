import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuscultationPanelComponent } from '../medical-devices-tab/components/auscultation-panel';
import { DoctorStreamReceiverComponent } from '../medical-devices-tab/components/doctor-stream-receiver';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-auscultation-tab',
  standalone: true,
  imports: [
    CommonModule,
    AuscultationPanelComponent,
    DoctorStreamReceiverComponent
  ],
  template: `
    <div class="auscultation-tab">
      @if (isOperator) {
        <app-auscultation-panel
          [appointmentId]="appointmentId"
          [userrole]="userrole">
        </app-auscultation-panel>
      } @else {
        <app-doctor-stream-receiver
          [appointmentId]="appointmentId"
          [userrole]="userrole">
        </app-doctor-stream-receiver>
      }
    </div>
  `,
  styles: [`
    .auscultation-tab {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AuscultationTabComponent {
  @Input() appointmentId: string | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';

  constructor(private authService: AuthService) {}

  get isOperator(): boolean {
    return this.userrole === 'PATIENT' || this.userrole === 'ASSISTANT' || this.userrole === 'ADMIN';
  }
}
