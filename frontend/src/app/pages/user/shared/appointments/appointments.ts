import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { SearchInputComponent } from '@shared/components/atoms/search-input/search-input';
import { AppointmentsService, Appointment, AppointmentsFilter, AppointmentStatus } from '@core/services/appointments.service';
import { AppointmentDetailsModalComponent } from './appointment-details-modal/appointment-details-modal';
import { ModalService } from '@core/services/modal.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    IconComponent,
    SearchInputComponent,
    AppointmentDetailsModalComponent
  ],
  templateUrl: './appointments.html',
  styleUrls: ['./appointments.scss']
})
export class AppointmentsComponent implements OnInit {
  appointments: Appointment[] = [];
  loading = false;
  userRole: 'patient' | 'professional' | 'admin' = 'patient';
  
  // Filters
  activeTab: 'all' | 'upcoming' | 'past' | 'cancelled' = 'all';
  searchQuery = '';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Modal
  selectedAppointment: Appointment | null = null;
  isDetailsModalOpen = false;

  constructor(
    private appointmentsService: AppointmentsService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.determineUserRole();
    this.loadAppointments();
  }

  determineUserRole() {
    const url = this.router.url;
    if (url.includes('/patient')) {
      this.userRole = 'patient';
    } else if (url.includes('/professional')) {
      this.userRole = 'professional';
    } else {
      this.userRole = 'admin';
    }
  }

  loadAppointments() {
    this.loading = true;
    const filter: AppointmentsFilter = {
      search: this.searchQuery,
    };

    if (this.activeTab === 'upcoming') {
        filter.status = 'upcoming';
    } else if (this.activeTab === 'past') {
        filter.status = 'past';
    } else if (this.activeTab === 'cancelled') {
        filter.status = 'cancelled';
    } else {
        filter.status = 'all';
    }

    this.appointmentsService.getAppointments(filter).subscribe(data => {
      this.appointments = data;
      this.sortAppointments();
      this.loading = false;
    });
  }

  onTabChange(tab: 'all' | 'upcoming' | 'past' | 'cancelled') {
    this.activeTab = tab;
    this.loadAppointments();
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.loadAppointments();
  }

  toggleSort() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortAppointments();
  }

  sortAppointments() {
    this.appointments.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  // Actions
  openDetails(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.isDetailsModalOpen = true;
  }

  closeDetails() {
    this.isDetailsModalOpen = false;
    this.selectedAppointment = null;
  }

  accessConsultation(appointment: Appointment) {
    if (appointment.meetLink) {
        window.open(appointment.meetLink, '_blank');
    }
  }

  cancelAppointment(appointment: Appointment) {
    this.modalService.confirm({
      title: 'Cancelar Consulta',
      message: 'Tem certeza que deseja cancelar esta consulta? Essa ação não pode ser desfeita.',
      confirmText: 'Sim, Cancelar',
      cancelText: 'Voltar',
      variant: 'danger'
    }).subscribe(result => {
      if (result.confirmed) {
        this.appointmentsService.cancelAppointment(appointment.id).subscribe(success => {
            if (success) {
                this.loadAppointments(); // Reload list
            }
        });
      }
    });
  }

  scheduleNew() {
    this.router.navigate(['/patient/scheduling']);
  }
}
