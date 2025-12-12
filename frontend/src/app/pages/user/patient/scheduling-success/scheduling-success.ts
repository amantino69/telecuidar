import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { Specialty } from '@core/services/specialties.service';
import { User } from '@core/services/users.service';

interface AppointmentDetails {
  specialty: Specialty;
  date: Date;
  time: string;
  professional: User;
  observation?: string;
}

@Component({
  selector: 'app-scheduling-success',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './scheduling-success.html',
  styleUrls: ['./scheduling-success.scss']
})
export class SchedulingSuccessComponent implements OnInit {
  appointment: AppointmentDetails | null = null;

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.appointment = navigation.extras.state['appointment'] as AppointmentDetails;
    }
  }

  ngOnInit(): void {
    if (!this.appointment) {
      // Redirect back if no state (e.g. direct access)
      this.router.navigate(['/patient/dashboard']);
    }
  }

  goToDashboard() {
    this.router.navigate(['/patient/dashboard']);
  }

  goToAppointments() {
    this.router.navigate(['/patient/appointments']); // Assuming this route will exist
  }
}
