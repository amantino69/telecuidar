import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

// ============================================
// Interfaces da Timeline Clínica
// ============================================

export interface TimelineBiometrics {
  weight?: number;
  height?: number;
  bmi?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  glycemicIndex?: number;
}

export interface TimelineSoap {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface TimelinePrescription {
  id: string;
  createdAt: string;
  isSigned: boolean;
  medications: string[];
}

export interface TimelineExamRequest {
  id: string;
  nomeExame: string;
  categoria: string;
  prioridade: string;
  dataEmissao: string;
  isSigned: boolean;
}

export interface TimelineMedicalCertificate {
  id: string;
  tipo: string;
  diasAfastamento?: number;
  dataEmissao: string;
  isSigned: boolean;
}

export interface TimelineMedicalReport {
  id: string;
  tipo: string;
  titulo: string;
  dataEmissao: string;
  isSigned: boolean;
}

export interface TimelineEntry {
  appointmentId: string;
  date: string;
  time: string;
  status: string;
  type: string;
  professionalId: string;
  professionalName: string;
  specialtyName: string;
  councilAcronym?: string;
  councilRegistration?: string;
  councilState?: string;
  aiSummary?: string;
  soap?: TimelineSoap;
  biometrics?: TimelineBiometrics;
  prescriptionsCount: number;
  examRequestsCount: number;
  medicalCertificatesCount: number;
  medicalReportsCount: number;
  attachmentsCount: number;
  prescriptions?: TimelinePrescription[];
  examRequests?: TimelineExamRequest[];
  medicalCertificates?: TimelineMedicalCertificate[];
  medicalReports?: TimelineMedicalReport[];
}

export interface TimelineSummary {
  totalAppointments: number;
  completedAppointments: number;
  firstAppointmentDate?: string;
  lastAppointmentDate?: string;
  totalPrescriptions: number;
  totalExamRequests: number;
  totalMedicalCertificates: number;
  totalMedicalReports: number;
  specialtiesAttended: string[];
  professionalsAttended: string[];
}

export interface ClinicalTimeline {
  patientId: string;
  patientName: string;
  patientCpf: string;
  entries: TimelineEntry[];
  summary: TimelineSummary;
}

@Injectable({
  providedIn: 'root'
})
export class ClinicalTimelineService {
  constructor(private http: HttpClient) {}

  /**
   * Busca timeline clínica por CPF do paciente
   */
  getTimelineByCpf(cpf: string, includeDetails: boolean = false, reason?: string): Observable<ClinicalTimeline> {
    let params = new HttpParams().set('includeDetails', includeDetails.toString());
    if (reason) {
      params = params.set('reason', reason);
    }
    return this.http.get<ClinicalTimeline>(`${API_BASE_URL}/patients/cpf/${encodeURIComponent(cpf)}/clinical-timeline`, { params });
  }

  /**
   * Busca timeline clínica por ID do paciente
   */
  getTimelineByPatientId(patientId: string, includeDetails: boolean = false, reason?: string): Observable<ClinicalTimeline> {
    let params = new HttpParams().set('includeDetails', includeDetails.toString());
    if (reason) {
      params = params.set('reason', reason);
    }
    return this.http.get<ClinicalTimeline>(`${API_BASE_URL}/patients/${patientId}/clinical-timeline`, { params });
  }

  /**
   * Busca detalhes de uma consulta específica
   */
  getAppointmentDetails(appointmentId: string, reason?: string): Observable<TimelineEntry> {
    let params = new HttpParams();
    if (reason) {
      params = params.set('reason', reason);
    }
    return this.http.get<TimelineEntry>(`${API_BASE_URL}/patients/appointments/${appointmentId}/details`, { params });
  }

  /**
   * Busca o próprio histórico clínico (para pacientes)
   */
  getMyTimeline(includeDetails: boolean = false): Observable<ClinicalTimeline> {
    const params = new HttpParams().set('includeDetails', includeDetails.toString());
    return this.http.get<ClinicalTimeline>(`${API_BASE_URL}/patients/me/clinical-timeline`, { params });
  }
}
