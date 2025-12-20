import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

export interface Trend {
  direction: 'up' | 'down';
  value: string;
}

export interface PlatformStats {
  totalUsers: number;
  usersTrend?: Trend;
  appointmentsScheduled: number;
  appointmentsTrend?: Trend;
  occupancyRate: number;
  occupancyTrend?: Trend;
  averageRating: number;
  ratingTrend?: Trend;
  activeProfessionals: number;
  activePatients: number;
  todayAppointments: number;
  averageConsultationTime: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export interface DashboardStatsDto {
  users: {
    totalUsers: number;
    activeUsers: number;
    patients: number;
    professionals: number;
    admins: number;
  };
  appointments: {
    total: number;
    scheduled: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = `${API_BASE_URL}/reports`;

  constructor(private http: HttpClient) {}

  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<DashboardStatsDto>(`${this.apiUrl}/dashboard`).pipe(
      map(data => {
        const stats: PlatformStats = {
          totalUsers: data.users.totalUsers,
          appointmentsScheduled: data.appointments.scheduled,
          occupancyRate: 0,
          averageRating: 4.5,
          activeProfessionals: data.users.professionals,
          activePatients: data.users.patients,
          todayAppointments: data.appointments.inProgress,
          averageConsultationTime: 35
        };
        return stats;
      })
    );
  }

  getAppointmentsByStatus(): Observable<ChartData> {
    return this.http.get<DashboardStatsDto>(`${this.apiUrl}/dashboard`).pipe(
      map(data => ({
        labels: ['Agendadas', 'Confirmadas', 'Em Andamento', 'Concluídas', 'Canceladas'],
        datasets: [{
          label: 'Status de Agendamentos',
          data: [
            data.appointments.scheduled,
            data.appointments.confirmed,
            data.appointments.inProgress,
            data.appointments.completed,
            data.appointments.cancelled
          ],
          backgroundColor: [
            '#3b82f6', // blue-500
            '#8b5cf6', // violet-500
            '#f59e0b', // amber-500
            '#10b981', // green-500
            '#ef4444'  // red-500
          ],
          borderWidth: 1
        }]
      }))
    );
  }

  getUsersByRole(): Observable<ChartData> {
    return this.http.get<DashboardStatsDto>(`${this.apiUrl}/dashboard`).pipe(
      map(data => ({
        labels: ['Pacientes', 'Profissionais', 'Administradores'],
        datasets: [{
          label: 'Usuários por Perfil',
          data: [
            data.users.patients,
            data.users.professionals,
            data.users.admins
          ],
          backgroundColor: [
            '#8b5cf6', // violet-500
            '#06b6d4', // cyan-500
            '#64748b'  // slate-500
          ],
          borderWidth: 1
        }]
      }))
    );
  }

  getMonthlyAppointments(): Observable<ChartData> {
    return this.http.get(`${this.apiUrl}`).pipe(
      map((data: any) => {
        // Se temos dados de mês a mês
        const monthlyData = data.appointmentsByMonth || [];
        const months = monthlyData.map((m: any) => m.month);
        const appointments = monthlyData.map((m: any) => m.appointments);
        
        return {
          labels: months.length > 0 ? months : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
          datasets: [{
            label: 'Consultas Realizadas',
            data: appointments.length > 0 ? appointments : [0, 0, 0, 0, 0, 0],
            borderColor: ['#3b82f6'],
            backgroundColor: ['rgba(59, 130, 246, 0.2)'],
            borderWidth: 2
          }]
        };
      })
    );
  }
}
