import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '@env/environment';

export interface TemporaryUploadDto {
  title: string;
  fileUrl: string; // Base64 encoded
  type: 'image' | 'document';
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TemporaryUploadService {
  private readonly apiUrl = `${environment.apiUrl}/temporaryuploads`;
  private http = inject(HttpClient);

  /**
   * Armazena um upload temporário no servidor
   */
  storeUpload(token: string, data: TemporaryUploadDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${token}`, data);
  }

  /**
   * Recupera um upload temporário pelo token (consome e remove)
   */
  getUpload(token: string): Observable<TemporaryUploadDto | null> {
    return this.http.get<TemporaryUploadDto>(`${this.apiUrl}/${token}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Verifica se existe um upload pendente (HEAD request)
   */
  checkUpload(token: string): Observable<boolean> {
    return new Observable(observer => {
      this.http.head(`${this.apiUrl}/${token}`, { observe: 'response' }).subscribe({
        next: (response) => {
          observer.next(response.status === 200);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}
