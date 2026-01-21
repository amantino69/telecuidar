import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { PreConsultationForm } from '@core/services/appointments.service';
import { MediaPreviewModalComponent } from '@shared/components/molecules/media-preview-modal/media-preview-modal';

@Component({
  selector: 'app-pre-consultation-details-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, MediaPreviewModalComponent],
  templateUrl: './pre-consultation-details-modal.html',
  styleUrls: ['./pre-consultation-details-modal.scss']
})
export class PreConsultationDetailsModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() preConsultation: string | undefined;
  @Output() close = new EventEmitter<void>();

  parsedPreConsultation: PreConsultationForm | null = null;
  
  // Media preview
  isPreviewOpen = false;
  previewUrl = '';
  previewTitle = '';
  previewType: 'image' | 'file' = 'image';

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

  openAttachment(attachment: { title: string; fileUrl: string; type: string }) {
    this.previewUrl = attachment.fileUrl;
    this.previewTitle = attachment.title;
    this.previewType = attachment.type === 'image' ? 'image' : 'file';
    this.isPreviewOpen = true;
  }

  closePreview() {
    this.isPreviewOpen = false;
  }

  downloadAttachment() {
    const link = document.createElement('a');
    link.href = this.previewUrl;
    link.download = this.previewTitle;
    link.click();
  }

  onClose() {
    this.close.emit();
  }
}
