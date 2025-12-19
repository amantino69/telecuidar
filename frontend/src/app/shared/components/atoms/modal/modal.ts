import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ModalService, ModalConfig } from '@app/core/services/modal.service';
import { IconComponent, IconName } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent, FormsModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  
  isOpen = false;
  config: ModalConfig | null = null;
  private subscription?: Subscription;
  promptValue = '';
  modalZIndex = 2010;
  safeHtmlMessage: SafeHtml | null = null;

  ngOnInit(): void {
    this.subscription = this.modalService.modal$.subscribe((config: ModalConfig) => {
      // Calcular o z-index antes de atualizar as propriedades do template
      const nextZIndex = this.modalService.getNextZIndex();
      
      // Executar dentro do NgZone para garantir detecção de mudanças correta
      this.ngZone.run(() => {
        this.config = config;
        this.modalZIndex = nextZIndex;
        this.promptValue = '';
        
        // Sanitizar HTML se fornecido
        // Usando bypassSecurityTrustHtml pois o HTML vem de fontes controladas pela aplicação
        if (config.htmlMessage) {
          this.safeHtmlMessage = this.sanitizer.bypassSecurityTrustHtml(config.htmlMessage);
        } else {
          this.safeHtmlMessage = null;
        }
        
        // Atualizar isOpen por último para evitar renderização com valores incompletos
        this.isOpen = true;
        
        // Usar markForCheck para agendar verificação no próximo ciclo
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onConfirm(): void {
    this.isOpen = false;
    this.cdr.markForCheck();
    this.modalService.close({ confirmed: true, promptValue: this.promptValue });
  }

  onCancel(): void {
    this.isOpen = false;
    this.cdr.markForCheck();
    this.modalService.close({ confirmed: false });
  }

  onBackdropClick(): void {
    if (this.config?.type === 'alert') {
      this.onConfirm();
    } else {
      this.onCancel();
    }
  }

  get icon(): IconName {
    switch (this.config?.variant) {
      case 'danger':
        return 'x-circle';
      case 'warning':
        return 'alert-circle';
      case 'success':
        return 'check-circle';
      case 'info':
      default:
        return 'alert-circle';
    }
  }

  get iconColor(): string {
    switch (this.config?.variant) {
      case 'danger':
        return 'var(--red-600)';
      case 'warning':
        return '#f59e0b';
      case 'success':
        return 'var(--green-600)';
      case 'info':
      default:
        return 'var(--blue-600)';
    }
  }
}
