import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { CertificateService, SavedCertificate, PfxCertificateInfo } from '@core/services/certificate.service';
import { ModalService } from '@core/services/modal.service';

/**
 * Interface para o resultado da assinatura digital
 */
export interface DigitalSignatureResult {
  type: 'saved-cert' | 'pfx-file';
  certificateId?: string;       // Para certificado salvo
  password?: string;            // Senha do certificado (quando requerida)
  pfxBase64?: string;           // Para arquivo PFX
}

/**
 * Componente reutilizável para assinatura digital com certificados A1
 * 
 * Suporta:
 * - Seleção de certificados já salvos na plataforma
 * - Upload de arquivo PFX para uso único
 * - Salvamento de novo certificado
 * - Validação de certificados
 */
@Component({
  selector: 'app-digital-signature',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './digital-signature.html',
  styleUrls: ['./digital-signature.scss']
})
export class DigitalSignatureComponent implements OnInit, OnDestroy {
  /** Título do documento a ser assinado (ex: "Receita", "Atestado") */
  @Input() documentTitle = 'Documento';
  
  /** Texto do botão de confirmação */
  @Input() signButtonText = 'Assinar';
  
  /** Se o componente está em processo de assinatura */
  @Input() isSigning = false;
  
  /** Emitido quando o usuário confirma a assinatura */
  @Output() sign = new EventEmitter<DigitalSignatureResult>();
  
  /** Emitido quando o usuário cancela */
  @Output() cancel = new EventEmitter<void>();
  
  /** Emitido quando um novo certificado é salvo com sucesso */
  @Output() certificateSaved = new EventEmitter<void>();

  @ViewChild('pfxFileInput') pfxFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('saveCertPfxInput') saveCertPfxInput!: ElementRef<HTMLInputElement>;

  // Estado dos modais
  showSavedCertsModal = false;
  showSignatureOptionsModal = false;
  showCertPasswordModal = false;
  showPfxPasswordModal = false;
  showSaveCertModal = false;

  // Certificados salvos
  savedCertificates: SavedCertificate[] = [];
  selectedSavedCert: SavedCertificate | null = null;
  certPasswordForSign = '';

  // Arquivo PFX
  pfxFile: File | null = null;
  pfxPassword = '';

  // Salvar certificado
  saveCertName = '';
  saveCertRequirePassword = true;
  saveCertInfo: PfxCertificateInfo | null = null;
  isValidatingPfx = false;
  isSavingCert = false;

  private destroy$ = new Subject<void>();

  constructor(
    private certificateService: CertificateService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadSavedCertificates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Abre o fluxo de assinatura digital
   */
  open() {
    if (this.savedCertificates.length > 0) {
      this.selectedSavedCert = null;
      this.showSavedCertsModal = true;
    } else {
      this.showSignatureOptionsModal = true;
    }
  }

  private loadSavedCertificates() {
    this.certificateService.loadSavedCertificates().subscribe();
    this.certificateService.getSavedCertificates().pipe(
      takeUntil(this.destroy$)
    ).subscribe(certs => {
      this.savedCertificates = certs;
    });
  }

  // ========================================
  // Modal de Certificados Salvos
  // ========================================

  closeSavedCertsModal() {
    this.showSavedCertsModal = false;
    this.selectedSavedCert = null;
    this.cancel.emit();
  }

  selectSavedCertificate(cert: SavedCertificate) {
    this.selectedSavedCert = cert;
  }

  confirmSavedCertSignature() {
    if (!this.selectedSavedCert) return;

    if (this.selectedSavedCert.requirePasswordOnUse) {
      this.certPasswordForSign = '';
      this.showCertPasswordModal = true;
      this.showSavedCertsModal = false;
    } else {
      this.emitSignWithSavedCert();
    }
  }

  private emitSignWithSavedCert() {
    console.log('emitSignWithSavedCert chamado');
    console.log('selectedSavedCert:', this.selectedSavedCert);
    
    if (!this.selectedSavedCert) {
      console.error('selectedSavedCert é null!');
      return;
    }

    const result: DigitalSignatureResult = {
      type: 'saved-cert',
      certificateId: this.selectedSavedCert.id,
      password: this.selectedSavedCert.requirePasswordOnUse ? this.certPasswordForSign : undefined
    };

    console.log('Emitindo evento sign com resultado:', result);
    
    this.showSavedCertsModal = false;
    this.showCertPasswordModal = false;
    this.sign.emit(result);
  }

  useFileCertificate() {
    this.closeSavedCertsModal();
    this.openPfxSelector();
  }

  // ========================================
  // Modal de Senha do Certificado Salvo
  // ========================================

  closeCertPasswordModal() {
    this.showCertPasswordModal = false;
    this.certPasswordForSign = '';
    this.cancel.emit();
  }

  confirmCertPassword() {
    if (!this.certPasswordForSign) return;
    this.emitSignWithSavedCert();
  }

  // ========================================
  // Modal de Opções de Assinatura
  // ========================================

  closeSignatureOptionsModal() {
    this.showSignatureOptionsModal = false;
    this.cancel.emit();
  }

  usePfxFile() {
    this.showSignatureOptionsModal = false;
    this.openPfxSelector();
  }

  // ========================================
  // Seleção e uso de arquivo PFX
  // ========================================

  openPfxSelector() {
    if (this.pfxFileInput) {
      this.pfxFileInput.nativeElement.click();
    }
  }

  onPfxFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.pfxFile = input.files[0];
      this.pfxPassword = '';
      this.showPfxPasswordModal = true;
    }
    input.value = '';
  }

  closePfxPasswordModal() {
    this.showPfxPasswordModal = false;
    this.pfxFile = null;
    this.pfxPassword = '';
    this.cancel.emit();
  }

  async confirmPfxSignature() {
    if (!this.pfxFile || !this.pfxPassword) return;

    try {
      const pfxBase64 = await this.fileToBase64(this.pfxFile);
      
      const result: DigitalSignatureResult = {
        type: 'pfx-file',
        pfxBase64,
        password: this.pfxPassword
      };

      this.showPfxPasswordModal = false;
      this.sign.emit(result);
    } catch {
      this.modalService.alert({
        title: 'Erro',
        message: 'Erro ao ler o arquivo do certificado.',
        variant: 'danger'
      }).subscribe();
    }
  }

  // ========================================
  // Salvar novo certificado
  // ========================================

  openSaveCertModal() {
    this.showSignatureOptionsModal = false;
    this.showSavedCertsModal = false;
    this.saveCertName = '';
    this.saveCertRequirePassword = true;
    this.saveCertInfo = null;
    this.pfxFile = null;
    this.pfxPassword = '';
    this.showSaveCertModal = true;
  }

  closeSaveCertModal() {
    this.showSaveCertModal = false;
    this.saveCertInfo = null;
    this.pfxFile = null;
    this.pfxPassword = '';
    this.cancel.emit();
  }

  private closeSaveCertModalWithoutCancel() {
    this.showSaveCertModal = false;
    this.saveCertInfo = null;
    this.pfxFile = null;
    this.pfxPassword = '';
    // NÃO emite cancel - usado quando salvamento for bem-sucedido e queremos continuar com assinatura
  }

  onSaveCertPfxSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.pfxFile = input.files[0];
      this.saveCertInfo = null;
    }
    input.value = '';
  }

  async validatePfxForSave() {
    if (!this.pfxFile || !this.pfxPassword) return;

    this.isValidatingPfx = true;

    try {
      const pfxBase64 = await this.fileToBase64(this.pfxFile);
      this.certificateService.validatePfx(pfxBase64, this.pfxPassword).subscribe({
        next: (info) => {
          this.isValidatingPfx = false;
          this.saveCertInfo = info;
          this.cdr.detectChanges();
          if (!info.isValid) {
            this.modalService.alert({
              title: 'Certificado Inválido',
              message: info.errorMessage || 'O certificado não é válido.',
              variant: 'warning'
            }).subscribe();
          } else {
            this.saveCertName = this.certificateService.formatSubjectName(info.subjectName);
          }
        },
        error: (error) => {
          this.isValidatingPfx = false;
          this.cdr.detectChanges();
          this.modalService.alert({
            title: 'Erro',
            message: error.error?.message || 'Erro ao validar certificado.',
            variant: 'danger'
          }).subscribe();
        }
      });
    } catch {
      this.isValidatingPfx = false;
      this.cdr.detectChanges();
      this.modalService.alert({
        title: 'Erro',
        message: 'Erro ao ler arquivo do certificado.',
        variant: 'danger'
      }).subscribe();
    }
  }

  async saveCertificate() {
    if (!this.pfxFile || !this.pfxPassword || !this.saveCertInfo?.isValid) return;

    this.isSavingCert = true;

    try {
      const pfxBase64 = await this.fileToBase64(this.pfxFile);
      
      this.certificateService.saveCertificate({
        name: this.saveCertName || this.certificateService.formatSubjectName(this.saveCertInfo.subjectName),
        pfxBase64,
        password: this.pfxPassword,
        requirePasswordOnUse: this.saveCertRequirePassword
      }).subscribe({
        next: (savedCert) => {
          this.isSavingCert = false;
          this.closeSaveCertModalWithoutCancel(); // Fecha modal SEM emitir cancel
          this.loadSavedCertificates();
          this.certificateSaved.emit();
          
          console.log('Certificado salvo com sucesso:', savedCert);
          console.log('RequirePasswordOnUse:', savedCert.requirePasswordOnUse);
          
          // Auto-aplicar o certificado recém-salvo
          this.selectedSavedCert = savedCert;
          this.certPasswordForSign = '';
          
          // Forçar detecção de mudanças
          this.cdr.detectChanges();
          
          // Se não requer senha ao usar, assinar imediatamente
          if (!savedCert.requirePasswordOnUse) {
            console.log('Assinando automaticamente sem senha...');
            // Usar setTimeout para garantir que o estado foi atualizado
            setTimeout(() => {
              this.emitSignWithSavedCert();
            }, 100);
          } else {
            // Se requer senha, mostrar modal de senha
            console.log('Mostrando modal de senha...');
            this.showCertPasswordModal = true;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          this.isSavingCert = false;
          this.cdr.detectChanges();
          this.modalService.alert({
            title: 'Erro',
            message: error.error?.message || 'Erro ao salvar certificado.',
            variant: 'danger'
          }).subscribe();
        }
      });
    } catch {
      this.isSavingCert = false;
      this.cdr.detectChanges();
      this.modalService.alert({
        title: 'Erro',
        message: 'Erro ao processar certificado.',
        variant: 'danger'
      }).subscribe();
    }
  }

  // ========================================
  // Helpers
  // ========================================

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:... prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
