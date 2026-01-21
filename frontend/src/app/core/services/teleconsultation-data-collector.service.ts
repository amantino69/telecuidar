import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Appointment } from './appointments.service';
import { UsersService } from './users.service';
import { BiometricsService } from './biometrics.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Serviço para coletar dados de todas as abas para usar na IA
 * Garante que TODAS as informações disponíveis sejam incluídas nos resumos e hipóteses diagnósticas
 * Prioriza dados do cache local (mais recentes) sobre dados do appointment (backend)
 */
@Injectable({
  providedIn: 'root'
})
export class TeleconsultationDataCollectorService {
  private isBrowser: boolean;
  
  constructor(
    private usersService: UsersService,
    private biometricsService: BiometricsService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Coleta TODOS os dados disponíveis de uma consulta para uso na IA
   * Inclui dados de todas as abas, priorizando cache local quando disponível
   */
  collectAllData(appointment: Appointment, appointmentId: string) {
    return forkJoin({
      patientData: this.getPatientData(appointment),
      preConsultationData: this.getPreConsultationData(appointment),
      anamnesisData: this.getAnamnesisData(appointment, appointmentId),
      biometricsData: this.getBiometricsData(appointmentId),
      soapData: this.getSoapData(appointment, appointmentId),
      specialtyFieldsData: this.getSpecialtyFieldsData(appointment, appointmentId)
    });
  }

  /**
   * Tenta carregar dados do cache local (sessionStorage)
   * Retorna null se não houver cache ou se não estiver no browser
   */
  private getFromLocalCache(key: string): any {
    if (!this.isBrowser) return null;
    try {
      const cached = sessionStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Extrai dados do paciente
   * Fonte: Aba "Dados do Paciente"
   */
  private getPatientData(appointment: Appointment) {
    if (!appointment?.patientId) {
      return of(null);
    }

    return this.usersService.getUserById(appointment.patientId).pipe(
      map(user => {
        const profile = user.patientProfile || {};
        return {
          name: user.name,
          birthDate: profile.birthDate,
          gender: profile.gender,
          email: user.email,
          phone: user.phone,
          cpf: user.cpf
        };
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Extrai dados da pré-consulta
   * Fonte: Aba "Dados da Pré Consulta"
   */
  private getPreConsultationData(appointment: Appointment) {
    if (!appointment?.preConsultationJson) {
      return of(null);
    }

    try {
      const data = JSON.parse(appointment.preConsultationJson);
      return of(data);
    } catch (e) {
      console.warn('Erro ao parsear preConsultationJson:', e);
      return of(null);
    }
  }

  /**
   * Extrai dados da anamnese
   * Fonte: Aba "Anamnese"
   * Prioriza cache local (dados mais recentes que podem não ter sido salvos ainda)
   */
  private getAnamnesisData(appointment: Appointment, appointmentId: string) {
    // Primeiro verificar cache local (dados mais recentes)
    const cachedData = this.getFromLocalCache(`anamnesis_${appointmentId}`);
    if (cachedData) {
      return of(cachedData);
    }
    
    // Fallback para dados do appointment
    if (!appointment?.anamnesisJson) {
      return of(null);
    }

    try {
      const data = JSON.parse(appointment.anamnesisJson);
      return of(data);
    } catch (e) {
      console.warn('Erro ao parsear anamnesisJson:', e);
      return of(null);
    }
  }

  /**
   * Extrai dados biométricos
   * Fonte: Aba "Biométricos"
   */
  private getBiometricsData(appointmentId: string) {
    if (!appointmentId) {
      return of(null);
    }

    return this.biometricsService.getBiometrics(appointmentId).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Extrai dados SOAP
   * Fonte: Aba "SOAP"
   * Prioriza cache local (dados mais recentes que podem não ter sido salvos ainda)
   */
  private getSoapData(appointment: Appointment, appointmentId: string) {
    // Primeiro verificar cache local (dados mais recentes)
    const cachedData = this.getFromLocalCache(`soap_${appointmentId}`);
    if (cachedData) {
      return of(cachedData);
    }
    
    // Fallback para dados do appointment
    if (!appointment?.soapJson) {
      return of(null);
    }

    try {
      const data = JSON.parse(appointment.soapJson);
      return of(data);
    } catch (e) {
      console.warn('Erro ao parsear soapJson:', e);
      return of(null);
    }
  }

  /**
   * Extrai campos da especialidade
   * Fonte: Aba "Campos da Especialidade"
   * Prioriza cache local (dados mais recentes que podem não ter sido salvos ainda)
   */
  private getSpecialtyFieldsData(appointment: Appointment, appointmentId: string) {
    // Primeiro verificar cache local (dados mais recentes)
    const cachedData = this.getFromLocalCache(`specialtyFields_${appointmentId}`);
    if (cachedData) {
      return of({
        specialtyName: appointment?.specialtyName,
        customFields: cachedData
      });
    }
    
    // Fallback para dados do appointment
    if (!appointment?.specialtyFieldsJson) {
      return of({
        specialtyName: appointment?.specialtyName,
        customFields: {}
      });
    }

    try {
      const customFields = JSON.parse(appointment.specialtyFieldsJson);
      return of({
        specialtyName: appointment?.specialtyName,
        customFields
      });
    } catch (e) {
      console.warn('Erro ao parsear specialtyFieldsJson:', e);
      return of({
        specialtyName: appointment?.specialtyName,
        customFields: {}
      });
    }
  }
}
