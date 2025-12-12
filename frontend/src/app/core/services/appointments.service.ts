import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { User } from './users.service';
import { Specialty } from './specialties.service';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  specialtyId: string;
  specialtyName: string;
  date: string; // ISO Date
  time: string; // HH:mm
  status: AppointmentStatus;
  observation?: string;
  meetLink?: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string; // For display purposes (patient or professional avatar depending on context)
}

export interface AppointmentsFilter {
  status?: AppointmentStatus | 'all' | 'upcoming' | 'past';
  search?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private mockAppointments: Appointment[] = [
    {
      id: '1',
      patientId: '1',
      patientName: 'João Silva',
      professionalId: '2',
      professionalName: 'Dr. Maria Santos',
      specialtyId: '1',
      specialtyName: 'Cardiologia',
      date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), // 2 days from now
      time: '14:00',
      status: 'scheduled',
      observation: 'Check-up de rotina',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      createdAt: '2024-03-01T10:00:00',
      updatedAt: '2024-03-01T10:00:00',
      avatar: 'assets/avatars/maria.jpg'
    },
    {
      id: '2',
      patientId: '1',
      patientName: 'João Silva',
      professionalId: '5',
      professionalName: 'Dr. Carlos Ferreira',
      specialtyId: '2',
      specialtyName: 'Dermatologia',
      date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(), // 5 days from now
      time: '09:00',
      status: 'confirmed',
      createdAt: '2024-03-05T15:30:00',
      updatedAt: '2024-03-06T09:00:00',
      avatar: 'assets/avatars/carlos.jpg'
    },
    {
      id: '3',
      patientId: '1',
      patientName: 'João Silva',
      professionalId: '2',
      professionalName: 'Dr. Maria Santos',
      specialtyId: '1',
      specialtyName: 'Cardiologia',
      date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), // 10 days ago
      time: '16:00',
      status: 'completed',
      observation: 'Retorno',
      createdAt: '2024-02-20T11:00:00',
      updatedAt: '2024-02-20T11:00:00',
      avatar: 'assets/avatars/maria.jpg'
    },
    {
      id: '4',
      patientId: '1',
      patientName: 'João Silva',
      professionalId: '5',
      professionalName: 'Dr. Carlos Ferreira',
      specialtyId: '2',
      specialtyName: 'Dermatologia',
      date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), // 2 days ago
      time: '10:00',
      status: 'cancelled',
      createdAt: '2024-03-10T08:00:00',
      updatedAt: '2024-03-11T14:00:00',
      avatar: 'assets/avatars/carlos.jpg'
    }
  ];

  getAppointments(filter: AppointmentsFilter = {}): Observable<Appointment[]> {
    return of(this.mockAppointments).pipe(
      delay(500),
      map(appointments => {
        let filtered = [...appointments];

        // Filter by status/time
        if (filter.status) {
            const now = new Date();
            if (filter.status === 'upcoming') {
                filtered = filtered.filter(a => new Date(a.date) >= now && a.status !== 'cancelled' && a.status !== 'completed');
            } else if (filter.status === 'past') {
                filtered = filtered.filter(a => new Date(a.date) < now || a.status === 'completed');
            } else if (filter.status !== 'all') {
                filtered = filtered.filter(a => a.status === filter.status);
            }
        }

        // Search
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          filtered = filtered.filter(a => 
            a.professionalName.toLowerCase().includes(searchLower) ||
            a.specialtyName.toLowerCase().includes(searchLower) ||
            a.patientName.toLowerCase().includes(searchLower)
          );
        }

        // Sort by date (default desc)
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return filtered;
      })
    );
  }

  getAppointmentById(id: string): Observable<Appointment | undefined> {
    return of(this.mockAppointments.find(a => a.id === id)).pipe(delay(300));
  }

  cancelAppointment(id: string): Observable<boolean> {
    const index = this.mockAppointments.findIndex(a => a.id === id);
    if (index !== -1) {
      this.mockAppointments[index].status = 'cancelled';
      this.mockAppointments[index].updatedAt = new Date().toISOString();
      return of(true).pipe(delay(500));
    }
    return of(false);
  }
}
