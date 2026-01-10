import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PatientData {
  name?: string;
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  email?: string;
  phone?: string;
}

export interface PersonalInfo {
  fullName?: string;
  birthDate?: string;
  weight?: string;
  height?: string;
}

export interface MedicalHistory {
  chronicConditions?: string;
  medications?: string;
  allergies?: string;
  surgeries?: string;
  generalObservations?: string;
}

export interface LifestyleHabits {
  smoker?: string;
  alcoholConsumption?: string;
  physicalActivity?: string;
  generalObservations?: string;
}

export interface VitalSigns {
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  oxygenSaturation?: string;
  generalObservations?: string;
}

export interface CurrentSymptoms {
  mainSymptoms?: string;
  symptomOnset?: string;
  painIntensity?: number;
  generalObservations?: string;
}

export interface PreConsultationData {
  personalInfo?: PersonalInfo;
  medicalHistory?: MedicalHistory;
  lifestyleHabits?: LifestyleHabits;
  vitalSigns?: VitalSigns;
  currentSymptoms?: CurrentSymptoms;
  additionalObservations?: string;
}

export interface PersonalHistory {
  previousDiseases?: string;
  surgeries?: string;
  hospitalizations?: string;
  allergies?: string;
  currentMedications?: string;
  vaccinations?: string;
}

export interface Lifestyle {
  diet?: string;
  physicalActivity?: string;
  smoking?: string;
  alcohol?: string;
  drugs?: string;
  sleep?: string;
}

export interface SystemsReview {
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  genitourinary?: string;
  musculoskeletal?: string;
  neurological?: string;
  psychiatric?: string;
  endocrine?: string;
  hematologic?: string;
}

export interface AnamnesisData {
  chiefComplaint?: string;
  presentIllnessHistory?: string;
  personalHistory?: PersonalHistory;
  familyHistory?: string;
  lifestyle?: Lifestyle;
  systemsReview?: SystemsReview;
  additionalNotes?: string;
}

export interface BiometricsData {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  temperature?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
  glucose?: number;
}

export interface SoapData {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface SpecialtyFieldsData {
  specialtyName?: string;
  customFields?: { [key: string]: string };
}

export interface GenerateSummaryRequest {
  appointmentId: string;
  patientData?: PatientData;
  preConsultationData?: PreConsultationData;
  anamnesisData?: AnamnesisData;
  biometricsData?: BiometricsData;
  soapData?: SoapData;
  specialtyFieldsData?: SpecialtyFieldsData;
}

export interface GenerateDiagnosisRequest {
  appointmentId: string;
  additionalContext?: string;
  patientData?: PatientData;
  preConsultationData?: PreConsultationData;
  anamnesisData?: AnamnesisData;
  biometricsData?: BiometricsData;
  soapData?: SoapData;
  specialtyFieldsData?: SpecialtyFieldsData;
}

export interface AISummaryResponse {
  summary: string;
  generatedAt: string;
}

export interface AIDiagnosisResponse {
  diagnosticHypothesis: string;
  generatedAt: string;
}

export interface AIData {
  summary?: string;
  summaryGeneratedAt?: string;
  diagnosticHypothesis?: string;
  diagnosisGeneratedAt?: string;
}

export interface SaveAIData {
  summary?: string;
  diagnosticHypothesis?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  /**
   * Gera um resumo clínico usando IA
   */
  generateSummary(request: GenerateSummaryRequest): Observable<AISummaryResponse> {
    return this.http.post<AISummaryResponse>(`${this.apiUrl}/summary`, request);
  }

  /**
   * Gera hipóteses diagnósticas usando IA
   */
  generateDiagnosis(request: GenerateDiagnosisRequest): Observable<AIDiagnosisResponse> {
    return this.http.post<AIDiagnosisResponse>(`${this.apiUrl}/diagnosis`, request);
  }

  /**
   * Obtém os dados de IA salvos para uma consulta
   */
  getAIData(appointmentId: string): Observable<AIData> {
    return this.http.get<AIData>(`${this.apiUrl}/appointment/${appointmentId}`);
  }

  /**
   * Salva dados de IA para uma consulta
   */
  saveAIData(appointmentId: string, data: SaveAIData): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/appointment/${appointmentId}`, data);
  }
}
