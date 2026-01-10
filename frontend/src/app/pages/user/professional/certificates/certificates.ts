import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { BadgeComponent } from '@shared/components/atoms/badge/badge';
import { ModalService } from '@core/services/modal.service';
import { 
  DigitalCertificateService, 
  DigitalCertificate,
  CertificateValidationResult,
  SaveCertificateDto,
  UpdateCertificateDto
} from '@core/services/digital-certificate.service';

type ViewState = 'list' | 'add' | 'edit';

interface CertificateFormData {
  file: File | null;
  password: string;
  displayName: string;
  quickUseEnabled: boolean;
  validation: CertificateValidationResult | null;
}

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, BadgeComponent],
  templateUrl: './certificates.html',
  styleUrls: ['./certificates.scss']
})
export class CertificatesComponent implements OnInit {
  certificates: DigitalCertificate[] = [];
  isLoading = true;
  viewState: ViewState = 'list';
  
  // Form data
  formData: CertificateFormData = {
    file: null,
    password: '',
    displayName: '',
    quickUseEnabled: false,
    validation: null
  };
  
  // Edit mode
  editingCertificate: DigitalCertificate | null = null;
  editForm = {
    displayName: '',
    quickUseEnabled: false,
    password: ''
  };
  
  // State flags
  isValidating = false;
  isSaving = false;
  isDeleting = false;
  
  // Password visibility toggles
  showFormPassword = false;
  showEditPassword = false;
  
  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;
  private platformId = inject(PLATFORM_ID);

  constructor(
    private certificateService: DigitalCertificateService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Só carrega certificados no navegador (evita erro 401 no SSR)
    if (isPlatformBrowser(this.platformId)) {
      this.loadCertificates();
    } else {
      this.isLoading = false;
    }
  }

  loadCertificates() {
    this.isLoading = true;
    this.certificateService.getMyCertificates().subscribe({
      next: (certs) => {
        this.certificates = certs;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar certificados:', err);
        this.certificates = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  startAddCertificate() {
    this.viewState = 'add';
    this.resetForm();
  }

  cancelForm() {
    this.viewState = 'list';
    this.resetForm();
    this.editingCertificate = null;
  }

  private resetForm() {
    this.formData = {
      file: null,
      password: '',
      displayName: '',
      quickUseEnabled: false,
      validation: null
    };
    this.editForm = {
      displayName: '',
      quickUseEnabled: false,
      password: ''
    };
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
        this.showToastMessage('Selecione um arquivo .pfx ou .p12', 'error');
        return;
      }
      this.formData.file = file;
      this.formData.validation = null;
    }
  }

  async validateCertificate() {
    if (!this.formData.file || !this.formData.password) {
      this.showToastMessage('Selecione o arquivo e informe a senha', 'error');
      return;
    }

    this.isValidating = true;
    try {
      const pfxBase64 = await this.certificateService.fileToBase64(this.formData.file);
      
      this.certificateService.validateCertificate({
        pfxBase64,
        password: this.formData.password
      }).subscribe({
        next: (result) => {
          this.formData.validation = result;
          if (result.isValid && result.nameFromCertificate && !this.formData.displayName) {
            this.formData.displayName = result.nameFromCertificate;
          }
          this.isValidating = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erro ao validar:', err);
          this.showToastMessage('Erro ao validar certificado', 'error');
          this.isValidating = false;
          this.cdr.detectChanges();
        }
      });
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      this.showToastMessage('Erro ao ler arquivo', 'error');
      this.isValidating = false;
    }
  }

  async saveCertificate() {
    if (!this.formData.file || !this.formData.password || !this.formData.validation?.isValid) {
      this.showToastMessage('Valide o certificado primeiro', 'error');
      return;
    }

    if (!this.formData.displayName.trim()) {
      this.showToastMessage('Informe um nome para o certificado', 'error');
      return;
    }

    this.isSaving = true;
    try {
      const pfxBase64 = await this.certificateService.fileToBase64(this.formData.file);
      
      const dto: SaveCertificateDto = {
        pfxBase64,
        password: this.formData.password,
        displayName: this.formData.displayName.trim(),
        quickUseEnabled: this.formData.quickUseEnabled
      };

      this.certificateService.saveCertificate(dto).subscribe({
        next: () => {
          this.showToastMessage('Certificado salvo com sucesso!', 'success');
          this.viewState = 'list';
          this.resetForm();
          this.loadCertificates();
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erro ao salvar:', err);
          const msg = err?.error?.message || 'Erro ao salvar certificado';
          this.showToastMessage(msg, 'error');
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    } catch (err) {
      console.error('Erro:', err);
      this.showToastMessage('Erro ao processar certificado', 'error');
      this.isSaving = false;
    }
  }

  startEditCertificate(cert: DigitalCertificate) {
    this.editingCertificate = cert;
    this.editForm = {
      displayName: cert.displayName,
      quickUseEnabled: cert.quickUseEnabled,
      password: ''
    };
    this.viewState = 'edit';
  }

  async updateCertificate() {
    if (!this.editingCertificate) return;

    if (!this.editForm.displayName.trim()) {
      this.showToastMessage('Informe um nome para o certificado', 'error');
      return;
    }

    // Se está ativando QuickUse, precisa da senha
    if (this.editForm.quickUseEnabled && !this.editingCertificate.quickUseEnabled && !this.editForm.password) {
      this.showToastMessage('Informe a senha para ativar uso rápido', 'error');
      return;
    }

    this.isSaving = true;
    const dto: UpdateCertificateDto = {
      displayName: this.editForm.displayName.trim(),
      quickUseEnabled: this.editForm.quickUseEnabled
    };

    if (this.editForm.quickUseEnabled && !this.editingCertificate.quickUseEnabled) {
      dto.password = this.editForm.password;
    }

    this.certificateService.updateCertificate(this.editingCertificate.id, dto).subscribe({
      next: () => {
        this.showToastMessage('Certificado atualizado!', 'success');
        this.viewState = 'list';
        this.editingCertificate = null;
        this.resetForm();
        this.loadCertificates();
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao atualizar:', err);
        const msg = err?.error?.message || 'Erro ao atualizar certificado';
        this.showToastMessage(msg, 'error');
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  async deleteCertificate(cert: DigitalCertificate) {
    const confirmed = await this.modalService.confirm({
      title: 'Excluir Certificado',
      message: `Tem certeza que deseja excluir o certificado "${cert.displayName}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    if (!confirmed) return;

    this.isDeleting = true;
    this.certificateService.deleteCertificate(cert.id).subscribe({
      next: () => {
        this.showToastMessage('Certificado excluído!', 'success');
        this.loadCertificates();
        this.isDeleting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao excluir:', err);
        this.showToastMessage('Erro ao excluir certificado', 'error');
        this.isDeleting = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  getExpirationBadgeVariant(cert: DigitalCertificate): 'success' | 'warning' | 'error' {
    if (cert.isExpired) return 'error';
    if (cert.daysUntilExpiration <= 30) return 'warning';
    return 'success';
  }

  getExpirationLabel(cert: DigitalCertificate): string {
    if (cert.isExpired) return 'Expirado';
    if (cert.daysUntilExpiration <= 30) return `Expira em ${cert.daysUntilExpiration} dias`;
    return 'Válido';
  }

  private showToastMessage(message: string, type: 'success' | 'error') {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  hideToast() {
    this.showToast = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }
}
