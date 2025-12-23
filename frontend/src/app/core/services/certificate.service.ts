import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, tap, catchError } from 'rxjs';
import { environment } from '@env/environment';

/**
 * Certificado salvo na plataforma (PFX criptografado no servidor)
 */
export interface SavedCertificate {
  id: string;
  name: string;
  subjectName: string;
  issuerName: string;
  validFrom: Date;
  validTo: Date;
  thumbprint: string;
  requirePasswordOnUse: boolean; // Se true, pede senha ao usar
  createdAt: Date;
}

/**
 * DTO para salvar um novo certificado
 */
export interface SaveCertificateDto {
  name: string;
  pfxBase64: string;
  password: string;
  requirePasswordOnUse: boolean;
}

/**
 * Informações extraídas de um arquivo PFX (antes de salvar)
 */
export interface PfxCertificateInfo {
  subjectName: string;
  issuerName: string;
  validFrom: Date;
  validTo: Date;
  thumbprint: string;
  isValid: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CertificateService {
  private readonly baseUrl = `${environment.apiUrl}/certificates`;
  
  private savedCertificates$ = new BehaviorSubject<SavedCertificate[]>([]);
  private isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  /**
   * Carrega a lista de certificados salvos do usuário atual
   */
  loadSavedCertificates(): Observable<SavedCertificate[]> {
    this.isLoading$.next(true);
    
    return this.http.get<SavedCertificate[]>(this.baseUrl).pipe(
      tap(certs => {
        this.savedCertificates$.next(certs);
        this.isLoading$.next(false);
      }),
      catchError(err => {
        console.error('Erro ao carregar certificados salvos:', err);
        this.isLoading$.next(false);
        return of([]);
      })
    );
  }

  /**
   * Retorna os certificados salvos (cache)
   */
  getSavedCertificates(): Observable<SavedCertificate[]> {
    return this.savedCertificates$.asObservable();
  }

  /**
   * Retorna os certificados salvos (valor atual)
   */
  getSavedCertificatesValue(): SavedCertificate[] {
    return this.savedCertificates$.value;
  }

  /**
   * Verifica se o usuário tem certificados salvos
   */
  hasSavedCertificates(): boolean {
    return this.savedCertificates$.value.length > 0;
  }

  /**
   * Valida um arquivo PFX e retorna informações do certificado
   */
  validatePfx(pfxBase64: string, password: string): Observable<PfxCertificateInfo> {
    return this.http.post<PfxCertificateInfo>(`${this.baseUrl}/validate`, {
      pfxBase64,
      password
    });
  }

  /**
   * Salva um certificado PFX na plataforma
   */
  saveCertificate(dto: SaveCertificateDto): Observable<SavedCertificate> {
    return this.http.post<SavedCertificate>(this.baseUrl, dto).pipe(
      tap(newCert => {
        const current = this.savedCertificates$.value;
        this.savedCertificates$.next([...current, newCert]);
      })
    );
  }

  /**
   * Remove um certificado salvo
   */
  deleteCertificate(certificateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${certificateId}`).pipe(
      tap(() => {
        const current = this.savedCertificates$.value;
        this.savedCertificates$.next(current.filter(c => c.id !== certificateId));
      })
    );
  }

  /**
   * Atualiza configurações de um certificado (nome, requirePasswordOnUse)
   */
  updateCertificate(certificateId: string, updates: { name?: string; requirePasswordOnUse?: boolean }): Observable<SavedCertificate> {
    return this.http.patch<SavedCertificate>(`${this.baseUrl}/${certificateId}`, updates).pipe(
      tap(updated => {
        const current = this.savedCertificates$.value;
        const index = current.findIndex(c => c.id === certificateId);
        if (index >= 0) {
          current[index] = updated;
          this.savedCertificates$.next([...current]);
        }
      })
    );
  }

  /**
   * Valida a senha de um certificado salvo
   */
  validateSavedCertificatePassword(certificateId: string, password: string): Observable<{ isValid: boolean }> {
    return this.http.post<{ isValid: boolean }>(`${this.baseUrl}/${certificateId}/validate-password`, { password });
  }

  /**
   * Converte arquivo File para base64
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo data:...;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Verifica se um certificado ainda é válido
   */
  isCertificateValid(cert: SavedCertificate): boolean {
    const now = new Date();
    return now >= new Date(cert.validFrom) && now <= new Date(cert.validTo);
  }

  /**
   * Formata o nome do sujeito do certificado para exibição
   */
  formatSubjectName(subjectName: string): string {
    // Extrai o CN (Common Name) do subject
    const cnMatch = subjectName.match(/CN=([^,]+)/i);
    if (cnMatch) {
      return cnMatch[1].trim();
    }
    return subjectName;
  }

  /**
   * Extrai informações do subject name
   */
  parseSubjectName(subjectName: string): { cn?: string; o?: string; ou?: string; c?: string } {
    const result: { cn?: string; o?: string; ou?: string; c?: string } = {};
    
    const parts = subjectName.split(',').map(p => p.trim());
    for (const part of parts) {
      const [key, ...valueParts] = part.split('=');
      const value = valueParts.join('=').trim();
      
      switch (key.toUpperCase()) {
        case 'CN':
          result.cn = value;
          break;
        case 'O':
          result.o = value;
          break;
        case 'OU':
          result.ou = value;
          break;
        case 'C':
          result.c = value;
          break;
      }
    }
    
    return result;
  }
}
