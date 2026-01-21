import { Component, Input, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { AIService, GenerateSummaryRequest, GenerateDiagnosisRequest, AIData } from '@core/services/ai.service';
import { Appointment } from '@core/services/appointments.service';

@Component({
  selector: 'app-ai-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, ButtonComponent, IconComponent],
  templateUrl: './ai-tab.html',
  styleUrls: ['./ai-tab.scss']
})
export class AITabComponent implements OnInit {
  @Input() appointmentId: string | null = null;
  @Input() appointment: Appointment | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PROFESSIONAL';
  @Input() readonly = false;
  
  // Data from other tabs (to be collected)
  @Input() patientData: any = null;
  @Input() preConsultationData: any = null;
  @Input() anamnesisData: any = null;
  @Input() biometricsData: any = null;
  @Input() soapData: any = null;
  @Input() specialtyFieldsData: any = null;
  
  // AI Results
  summary: string = '';
  summaryGeneratedAt: Date | null = null;
  diagnosticHypothesis: string = '';
  diagnosisGeneratedAt: Date | null = null;
  
  // Form inputs
  additionalContext: string = '';
  
  // UI States
  isGeneratingSummary = false;
  isGeneratingDiagnosis = false;
  isSaving = false;
  isLoading = true;
  errorMessage: string = '';
  private isBrowser: boolean;

  constructor(
    private aiService: AIService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.loadExistingData();
  }

  loadExistingData() {
    if (!this.appointmentId) {
      this.isLoading = false;
      return;
    }

    this.aiService.getAIData(this.appointmentId).subscribe({
      next: (data: AIData) => {
        if (data) {
          this.summary = data.summary || '';
          this.summaryGeneratedAt = data.summaryGeneratedAt ? new Date(data.summaryGeneratedAt) : null;
          this.diagnosticHypothesis = data.diagnosticHypothesis || '';
          this.diagnosisGeneratedAt = data.diagnosisGeneratedAt ? new Date(data.diagnosisGeneratedAt) : null;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading AI data:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
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

  collectAllData(): { patientData: any; preConsultationData: any; anamnesisData: any; biometricsData: any; soapData: any; specialtyFieldsData: any } {
    // Prioridade: 1) Cache local (mais recente) 2) Dados via Input 3) Dados do appointment
    
    // Pré-consulta (não tem cache local, vem do appointment)
    let preConsultation = this.preConsultationData;
    if (!preConsultation && this.appointment?.preConsultationJson) {
      try {
        preConsultation = JSON.parse(this.appointment.preConsultationJson);
      } catch (e) {
        console.warn('Could not parse preConsultationJson');
      }
    }

    // Dados do paciente
    const patientData = this.patientData || {
      name: this.appointment?.patientName,
    };

    // SOAP - verificar cache local primeiro (dados mais recentes que podem não ter sido salvos)
    let soapData = this.getFromLocalCache(`soap_${this.appointmentId}`);
    if (!soapData) {
      soapData = this.soapData;
    }
    if (!soapData && this.appointment?.soapJson) {
      try {
        soapData = JSON.parse(this.appointment.soapJson);
      } catch (e) {
        console.warn('Could not parse soapJson');
      }
    }

    // Anamnese - verificar cache local primeiro
    let anamnesisData = this.getFromLocalCache(`anamnesis_${this.appointmentId}`);
    if (!anamnesisData) {
      anamnesisData = this.anamnesisData;
    }
    if (!anamnesisData && this.appointment?.anamnesisJson) {
      try {
        anamnesisData = JSON.parse(this.appointment.anamnesisJson);
      } catch (e) {
        console.warn('Could not parse anamnesisJson');
      }
    }

    // Campos da especialidade - verificar cache local primeiro
    let specialtyFieldsCustom = this.getFromLocalCache(`specialtyFields_${this.appointmentId}`);
    let specialtyFieldsData: any;
    if (specialtyFieldsCustom) {
      specialtyFieldsData = {
        specialtyName: this.appointment?.specialtyName,
        customFields: specialtyFieldsCustom
      };
    } else if (this.specialtyFieldsData) {
      specialtyFieldsData = this.specialtyFieldsData;
    } else if (this.appointment?.specialtyFieldsJson) {
      try {
        const customFields = JSON.parse(this.appointment.specialtyFieldsJson);
        specialtyFieldsData = {
          specialtyName: this.appointment?.specialtyName,
          customFields
        };
      } catch (e) {
        console.warn('Could not parse specialtyFieldsJson');
        specialtyFieldsData = { specialtyName: this.appointment?.specialtyName };
      }
    } else {
      specialtyFieldsData = { specialtyName: this.appointment?.specialtyName };
    }

    // Biométricos (vem do Input, já que é carregado via API)
    const biometricsData = this.biometricsData;

    // Log para debug
    console.log('[AI Tab] Dados coletados para IA:', {
      patientData,
      preConsultationData: preConsultation,
      anamnesisData,
      biometricsData,
      soapData,
      specialtyFieldsData
    });

    return {
      patientData,
      preConsultationData: preConsultation,
      anamnesisData,
      biometricsData,
      soapData,
      specialtyFieldsData
    };
  }

  generateSummary() {
    if (!this.appointmentId || this.readonly) return;

    this.isGeneratingSummary = true;
    this.errorMessage = '';

    const collectedData = this.collectAllData();
    const request: GenerateSummaryRequest = {
      appointmentId: this.appointmentId,
      ...collectedData
    };

    console.log('[AI Tab] Enviando requisição para gerar resumo:', request);

    this.aiService.generateSummary(request).subscribe({
      next: (response) => {
        this.summary = response.summary;
        this.summaryGeneratedAt = new Date(response.generatedAt);
        this.isGeneratingSummary = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error generating summary:', err);
        this.errorMessage = err.error?.message || 'Erro ao gerar resumo. Verifique a configuração da API de IA.';
        this.isGeneratingSummary = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateDiagnosis() {
    if (!this.appointmentId || this.readonly) return;

    this.isGeneratingDiagnosis = true;
    this.errorMessage = '';

    const collectedData = this.collectAllData();
    const request: GenerateDiagnosisRequest = {
      appointmentId: this.appointmentId,
      additionalContext: this.additionalContext,
      ...collectedData
    };

    console.log('[AI Tab] Enviando requisição para gerar hipótese diagnóstica:', request);

    this.aiService.generateDiagnosis(request).subscribe({
      next: (response) => {
        this.diagnosticHypothesis = response.diagnosticHypothesis;
        this.diagnosisGeneratedAt = new Date(response.generatedAt);
        this.isGeneratingDiagnosis = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error generating diagnosis:', err);
        this.errorMessage = err.error?.message || 'Erro ao gerar hipótese diagnóstica. Verifique a configuração da API de IA.';
        this.isGeneratingDiagnosis = false;
        this.cdr.detectChanges();
      }
    });
  }

  saveData() {
    if (!this.appointmentId || this.readonly) return;

    this.isSaving = true;
    this.aiService.saveAIData(this.appointmentId, {
      summary: this.summary,
      diagnosticHypothesis: this.diagnosticHypothesis
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error saving AI data:', err);
        this.isSaving = false;
        this.errorMessage = 'Erro ao salvar dados.';
        this.cdr.detectChanges();
      }
    });
  }

  clearError() {
    this.errorMessage = '';
  }
}
