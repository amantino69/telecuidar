import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { QrCodeModalComponent } from '@pages/user/patient/pre-consultation/qrcode-modal/qrcode-modal';
import { TeleconsultationRealTimeService, MobileUploadEvent } from '@core/services/teleconsultation-realtime.service';
import { ModalService } from '@core/services/modal.service';
import { Subject, takeUntil } from 'rxjs';

export interface MobileUploadReceivedEvent {
  title: string;
  type: 'image' | 'document';
  fileUrl: string;
  timestamp: number;
}

@Component({
  selector: 'app-mobile-upload-button',
  standalone: true,
  imports: [CommonModule, IconComponent, QrCodeModalComponent],
  templateUrl: './mobile-upload-button.html',
  styleUrls: ['./mobile-upload-button.scss']
})
export class MobileUploadButtonComponent implements OnInit, OnDestroy {
  /**
   * Variante do botão: 'button' para botão estilizado, 'icon' para apenas ícone
   */
  @Input() variant: 'button' | 'icon' = 'button';
  
  /**
   * Texto do botão quando não há link ativo
   */
  @Input() buttonText = 'Usar Celular';
  
  /**
   * Texto do botão quando há link ativo
   */
  @Input() activeText = 'Link Ativo';
  
  /**
   * Se deve mostrar notificação automática quando receber upload
   */
  @Input() showNotification = true;
  
  /**
   * Emitido quando um upload é recebido via SignalR
   */
  @Output() uploadReceived = new EventEmitter<MobileUploadReceivedEvent>();
  
  isQrCodeModalOpen = false;
  mobileUploadUrl = '';
  mobileUploadToken = '';
  
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

  constructor(
    private teleconsultationRealTime: TeleconsultationRealTimeService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.setupRealTimeSubscriptions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Unregister mobile upload token if active
    if (this.mobileUploadToken) {
      this.teleconsultationRealTime.unregisterMobileUploadToken(this.mobileUploadToken);
    }
  }

  private setupRealTimeSubscriptions(): void {
    // Listen for mobile uploads via SignalR
    this.teleconsultationRealTime.mobileUploadReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: MobileUploadEvent) => {
        this.handleMobileUploadReceived(event);
      });
  }

  /**
   * Handles mobile upload received via SignalR (instant notification)
   */
  private handleMobileUploadReceived(event: MobileUploadEvent): void {
    const uploadEvent: MobileUploadReceivedEvent = {
      title: event.title,
      type: event.type === 'image' ? 'image' : 'document',
      fileUrl: event.fileUrl,
      timestamp: event.timestamp
    };

    // Emit event for parent component to handle
    this.uploadReceived.emit(uploadEvent);

    // Show notification if enabled
    if (this.showNotification) {
      this.modalService.alert({
        title: 'Upload Recebido',
        message: `Arquivo "${event.title}" enviado! Você pode enviar mais arquivos.`,
        variant: 'success'
      }).subscribe();
    }

    this.cdr.detectChanges();
  }

  openMobileUpload(): void {
    if (!this.mobileUploadToken) {
      this.mobileUploadToken = this.generateToken();
      this.mobileUploadUrl = `${window.location.origin}/mobile-upload?token=${this.mobileUploadToken}`;
      // Register for SignalR notifications
      this.teleconsultationRealTime.registerMobileUploadToken(this.mobileUploadToken);
    }
    this.isQrCodeModalOpen = true;
  }

  async regenerateQrCode(): Promise<void> {
    // Unregister old token
    if (this.mobileUploadToken) {
      await this.teleconsultationRealTime.unregisterMobileUploadToken(this.mobileUploadToken);
    }
    // Generate new token
    this.mobileUploadToken = this.generateToken();
    this.mobileUploadUrl = `${window.location.origin}/mobile-upload?token=${this.mobileUploadToken}`;
    // Register for SignalR notifications
    await this.teleconsultationRealTime.registerMobileUploadToken(this.mobileUploadToken);
  }

  closeQrCodeModal(): void {
    this.isQrCodeModalOpen = false;
    // Keep SignalR subscription active even with modal closed
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(7);
  }

  /**
   * Check if upload link is active
   */
  get isActive(): boolean {
    return !!this.mobileUploadToken;
  }
}
