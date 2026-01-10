import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';

export interface InfoModalData {
  icon: string;
  title: string;
  description: string;
  details: string[];
  color?: 'primary' | 'blue' | 'green' | 'red';
}

@Component({
  selector: 'app-info-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  templateUrl: './info-modal.html',
  styleUrl: './info-modal.scss'
})
export class InfoModalComponent {
  @Input() isOpen = false;
  @Input() data: InfoModalData | null = null;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(): void {
    this.close.emit();
  }

  onContentClick(event: Event): void {
    event.stopPropagation();
  }
}
