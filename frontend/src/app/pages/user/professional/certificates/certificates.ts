import { Component, OnInit, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ModalService } from '@core/services/modal.service';
import { CertificateService, SavedCertificate, PfxCertificateInfo } from '@core/services/certificate.service';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './certificates.html',
  styleUrl: './certificates.scss'
})
export class CertificatesComponent implements OnInit {
  @ViewChild('pfxFileInput') pfxFileInput!: ElementRef<HTMLInputElement>;

  // Estado
  certificates: SavedCertificate[] = [];
  isLoading = false;

  // Modal de adicionar certificado
  showAddModal = false;
  addStep: 'select' | 'validate' | 'configure' = 'select';
  pfxFile: File | null = null;
  pfxPassword = '';
  isValidating = false;
  certInfo: PfxCertificateInfo | null = null;
  certName = '';
  requirePasswordOnUse = true;
  isSaving = false;

  // Modal de editar certificado
  showEditModal = false;
  editingCert: SavedCertificate | null = null;
  editName = '';
  editRequirePassword = true;
  isUpdating = false;

  // Modal de confirmar exclusão
  showDeleteModal = false;
  deletingCert: SavedCertificate | null = null;
  isDeleting = false;

  // Modal de confirmar desativar senha
  showConfirmNoPasswordModal = false;
  confirmPassword = '';
  pendingRequirePasswordChange = false;

  private isBrowser: boolean;

  constructor(
    private certificateService: CertificateService,
    private modalService: ModalService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Só carregar certificados no browser (não no SSR)
    if (this.isBrowser) {
      this.loadCertificates();
    }
  }

  loadCertificates(): void {
    this.isLoading = true;
    this.certificateService.loadSavedCertificates().subscribe({
      next: (certs) => {
        this.certificates = certs;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.modalService.alert({
          title: 'Erro',
          message: 'Não foi possível carregar seus certificados.',
          variant: 'danger'
        }).subscribe();
      }
    });
  }

  // === Adicionar Certificado ===

  openAddModal(): void {
    this.showAddModal = true;
    this.addStep = 'select';
    this.pfxFile = null;
    this.pfxPassword = '';
    this.certInfo = null;
    this.certName = '';
    this.requirePasswordOnUse = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.pfxFile = null;
    this.pfxPassword = '';
    this.certInfo = null;
  }

  triggerFileSelect(): void {
    this.pfxFileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.pfxFile = input.files[0];
      this.addStep = 'validate';
    }
    input.value = '';
  }

  async validatePfx(): Promise<void> {
    if (!this.pfxFile || !this.pfxPassword) return;

    this.isValidating = true;
    try {
      const base64 = await this.certificateService.fileToBase64(this.pfxFile);
      this.certificateService.validatePfx(base64, this.pfxPassword).subscribe({
        next: (info) => {
          this.isValidating = false;
          if (info.isValid) {
            this.certInfo = info;
            this.certName = this.certificateService.formatSubjectName(info.subjectName);
            this.addStep = 'configure';
          } else {
            this.modalService.alert({
              title: 'Certificado Inválido',
              message: info.errorMessage || 'O certificado não é válido ou a senha está incorreta.',
              variant: 'danger'
            }).subscribe();
          }
        },
        error: (err) => {
          this.isValidating = false;
          this.modalService.alert({
            title: 'Erro',
            message: err.error?.message || 'Não foi possível validar o certificado. Verifique a senha.',
            variant: 'danger'
          }).subscribe();
        }
      });
    } catch {
      this.isValidating = false;
      this.modalService.alert({
        title: 'Erro',
        message: 'Erro ao ler o arquivo.',
        variant: 'danger'
      }).subscribe();
    }
  }

  async saveCertificate(): Promise<void> {
    if (!this.pfxFile || !this.certInfo) return;

    this.isSaving = true;
    try {
      const base64 = await this.certificateService.fileToBase64(this.pfxFile);
      this.certificateService.saveCertificate({
        name: this.certName || this.certificateService.formatSubjectName(this.certInfo.subjectName),
        pfxBase64: base64,
        password: this.pfxPassword,
        requirePasswordOnUse: this.requirePasswordOnUse
      }).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeAddModal();
          this.loadCertificates();
          this.modalService.alert({
            title: 'Sucesso',
            message: 'Certificado salvo com sucesso!',
            variant: 'success'
          }).subscribe();
        },
        error: (err) => {
          this.isSaving = false;
          this.modalService.alert({
            title: 'Erro',
            message: err.error?.message || 'Não foi possível salvar o certificado.',
            variant: 'danger'
          }).subscribe();
        }
      });
    } catch {
      this.isSaving = false;
    }
  }

  // === Editar Certificado ===

  openEditModal(cert: SavedCertificate): void {
    this.editingCert = cert;
    this.editName = cert.name;
    this.editRequirePassword = cert.requirePasswordOnUse;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingCert = null;
  }

  onRequirePasswordChange(value: boolean): void {
    if (!value && this.editingCert?.requirePasswordOnUse) {
      // Está tentando desativar a exigência de senha - precisa confirmar
      this.pendingRequirePasswordChange = true;
      this.confirmPassword = '';
      this.showConfirmNoPasswordModal = true;
    } else {
      this.editRequirePassword = value;
    }
  }

  closeConfirmNoPasswordModal(): void {
    this.showConfirmNoPasswordModal = false;
    this.confirmPassword = '';
    this.pendingRequirePasswordChange = false;
  }

  async confirmDisablePassword(): Promise<void> {
    if (!this.confirmPassword || !this.editingCert) return;

    // Validar a senha antes de permitir desativar
    this.isValidating = true;
    
    this.certificateService.validateSavedCertificatePassword(this.editingCert.id, this.confirmPassword).subscribe({
      next: (result) => {
        this.isValidating = false;
        if (result.isValid) {
          this.editRequirePassword = false;
          this.showConfirmNoPasswordModal = false;
          this.confirmPassword = '';
          this.pendingRequirePasswordChange = false;
        } else {
          this.modalService.alert({
            title: 'Senha Incorreta',
            message: 'A senha informada está incorreta. Tente novamente.',
            variant: 'danger'
          }).subscribe();
        }
      },
      error: () => {
        this.isValidating = false;
        this.modalService.alert({
          title: 'Erro',
          message: 'Não foi possível validar a senha. Tente novamente.',
          variant: 'danger'
        }).subscribe();
      }
    });
  }

  updateCertificate(): void {
    if (!this.editingCert) return;

    this.isUpdating = true;
    this.certificateService.updateCertificate(this.editingCert.id, {
      name: this.editName,
      requirePasswordOnUse: this.editRequirePassword
    }).subscribe({
      next: () => {
        this.isUpdating = false;
        this.closeEditModal();
        this.loadCertificates();
        this.modalService.alert({
          title: 'Sucesso',
          message: 'Certificado atualizado com sucesso!',
          variant: 'success'
        }).subscribe();
      },
      error: (err) => {
        this.isUpdating = false;
        this.modalService.alert({
          title: 'Erro',
          message: err.error?.message || 'Não foi possível atualizar o certificado.',
          variant: 'danger'
        }).subscribe();
      }
    });
  }

  // === Excluir Certificado ===

  openDeleteModal(cert: SavedCertificate): void {
    this.deletingCert = cert;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingCert = null;
  }

  deleteCertificate(): void {
    if (!this.deletingCert) return;

    this.isDeleting = true;
    this.certificateService.deleteCertificate(this.deletingCert.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadCertificates();
        this.modalService.alert({
          title: 'Sucesso',
          message: 'Certificado excluído com sucesso!',
          variant: 'success'
        }).subscribe();
      },
      error: (err) => {
        this.isDeleting = false;
        this.modalService.alert({
          title: 'Erro',
          message: err.error?.message || 'Não foi possível excluir o certificado.',
          variant: 'danger'
        }).subscribe();
      }
    });
  }

  // === Helpers ===

  isCertificateValid(cert: SavedCertificate): boolean {
    return this.certificateService.isCertificateValid(cert);
  }

  formatSubjectName(name: string): string {
    return this.certificateService.formatSubjectName(name);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  getDaysUntilExpiry(validTo: Date | string): number {
    const now = new Date();
    const expiry = new Date(validTo);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getExpiryStatus(cert: SavedCertificate): 'valid' | 'warning' | 'expired' {
    const days = this.getDaysUntilExpiry(cert.validTo);
    if (days < 0) return 'expired';
    if (days < 30) return 'warning';
    return 'valid';
  }
}
