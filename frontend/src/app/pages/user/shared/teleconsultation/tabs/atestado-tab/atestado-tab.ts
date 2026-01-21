import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { ModalService } from '@core/services/modal.service';
import { SignDocumentModalComponent, SignDocumentEvent } from '@shared/components/molecules/sign-document-modal/sign-document-modal';
import { DigitalCertificateService } from '@core/services/digital-certificate.service';
import { 
  MedicalCertificateService, 
  MedicalCertificate, 
  CreateMedicalCertificateDto,
  UpdateMedicalCertificateDto,
  CertificateType
} from '@core/services/medical-certificate.service';

@Component({
  selector: 'app-atestado-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ButtonComponent, IconComponent, SignDocumentModalComponent],
  templateUrl: './atestado-tab.html',
  styleUrls: ['./atestado-tab.scss']
})
export class AtestadoTabComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';
  @Input() readonly = false;

  certificates: MedicalCertificate[] = [];
  isLoading = true;
  isSaving = false;
  isGeneratingPdf = false;
  showForm = false;
  editingCertificate: MedicalCertificate | null = null;
  
  // Form para atestado
  certificateForm: FormGroup;
  
  // Tipos de atestado
  tiposAtestado = [
    { value: 'comparecimento', label: 'Atestado de Comparecimento' },
    { value: 'afastamento', label: 'Atestado de Afastamento' },
    { value: 'aptidao', label: 'Atestado de Aptidão' },
    { value: 'acompanhante', label: 'Atestado de Acompanhante' },
    { value: 'outro', label: 'Outro' }
  ];

  // Modal de assinatura
  showSignModal = false;
  signingCertificateId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private modalService: ModalService,
    private certificateService: MedicalCertificateService,
    private digitalCertificateService: DigitalCertificateService,
    private cdr: ChangeDetectorRef
  ) {
    this.certificateForm = this.fb.group({
      tipo: ['comparecimento', Validators.required],
      dataInicio: [''],
      dataFim: [''],
      diasAfastamento: [null],
      cid: [''],
      observacoes: [''],
      conteudo: ['', Validators.required]
    });
  }

  ngOnInit() {
    if (this.appointmentId) {
      this.loadCertificates();
    }
    
    // Observar mudanças no tipo para atualizar template
    this.certificateForm.get('tipo')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipo => {
        this.updateTemplateByType(tipo);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCertificates() {
    if (!this.appointmentId) return;

    this.isLoading = true;
    this.certificateService.getByAppointment(this.appointmentId).subscribe({
      next: (certificates) => {
        this.certificates = certificates;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar atestados:', err);
        this.certificates = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get isProfessional(): boolean {
    return this.userrole === 'PROFESSIONAL' || this.userrole === 'ADMIN';
  }

  get canEdit(): boolean {
    return this.isProfessional && !this.readonly;
  }

  startNewCertificate() {
    this.editingCertificate = null;
    this.certificateForm.reset({ tipo: 'comparecimento' });
    this.updateTemplateByType('comparecimento');
    this.showForm = true;
  }

  editCertificate(cert: MedicalCertificate) {
    if (cert.isSigned) return; // Não pode editar atestado assinado
    
    this.editingCertificate = cert;
    this.certificateForm.patchValue({
      tipo: cert.tipo,
      dataInicio: cert.dataInicio ? cert.dataInicio.split('T')[0] : '',
      dataFim: cert.dataFim ? cert.dataFim.split('T')[0] : '',
      diasAfastamento: cert.diasAfastamento,
      cid: cert.cid || '',
      observacoes: cert.observacoes || '',
      conteudo: cert.conteudo
    });
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editingCertificate = null;
    this.certificateForm.reset({ tipo: 'comparecimento' });
  }

  saveCertificate() {
    if (this.certificateForm.invalid || !this.appointmentId) return;

    this.isSaving = true;
    const formValue = this.certificateForm.value;

    if (this.editingCertificate) {
      // Atualizar atestado existente
      const updateDto: UpdateMedicalCertificateDto = {
        tipo: formValue.tipo,
        dataInicio: formValue.dataInicio || undefined,
        dataFim: formValue.dataFim || undefined,
        diasAfastamento: formValue.diasAfastamento || undefined,
        cid: formValue.cid || undefined,
        observacoes: formValue.observacoes || undefined,
        conteudo: formValue.conteudo
      };

      this.certificateService.update(this.editingCertificate.id, updateDto).subscribe({
        next: () => {
          this.isSaving = false;
          this.showForm = false;
          this.editingCertificate = null;
          this.loadCertificates();
          this.modalService.alert({ title: 'Sucesso', message: 'Atestado atualizado com sucesso!', variant: 'success' });
        },
        error: (err) => {
          console.error('Erro ao atualizar atestado:', err);
          this.isSaving = false;
          this.cdr.detectChanges();
          this.modalService.alert({ title: 'Erro', message: err.error?.message || 'Não foi possível atualizar o atestado.', variant: 'danger' });
        }
      });
    } else {
      // Criar novo atestado
      const createDto: CreateMedicalCertificateDto = {
        appointmentId: this.appointmentId,
        tipo: formValue.tipo,
        dataInicio: formValue.dataInicio || undefined,
        dataFim: formValue.dataFim || undefined,
        diasAfastamento: formValue.diasAfastamento || undefined,
        cid: formValue.cid || undefined,
        observacoes: formValue.observacoes || undefined,
        conteudo: formValue.conteudo
      };

      this.certificateService.create(createDto).subscribe({
        next: () => {
          this.isSaving = false;
          this.showForm = false;
          this.loadCertificates();
          this.modalService.alert({ title: 'Sucesso', message: 'Atestado criado com sucesso!', variant: 'success' });
        },
        error: (err) => {
          console.error('Erro ao criar atestado:', err);
          this.isSaving = false;
          this.cdr.detectChanges();
          this.modalService.alert({ title: 'Erro', message: err.error?.message || 'Não foi possível criar o atestado.', variant: 'danger' });
        }
      });
    }
  }

  deleteCertificate(cert: MedicalCertificate) {
    if (cert.isSigned) {
      this.modalService.alert({ title: 'Erro', message: 'Não é possível excluir um atestado já assinado.', variant: 'danger' });
      return;
    }

    this.modalService.confirm({
      title: 'Excluir Atestado',
      message: 'Tem certeza que deseja excluir este atestado? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, excluir',
      cancelText: 'Cancelar',
      variant: 'danger'
    }).subscribe(result => {
      if (result.confirmed) {
        this.certificateService.delete(cert.id).subscribe({
          next: () => {
            this.loadCertificates();
            this.modalService.alert({ title: 'Sucesso', message: 'Atestado excluído com sucesso.', variant: 'success' });
          },
          error: (err) => {
            console.error('Erro ao excluir atestado:', err);
            this.modalService.alert({ title: 'Erro', message: err.error?.message || 'Não foi possível excluir o atestado.', variant: 'danger' });
          }
        });
      }
    });
  }

  updateTemplateByType(tipo: string) {
    let template = '';
    
    switch (tipo) {
      case 'comparecimento':
        template = `Atesto para os devidos fins que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde na data de hoje para consulta médica.`;
        break;
      case 'afastamento':
        template = `Atesto para os devidos fins que o(a) paciente acima identificado(a) deverá permanecer afastado(a) de suas atividades laborais pelo período indicado, por motivo de doença.`;
        break;
      case 'aptidao':
        template = `Atesto para os devidos fins que o(a) paciente acima identificado(a) encontra-se apto(a) para exercer atividades físicas e/ou laborais, não apresentando, no momento, restrições de saúde que o(a) impeçam.`;
        break;
      case 'acompanhante':
        template = `Atesto para os devidos fins que o(a) Sr(a). _________________ acompanhou o(a) paciente acima identificado(a) durante consulta médica realizada nesta data.`;
        break;
      default:
        template = '';
    }
    
    // Só atualiza se o campo estiver vazio ou se não estiver editando
    if (!this.editingCertificate && !this.certificateForm.get('conteudo')?.value) {
      this.certificateForm.patchValue({ conteudo: template });
    }
  }

  generatePdf(cert: MedicalCertificate) {
    this.isGeneratingPdf = true;
    
    this.certificateService.generatePdf(cert.id).subscribe({
      next: (response) => {
        // Converter base64 para blob
        const byteCharacters = atob(response.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.fileName || `atestado_${cert.tipo}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isGeneratingPdf = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao gerar PDF:', err);
        this.isGeneratingPdf = false;
        this.cdr.detectChanges();
        this.modalService.alert({ title: 'Erro', message: err.error?.message || 'Não foi possível gerar o PDF.', variant: 'danger' });
      }
    });
  }

  // === Download PDF Assinado ===

  downloadSignedPdf(cert: MedicalCertificate) {
    if (!cert.isSigned) return;
    this.digitalCertificateService.downloadSignedCertificatePdf(cert.id);
  }

  getTipoLabel(tipo: string): string {
    const found = this.tiposAtestado.find(t => t.value === tipo);
    return found ? found.label : tipo;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  // === Assinatura Digital ===

  openSignModal(cert: MedicalCertificate) {
    if (cert.isSigned) {
      this.modalService.alert({ 
        title: 'Aviso', 
        message: 'Este atestado já está assinado.', 
        variant: 'warning' 
      });
      return;
    }

    this.signingCertificateId = cert.id;
    this.showSignModal = true;
    this.cdr.detectChanges();
  }

  closeSignModal() {
    this.showSignModal = false;
    this.signingCertificateId = null;
  }

  onDocumentSigned(event: SignDocumentEvent) {
    if (event.success) {
      this.modalService.alert({ 
        title: 'Sucesso', 
        message: 'Atestado assinado com sucesso!', 
        variant: 'success' 
      });
      this.loadCertificates();
    }
    this.closeSignModal();
  }
}
