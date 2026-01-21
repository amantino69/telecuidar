import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

// Tipos de receita conforme legislação brasileira
export const TIPOS_RECEITA = [
  'Simples',
  'Controle Especial - Branca (C1)',
  'Controle Especial - Azul (B)',
  'Controle Especial - Amarela (A)',
  'Antimicrobiano',
  'Retinoides'
] as const;

// Vias de administração padrão e-SUS
export const VIAS_ADMINISTRACAO = [
  'Oral',
  'Sublingual',
  'Intravenosa (IV)',
  'Intramuscular (IM)',
  'Subcutânea (SC)',
  'Tópica',
  'Oftálmica',
  'Auricular',
  'Nasal',
  'Inalatória',
  'Retal',
  'Vaginal',
  'Transdérmica',
  'Intradérmica'
] as const;

// Formas farmacêuticas padrão
export const FORMAS_FARMACEUTICAS = [
  'Comprimido',
  'Comprimido revestido',
  'Cápsula',
  'Cápsula gelatinosa',
  'Drágea',
  'Solução oral',
  'Suspensão oral',
  'Xarope',
  'Gotas',
  'Solução injetável',
  'Pó para solução injetável',
  'Pomada',
  'Creme',
  'Gel',
  'Loção',
  'Spray',
  'Aerossol',
  'Colírio',
  'Supositório',
  'Óvulo vaginal',
  'Adesivo transdérmico',
  'Pó para inalação',
  'Solução para inalação'
] as const;

// Unidades de quantidade para dispensação
export const UNIDADES_QUANTIDADE = [
  'Comprimido(s)',
  'Cápsula(s)',
  'mL',
  'Frasco(s)',
  'Ampola(s)',
  'Bisnaga(s)',
  'Caixa(s)',
  'Sachê(s)',
  'Adesivo(s)',
  'Unidade(s)',
  'Grama(s)'
] as const;

export interface PrescriptionItem {
  id: string;
  // Identificação do medicamento
  medicamento: string;
  principioAtivo?: string;
  codigoAnvisa?: string;
  codigoCatmat?: string;
  // Forma e apresentação
  formaFarmaceutica?: string;
  concentracao?: string;
  apresentacao?: string;
  // Posologia e administração
  dosagem: string;
  viaAdministracao?: string;
  frequencia: string;
  periodo: string;
  posologia: string;
  // Quantidade e dispensação
  quantidadeTotal?: number;
  unidadeQuantidade?: string;
  // Tipo de receita
  tipoReceita: string;
  isControlado: boolean;
  // Observações
  observacoes?: string;
  laboratorio?: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  professionalId: string;
  professionalName?: string;
  professionalCrm?: string;
  patientId: string;
  patientName?: string;
  patientCpf?: string;
  items: PrescriptionItem[];
  isSigned: boolean;
  certificateSubject?: string;
  signedAt?: string;
  documentHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionDto {
  appointmentId: string;
  items?: PrescriptionItem[];
}

export interface UpdatePrescriptionDto {
  items: PrescriptionItem[];
}

export interface AddPrescriptionItemDto {
  // Identificação do medicamento
  medicamento: string;
  principioAtivo?: string;
  codigoAnvisa?: string;
  codigoCatmat?: string;
  // Forma e apresentação
  formaFarmaceutica?: string;
  concentracao?: string;
  apresentacao?: string;
  // Posologia e administração
  dosagem: string;
  viaAdministracao?: string;
  frequencia: string;
  periodo: string;
  posologia: string;
  // Quantidade e dispensação
  quantidadeTotal?: number;
  unidadeQuantidade?: string;
  // Tipo de receita
  tipoReceita?: string;
  isControlado?: boolean;
  // Observações
  observacoes?: string;
  laboratorio?: string;
}

export interface UpdatePrescriptionItemDto {
  // Identificação do medicamento
  medicamento: string;
  principioAtivo?: string;
  codigoAnvisa?: string;
  codigoCatmat?: string;
  // Forma e apresentação
  formaFarmaceutica?: string;
  concentracao?: string;
  apresentacao?: string;
  // Posologia e administração
  dosagem: string;
  viaAdministracao?: string;
  frequencia: string;
  periodo: string;
  posologia: string;
  // Quantidade e dispensação
  quantidadeTotal?: number;
  unidadeQuantidade?: string;
  // Tipo de receita
  tipoReceita?: string;
  isControlado?: boolean;
  // Observações
  observacoes?: string;
  laboratorio?: string;
}

export interface PrescriptionPdf {
  pdfBase64: string;
  fileName: string;
  documentHash: string;
  isSigned: boolean;
}

export interface MedicamentoAnvisa {
  codigo: string;
  nome: string;
  principioAtivo?: string;
  classeTerapeutica?: string;
  categoriaRegulatoria?: string;
  empresa?: string;
  formaFarmaceutica?: string;
  concentracao?: string;
  viaAdministracao?: string;
  codigoCatmat?: string;
  laboratorio?: string;
  apresentacao?: string;
  isControlado?: boolean;
  tipoReceita?: string;
}

export interface MedicamentoSearchResult {
  medicamentos: MedicamentoAnvisa[];
  totalResults: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  constructor(private http: HttpClient) {}

  getPrescription(id: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${API_BASE_URL}/prescriptions/${id}`);
  }

  getPrescriptionsByAppointment(appointmentId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${API_BASE_URL}/prescriptions/appointment/${appointmentId}`);
  }

  getPrescriptionsByPatient(patientId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${API_BASE_URL}/prescriptions/patient/${patientId}`);
  }

  getPrescriptionsByProfessional(professionalId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${API_BASE_URL}/prescriptions/professional/${professionalId}`);
  }

  createPrescription(dto: CreatePrescriptionDto): Observable<Prescription> {
    return this.http.post<Prescription>(`${API_BASE_URL}/prescriptions`, dto);
  }

  updatePrescription(id: string, dto: UpdatePrescriptionDto): Observable<Prescription> {
    return this.http.patch<Prescription>(`${API_BASE_URL}/prescriptions/${id}`, dto);
  }

  addItem(prescriptionId: string, item: AddPrescriptionItemDto): Observable<Prescription> {
    return this.http.post<Prescription>(`${API_BASE_URL}/prescriptions/${prescriptionId}/items`, item);
  }

  removeItem(prescriptionId: string, itemId: string): Observable<Prescription> {
    return this.http.delete<Prescription>(`${API_BASE_URL}/prescriptions/${prescriptionId}/items/${itemId}`);
  }

  updateItem(prescriptionId: string, itemId: string, item: UpdatePrescriptionItemDto): Observable<Prescription> {
    return this.http.put<Prescription>(`${API_BASE_URL}/prescriptions/${prescriptionId}/items/${itemId}`, item);
  }

  generatePdf(prescriptionId: string): Observable<PrescriptionPdf> {
    return this.http.get<PrescriptionPdf>(`${API_BASE_URL}/prescriptions/${prescriptionId}/pdf`);
  }

  validateDocument(documentHash: string): Observable<{ isValid: boolean; documentHash: string }> {
    return this.http.get<{ isValid: boolean; documentHash: string }>(`${API_BASE_URL}/prescriptions/validate/${documentHash}`);
  }

  deletePrescription(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/prescriptions/${id}`);
  }

  // Busca de medicamentos na base ANVISA via API backend
  searchMedicamentos(query: string, page = 1, pageSize = 20): Observable<MedicamentoAnvisa[]> {
    if (!query || query.length < 2) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    return this.http.get<MedicamentoSearchResult>(
      `${API_BASE_URL}/medicamentos/search`,
      { params: { query, page: page.toString(), pageSize: pageSize.toString() } }
    ).pipe(
      map(result => result.medicamentos)
    );
  }

  // Busca paginada com total de resultados
  searchMedicamentosPaginated(query: string, page = 1, pageSize = 20): Observable<MedicamentoSearchResult> {
    if (!query || query.length < 2) {
      return new Observable(observer => {
        observer.next({ medicamentos: [], totalResults: 0, page, pageSize });
        observer.complete();
      });
    }

    return this.http.get<MedicamentoSearchResult>(
      `${API_BASE_URL}/medicamentos/search`,
      { params: { query, page: page.toString(), pageSize: pageSize.toString() } }
    );
  }

  // Estatísticas da base de medicamentos
  getMedicamentosStats(): Observable<{ totalMedicamentos: number; fonte: string; ultimaAtualizacao: string }> {
    return this.http.get<{ totalMedicamentos: number; fonte: string; ultimaAtualizacao: string }>(
      `${API_BASE_URL}/medicamentos/stats`
    );
  }
}
