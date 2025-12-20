import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

export type AuditActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export';

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsFilter {
  search?: string;
  action?: AuditActionType | 'all';
  entityType?: string | 'all';
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogsSortOptions {
  field: keyof AuditLog;
  direction: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogsService {
  private apiUrl = `${API_BASE_URL}/auditlogs`;

  constructor(private http: HttpClient) {}

  getAuditLogs(
    filter: AuditLogsFilter = {},
    sort: AuditLogsSortOptions = { field: 'createdAt', direction: 'desc' },
    page: number = 1,
    pageSize: number = 10
  ): Observable<PaginatedResponse<AuditLog>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filter.entityType && filter.entityType !== 'all') {
      params = params.set('entityType', filter.entityType);
    }

    if (filter.userId) {
      params = params.set('userId', filter.userId);
    }

    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }

    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }

    return this.http.get<PaginatedResponse<AuditLog>>(this.apiUrl, { params });
  }

  getAuditLogById(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.apiUrl}/${id}`);
  }

  exportToPDF(filter: AuditLogsFilter = {}): Observable<Blob> {
    let params = new HttpParams();

    if (filter.entityType && filter.entityType !== 'all') {
      params = params.set('entityType', filter.entityType);
    }

    if (filter.userId) {
      params = params.set('userId', filter.userId);
    }

    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }

    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }

    return this.http.get(`${this.apiUrl}/export/pdf`, { 
      params, 
      responseType: 'blob' 
    });
  }
}
