import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '@app/core/models/auth.model';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  uploadAvatar(userId: string, file: File): Observable<User> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<User>(`${this.apiUrl}/${userId}/avatar`, formData);
  }

  getAvatarUrl(avatarPath: string): string {
    if (!avatarPath) return '';
    if (avatarPath.startsWith('http')) return avatarPath;
    // Extrair base URL sem /api
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${avatarPath}`;
  }
}
