import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { Appointment } from '@core/services/appointments.service';

@Component({
  selector: 'app-appointment-details-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  templateUrl: './appointment-details-modal.html',
  styleUrls: ['./appointment-details-modal.scss']
})
export class AppointmentDetailsModalComponent {
  @Input() appointment: Appointment | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(): void {
    this.onCancel();
  }

  onCancel(): void {
    this.close.emit();
  }
}
