import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { UsersService, User } from '@core/services/users.service';
import { AppointmentsService, Appointment } from '@core/services/appointments.service';

@Component({
  selector: 'app-patient-data-tab',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './patient-data-tab.html',
  styleUrls: ['./patient-data-tab.scss']
})
export class PatientDataTabComponent implements OnInit, OnChanges {
  @Input() appointmentId: string | null = null;
  @Input() appointment: Appointment | null = null;
  
  patientData: User | null = null;
  loading = false;

  constructor(
    private usersService: UsersService,
    private appointmentsService: AppointmentsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadPatientData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appointment'] && changes['appointment'].currentValue) {
      this.loadPatientData();
    }
  }

  loadPatientData() {
    if (this.appointment?.patientId) {
      this.loading = true;
      this.usersService.getUserById(this.appointment.patientId).subscribe({
        next: (user) => {
          this.patientData = user;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erro ao carregar dados do paciente:', error);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  getAge(birthDate?: string): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  formatPhone(phone?: string): string {
    if (!phone) return 'Não informado';
    return phone;
  }
}
