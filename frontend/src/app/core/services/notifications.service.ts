import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

export type NotificationType = 'Info' | 'Warning' | 'Error' | 'Success';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export interface NotificationsFilter {
  isRead?: boolean;
  type?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private apiUrl = `${API_BASE_URL}/notifications`;
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  getNotifications(
    filter?: NotificationsFilter,
    page: number = 1,
    pageSize: number = 10
  ): Observable<PaginatedResponse<Notification>> {
    const user = this.authService.currentUser();
    const userId = user?.id;
    if (!userId) {
      // Return empty result instead of throwing error during SSR
      return new Observable(observer => {
        observer.next({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
        observer.complete();
      });
    }

    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filter?.isRead !== undefined) {
      params = params.set('isRead', filter.isRead.toString());
    }
    if (filter?.type) {
      params = params.set('type', filter.type);
    }

    return this.http.get<PaginatedResponse<Notification>>(`${this.apiUrl}/user/${userId}`, { params });
  }

  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return new Observable(observer => {
        observer.next({ count: 0 });
        observer.complete();
      });
    }
    return this.http.get<{ count: number }>(`${this.apiUrl}/user/${userId}/unread-count`);
  }

  markAsRead(notificationId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return new Observable(observer => {
        observer.next({});
        observer.complete();
      });
    }
    return this.http.patch<any>(`${this.apiUrl}/user/${userId}/read-all`, {});
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  createNotification(notification: CreateNotificationDto): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }
}
