import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, IconName } from '@shared/components/atoms/icon/icon';
import { 
  ClinicalTimelineService, 
  ClinicalTimeline, 
  TimelineEntry,
  TimelineBiometrics 
} from '@core/services/clinical-timeline.service';
import { Appointment } from '@core/services/appointments.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-patient-history-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, DatePipe],
  templateUrl: './patient-history-tab.html',
  styleUrls: ['./patient-history-tab.scss']
})
export class PatientHistoryTabComponent implements OnInit, OnChanges {
  @Input() appointmentId: string | null = null;
  @Input() appointment: Appointment | null = null;
  @Input() isDetailsView = false;

  // Estado
  loading = false;
  error: string | null = null;
  
  // Dados da timeline
  timeline: ClinicalTimeline | null = null;
  
  // Entrada selecionada para detalhes
  selectedEntry: TimelineEntry | null = null;
  loadingDetails = false;
  
  // Comparação
  compareMode = false;
  selectedForCompare: TimelineEntry[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private timelineService: ClinicalTimelineService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadTimeline();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appointment'] && !changes['appointment'].firstChange) {
      this.loadTimeline();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carrega a timeline clínica do paciente
   */
  loadTimeline() {
    if (!this.appointment?.patientId) {
      this.error = 'Paciente não identificado';
      return;
    }

    this.loading = true;
    this.error = null;

    this.timelineService.getTimelineByPatientId(
      this.appointment.patientId, 
      false, 
      'Visualização durante teleconsulta'
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (timeline) => {
        this.timeline = timeline;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Erro ao carregar histórico clínico';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Carrega detalhes de uma entrada da timeline
   */
  loadEntryDetails(entry: TimelineEntry) {
    if (this.selectedEntry?.appointmentId === entry.appointmentId) {
      this.selectedEntry = null;
      return;
    }

    this.loadingDetails = true;
    this.timelineService.getAppointmentDetails(entry.appointmentId, 'Visualização de detalhes da consulta anterior')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.selectedEntry = details;
          this.loadingDetails = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erro ao carregar detalhes:', err);
          this.loadingDetails = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Toggle modo de comparação
   */
  toggleCompareMode() {
    this.compareMode = !this.compareMode;
    if (!this.compareMode) {
      this.selectedForCompare = [];
    }
  }

  /**
   * Toggle seleção para comparação
   */
  toggleCompareSelection(entry: TimelineEntry) {
    const index = this.selectedForCompare.findIndex(e => e.appointmentId === entry.appointmentId);
    if (index >= 0) {
      this.selectedForCompare.splice(index, 1);
    } else if (this.selectedForCompare.length < 2) {
      this.selectedForCompare.push(entry);
    }
  }

  /**
   * Verifica se uma entrada está selecionada para comparação
   */
  isSelectedForCompare(entry: TimelineEntry): boolean {
    return this.selectedForCompare.some(e => e.appointmentId === entry.appointmentId);
  }

  /**
   * Formata data para exibição
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  /**
   * Formata pressão arterial
   */
  formatBloodPressure(bio?: TimelineBiometrics): string {
    if (!bio?.bloodPressureSystolic || !bio?.bloodPressureDiastolic) return '-';
    return `${bio.bloodPressureSystolic}/${bio.bloodPressureDiastolic} mmHg`;
  }

  /**
   * Retorna classe CSS baseada na variação de pressão
   */
  getPressureClass(current?: TimelineBiometrics, previous?: TimelineBiometrics): string {
    if (!current?.bloodPressureSystolic || !previous?.bloodPressureSystolic) return '';
    
    const diff = current.bloodPressureSystolic - previous.bloodPressureSystolic;
    if (diff > 10) return 'text-danger';
    if (diff < -10) return 'text-success';
    return 'text-muted';
  }

  /**
   * Retorna ícone de status
   */
  getStatusIcon(status: string): IconName {
    switch (status) {
      case 'Completed': return 'check-circle';
      case 'InProgress': return 'clock';
      case 'Cancelled': return 'x-circle';
      default: return 'circle';
    }
  }

  /**
   * Retorna label de status
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'Completed': return 'Concluída';
      case 'InProgress': return 'Em andamento';
      case 'Cancelled': return 'Cancelada';
      case 'Scheduled': return 'Agendada';
      default: return status;
    }
  }

  /**
   * Verifica se é a consulta atual
   */
  isCurrentAppointment(entry: TimelineEntry): boolean {
    return entry.appointmentId === this.appointmentId;
  }
}
