import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

export interface PrescriptionItem {
  id: string;
  medicamento: string;
  codigoAnvisa?: string;
  dosagem: string;
  frequencia: string;
  periodo: string;
  posologia: string;
  observacoes?: string;
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
  medicamento: string;
  codigoAnvisa?: string;
  dosagem: string;
  frequencia: string;
  periodo: string;
  posologia: string;
  observacoes?: string;
}

export interface SignPrescriptionDto {
  certificateThumbprint: string;
  signature: string;
  certificateSubject: string;
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
  laboratorio?: string;
  apresentacao?: string;
  categoria?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  constructor(private http: HttpClient) {}

  getPrescription(id: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${API_BASE_URL}/prescriptions/${id}`);
  }

  getPrescriptionByAppointment(appointmentId: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${API_BASE_URL}/prescriptions/appointment/${appointmentId}`);
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

  generatePdf(prescriptionId: string): Observable<PrescriptionPdf> {
    return this.http.get<PrescriptionPdf>(`${API_BASE_URL}/prescriptions/${prescriptionId}/pdf`);
  }

  generateSignedPdf(prescriptionId: string, pfxBase64: string, pfxPassword: string): Observable<PrescriptionPdf> {
    return this.http.post<PrescriptionPdf>(`${API_BASE_URL}/prescriptions/${prescriptionId}/pdf/signed`, {
      pfxBase64,
      pfxPassword
    });
  }

  signWithSavedCert(prescriptionId: string, certificateId: string, password?: string): Observable<PrescriptionPdf> {
    return this.http.post<PrescriptionPdf>(`${API_BASE_URL}/prescriptions/${prescriptionId}/pdf/sign-saved`, {
      certificateId,
      password
    });
  }

  signPrescription(prescriptionId: string, dto: SignPrescriptionDto): Observable<Prescription> {
    return this.http.post<Prescription>(`${API_BASE_URL}/prescriptions/${prescriptionId}/sign`, dto);
  }

  validateDocument(documentHash: string): Observable<{ isValid: boolean; documentHash: string }> {
    return this.http.get<{ isValid: boolean; documentHash: string }>(`${API_BASE_URL}/prescriptions/validate/${documentHash}`);
  }

  deletePrescription(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/prescriptions/${id}`);
  }

  // Busca de medicamentos ANVISA (simulação - em produção, usar API real)
  searchMedicamentos(query: string): Observable<MedicamentoAnvisa[]> {
    // Lista de medicamentos comuns para demonstração
    // Em produção, isso seria uma chamada a uma API da ANVISA
    const medicamentos: MedicamentoAnvisa[] = [
      { codigo: '1057303730041', nome: 'DIPIRONA SÓDICA 500MG', principioAtivo: 'Dipirona Sódica', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Analgésico' },
      { codigo: '1057303730042', nome: 'DIPIRONA SÓDICA 1G', principioAtivo: 'Dipirona Sódica', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Analgésico' },
      { codigo: '1057303730050', nome: 'PARACETAMOL 500MG', principioAtivo: 'Paracetamol', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Analgésico' },
      { codigo: '1057303730051', nome: 'PARACETAMOL 750MG', principioAtivo: 'Paracetamol', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Analgésico' },
      { codigo: '1057303730060', nome: 'IBUPROFENO 400MG', principioAtivo: 'Ibuprofeno', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Anti-inflamatório' },
      { codigo: '1057303730061', nome: 'IBUPROFENO 600MG', principioAtivo: 'Ibuprofeno', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Anti-inflamatório' },
      { codigo: '1057303730070', nome: 'AMOXICILINA 500MG', principioAtivo: 'Amoxicilina', laboratorio: 'EMS', apresentacao: 'Cápsula', categoria: 'Antibiótico' },
      { codigo: '1057303730071', nome: 'AMOXICILINA 875MG', principioAtivo: 'Amoxicilina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Antibiótico' },
      { codigo: '1057303730080', nome: 'AZITROMICINA 500MG', principioAtivo: 'Azitromicina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Antibiótico' },
      { codigo: '1057303730081', nome: 'AZITROMICINA 1G', principioAtivo: 'Azitromicina', laboratorio: 'EMS', apresentacao: 'Pó para Suspensão', categoria: 'Antibiótico' },
      { codigo: '1057303730090', nome: 'OMEPRAZOL 20MG', principioAtivo: 'Omeprazol', laboratorio: 'EMS', apresentacao: 'Cápsula', categoria: 'Antiulceroso' },
      { codigo: '1057303730091', nome: 'OMEPRAZOL 40MG', principioAtivo: 'Omeprazol', laboratorio: 'EMS', apresentacao: 'Cápsula', categoria: 'Antiulceroso' },
      { codigo: '1057303730100', nome: 'LOSARTANA POTÁSSICA 50MG', principioAtivo: 'Losartana', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Anti-hipertensivo' },
      { codigo: '1057303730101', nome: 'LOSARTANA POTÁSSICA 100MG', principioAtivo: 'Losartana', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Anti-hipertensivo' },
      { codigo: '1057303730110', nome: 'METFORMINA 500MG', principioAtivo: 'Metformina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Antidiabético' },
      { codigo: '1057303730111', nome: 'METFORMINA 850MG', principioAtivo: 'Metformina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Antidiabético' },
      { codigo: '1057303730120', nome: 'SINVASTATINA 20MG', principioAtivo: 'Sinvastatina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Hipolipemiante' },
      { codigo: '1057303730121', nome: 'SINVASTATINA 40MG', principioAtivo: 'Sinvastatina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Hipolipemiante' },
      { codigo: '1057303730130', nome: 'ATENOLOL 25MG', principioAtivo: 'Atenolol', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Betabloqueador' },
      { codigo: '1057303730131', nome: 'ATENOLOL 50MG', principioAtivo: 'Atenolol', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Betabloqueador' },
      { codigo: '1057303730140', nome: 'LEVOTIROXINA 25MCG', principioAtivo: 'Levotiroxina', laboratorio: 'MERCK', apresentacao: 'Comprimido', categoria: 'Hormônio Tireoidiano' },
      { codigo: '1057303730141', nome: 'LEVOTIROXINA 50MCG', principioAtivo: 'Levotiroxina', laboratorio: 'MERCK', apresentacao: 'Comprimido', categoria: 'Hormônio Tireoidiano' },
      { codigo: '1057303730150', nome: 'PREDNISONA 5MG', principioAtivo: 'Prednisona', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Corticosteroide' },
      { codigo: '1057303730151', nome: 'PREDNISONA 20MG', principioAtivo: 'Prednisona', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Corticosteroide' },
      { codigo: '1057303730160', nome: 'FLUOXETINA 20MG', principioAtivo: 'Fluoxetina', laboratorio: 'EMS', apresentacao: 'Cápsula', categoria: 'Antidepressivo' },
      { codigo: '1057303730161', nome: 'SERTRALINA 50MG', principioAtivo: 'Sertralina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Antidepressivo' },
      { codigo: '1057303730170', nome: 'CLONAZEPAM 0,5MG', principioAtivo: 'Clonazepam', laboratorio: 'ROCHE', apresentacao: 'Comprimido', categoria: 'Ansiolítico' },
      { codigo: '1057303730171', nome: 'CLONAZEPAM 2MG', principioAtivo: 'Clonazepam', laboratorio: 'ROCHE', apresentacao: 'Comprimido', categoria: 'Ansiolítico' },
      { codigo: '1057303730180', nome: 'LORATADINA 10MG', principioAtivo: 'Loratadina', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Anti-histamínico' },
      { codigo: '1057303730190', nome: 'NIMESULIDA 100MG', principioAtivo: 'Nimesulida', laboratorio: 'EMS', apresentacao: 'Comprimido', categoria: 'Anti-inflamatório' }
    ];

    const queryLower = query.toLowerCase();
    const filtered = medicamentos.filter(m => 
      m.nome.toLowerCase().includes(queryLower) || 
      m.principioAtivo?.toLowerCase().includes(queryLower) ||
      m.codigo.includes(query)
    );

    return new Observable(observer => {
      setTimeout(() => {
        observer.next(filtered);
        observer.complete();
      }, 200);
    });
  }
}
