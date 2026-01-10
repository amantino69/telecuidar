import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

export type ReportType = 'users' | 'appointments' | 'specialties' | 'revenue' | 'satisfaction';
export type ExportFormat = 'pdf' | 'excel';

export interface ReportFilter {
  startDate: string;
  endDate: string;
  reportType?: ReportType;
}

export interface ReportStatistics {
  totalUsers: number;
  activeUsers: number;
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  totalRevenue: number;
  averageRating: number;
  totalSpecialties: number;
  activeSpecialties: number;
  newUsersThisMonth: number;
  appointmentsThisMonth: number;
  revenueThisMonth: number;
}

export interface UsersByRoleData {
  role: string;
  count: number;
  percentage: number;
}

export interface AppointmentsByStatusData {
  status: string;
  count: number;
  color: string;
}

export interface AppointmentsByMonthData {
  month: string;
  appointments: number;
  completed: number;
  canceled: number;
}

export interface SpecialtiesRankingData {
  specialty: string;
  appointments: number;
  revenue: number;
}

export interface ReportData {
  statistics: ReportStatistics;
  usersByRole: UsersByRoleData[];
  appointmentsByStatus: AppointmentsByStatusData[];
  appointmentsByMonth: AppointmentsByMonthData[];
  specialtiesRanking: SpecialtiesRankingData[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = `${API_BASE_URL}/reports`;

  constructor(private http: HttpClient) {}

  getReportData(filter: ReportFilter): Observable<ReportData> {
    const params = new HttpParams()
      .set('startDate', filter.startDate)
      .set('endDate', filter.endDate);

    return this.http.get<ReportData>(this.apiUrl, { params });
  }

  getStatistics(startDate?: string, endDate?: string): Observable<ReportStatistics> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<ReportStatistics>(`${this.apiUrl}/statistics`, { params });
  }

  getUsersByRole(startDate?: string, endDate?: string): Observable<UsersByRoleData[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<UsersByRoleData[]>(`${this.apiUrl}/users-by-role`, { params });
  }

  getAppointmentsByStatus(startDate?: string, endDate?: string): Observable<AppointmentsByStatusData[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<AppointmentsByStatusData[]>(`${this.apiUrl}/appointments-by-status`, { params });
  }

  getAppointmentsByMonth(year: number): Observable<AppointmentsByMonthData[]> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get<AppointmentsByMonthData[]>(`${this.apiUrl}/appointments-by-month`, { params });
  }

  getSpecialtiesRanking(startDate?: string, endDate?: string): Observable<SpecialtiesRankingData[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<SpecialtiesRankingData[]>(`${this.apiUrl}/specialties-ranking`, { params });
  }

  exportReport(filter: ReportFilter, format: ExportFormat): Observable<Blob> {
    const params = new HttpParams()
      .set('startDate', filter.startDate)
      .set('endDate', filter.endDate)
      .set('format', format);

    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}
