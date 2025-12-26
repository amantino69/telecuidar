import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const API_BASE_URL = `${environment.apiUrl}/medical-certificates`;

export type CertificateType = 'comparecimento' | 'afastamento' | 'aptidao' | 'acompanhante' | 'outro';

export interface MedicalCertificate {
  id: string;
  appointmentId: string;
  professionalId: string;
  professionalName?: string;
  professionalCrm?: string;
  patientId: string;
  patientName?: string;
  patientCpf?: string;
  tipo: CertificateType;
  dataEmissao: string;
  dataInicio?: string;
  dataFim?: string;
  diasAfastamento?: number;
  cid?: string;
  conteudo: string;
  observacoes?: string;
  isSigned: boolean;
  certificateSubject?: string;
  signedAt?: string;
  documentHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicalCertificateDto {
  appointmentId: string;
  tipo: CertificateType;
  dataInicio?: string;
  dataFim?: string;
  diasAfastamento?: number;
  cid?: string;
  conteudo: string;
  observacoes?: string;
}

export interface UpdateMedicalCertificateDto {
  tipo?: CertificateType;
  dataInicio?: string;
  dataFim?: string;
  diasAfastamento?: number;
  cid?: string;
  conteudo?: string;
  observacoes?: string;
}

export interface MedicalCertificatePdf {
  pdfBase64: string;
  fileName: string;
  documentHash: string;
  isSigned: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalCertificateService {

  constructor(private http: HttpClient) {}

  /**
   * Obtém um atestado por ID
   */
  getById(id: string): Observable<MedicalCertificate> {
    return this.http.get<MedicalCertificate>(`${API_BASE_URL}/${id}`);
  }

  /**
   * Obtém todos os atestados de uma consulta
   */
  getByAppointment(appointmentId: string): Observable<MedicalCertificate[]> {
    return this.http.get<MedicalCertificate[]>(`${API_BASE_URL}/appointment/${appointmentId}`);
  }

  /**
   * Obtém todos os atestados de um paciente
   */
  getByPatient(patientId: string): Observable<MedicalCertificate[]> {
    return this.http.get<MedicalCertificate[]>(`${API_BASE_URL}/patient/${patientId}`);
  }

  /**
   * Obtém todos os atestados emitidos por um profissional
   */
  getByProfessional(professionalId: string): Observable<MedicalCertificate[]> {
    return this.http.get<MedicalCertificate[]>(`${API_BASE_URL}/professional/${professionalId}`);
  }

  /**
   * Cria um novo atestado
   */
  create(dto: CreateMedicalCertificateDto): Observable<MedicalCertificate> {
    return this.http.post<MedicalCertificate>(API_BASE_URL, dto);
  }

  /**
   * Atualiza um atestado existente
   */
  update(id: string, dto: UpdateMedicalCertificateDto): Observable<MedicalCertificate> {
    return this.http.put<MedicalCertificate>(`${API_BASE_URL}/${id}`, dto);
  }

  /**
   * Exclui um atestado
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/${id}`);
  }

  /**
   * Gera PDF do atestado
   */
  generatePdf(id: string): Observable<MedicalCertificatePdf> {
    return this.http.get<MedicalCertificatePdf>(`${API_BASE_URL}/${id}/pdf`);
  }

  /**
   * Assina o atestado com certificado salvo na plataforma
   */
  signWithSavedCert(id: string, savedCertificateId: string, password?: string): Observable<MedicalCertificate> {
    return this.http.post<MedicalCertificate>(`${API_BASE_URL}/${id}/sign`, {
      savedCertificateId,
      password
    });
  }

  /**
   * Assina o atestado com arquivo PFX
   */
  signWithPfx(id: string, pfxBase64: string, password: string): Observable<MedicalCertificate> {
    return this.http.post<MedicalCertificate>(`${API_BASE_URL}/${id}/sign-with-pfx`, {
      pfxBase64,
      password
    });
  }

  /**
   * Valida hash de documento
   */
  validateDocument(documentHash: string): Observable<{ valid: boolean; hash: string }> {
    return this.http.get<{ valid: boolean; hash: string }>(`${API_BASE_URL}/validate/${documentHash}`);
  }
}
