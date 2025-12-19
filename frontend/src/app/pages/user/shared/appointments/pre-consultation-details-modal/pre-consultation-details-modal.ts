import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { PreConsultationForm } from '@core/services/appointments.service';

@Component({
  selector: 'app-pre-consultation-details-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent],
  templateUrl: './pre-consultation-details-modal.html',
  styleUrls: ['./pre-consultation-details-modal.scss']
})
export class PreConsultationDetailsModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() preConsultation: string | undefined;
  @Output() close = new EventEmitter<void>();

  parsedPreConsultation: PreConsultationForm | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['preConsultation'] && this.preConsultation) {
      try {
        this.parsedPreConsultation = JSON.parse(this.preConsultation);
      } catch (error) {
        console.error('Erro ao fazer parse da pré-consulta:', error);
        this.parsedPreConsultation = null;
      }
    }
  }

  onClose() {
    this.close.emit();
  }
}
