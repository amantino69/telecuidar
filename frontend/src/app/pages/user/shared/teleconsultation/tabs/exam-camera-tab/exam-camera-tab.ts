import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamCameraPanelComponent } from '../medical-devices-tab/components/exam-camera-panel';
import { DoctorStreamReceiverComponent } from '../medical-devices-tab/components/doctor-stream-receiver';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-exam-camera-tab',
  standalone: true,
  imports: [
    CommonModule,
    ExamCameraPanelComponent,
    DoctorStreamReceiverComponent
  ],
  template: `
    <div class="exam-camera-tab">
      @if (isOperator) {
        <app-exam-camera-panel
          [appointmentId]="appointmentId"
          [userrole]="userrole">
        </app-exam-camera-panel>
      } @else {
        <app-doctor-stream-receiver
          [appointmentId]="appointmentId"
          [userrole]="userrole"
          [expectedStreamType]="'video'">
        </app-doctor-stream-receiver>
      }
    </div>
  `,
  styles: [`
    .exam-camera-tab {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class ExamCameraTabComponent {
  @Input() appointmentId: string | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';

  constructor(private authService: AuthService) {}

  get isOperator(): boolean {
    return this.userrole === 'PATIENT' || this.userrole === 'ASSISTANT' || this.userrole === 'ADMIN';
  }
}
