import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { Appointment, PreConsultationForm } from '@core/services/appointments.service';

@Component({
  selector: 'app-pre-consultation-data-tab',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './pre-consultation-data-tab.html',
  styleUrls: ['./pre-consultation-data-tab.scss']
})
export class PreConsultationDataTabComponent implements OnInit {
  @Input() appointment: Appointment | null = null;
  
  preConsultationData: PreConsultationForm | null = null;
  hasData = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadPreConsultationData();
  }

  loadPreConsultationData() {
    if (this.appointment?.preConsultationJson) {
      try {
        this.preConsultationData = JSON.parse(this.appointment.preConsultationJson);
        this.hasData = true;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Erro ao parsear dados da pré-consulta:', error);
        this.hasData = false;
        this.cdr.detectChanges();
      }
    }
  }

  getLifestyleLabel(value: string): string {
    const labels: Record<string, string> = {
      'sim': 'Sim',
      'nao': 'Não',
      'ex-fumante': 'Ex-fumante',
      'nenhum': 'Nenhum',
      'social': 'Social',
      'frequente': 'Frequente',
      'nenhuma': 'Nenhuma',
      'leve': 'Leve',
      'moderada': 'Moderada',
      'intensa': 'Intensa'
    };
    return labels[value] || value;
  }
}
