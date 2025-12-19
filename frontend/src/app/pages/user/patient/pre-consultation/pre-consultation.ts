import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { QrCodeModalComponent } from './qrcode-modal/qrcode-modal';
import { MediaPreviewModalComponent } from '@shared/components/molecules/media-preview-modal/media-preview-modal';
import { AppointmentsService, Appointment } from '@core/services/appointments.service';
import { ModalService } from '@core/services/modal.service';

interface Attachment {
  title: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'document';
}

@Component({
  selector: 'app-pre-consultation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    IconComponent,
    QrCodeModalComponent,
    MediaPreviewModalComponent
  ],
  templateUrl: './pre-consultation.html',
  styleUrls: ['./pre-consultation.scss']
})
export class PreConsultationComponent implements OnInit, OnDestroy {
  appointmentId: string | null = null;
  appointment: Appointment | null = null;
  form: FormGroup;
  isSubmitting = false;

  // Attachments State
  attachments: Attachment[] = [];
  isAddingAttachment = false;
  newAttachmentTitle = '';
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;

  // Mobile Upload
  isQrCodeModalOpen = false;
  mobileUploadUrl = '';
  mobileUploadToken = '';
  isMobile = false;
  private pollingInterval: any;

  // Media Preview
  isPreviewModalOpen = false;
  previewUrl = '';
  previewTitle = '';
  previewType: 'image' | 'file' = 'image';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private appointmentsService: AppointmentsService,
    private modalService: ModalService,
    private zone: NgZone
  ) {
    this.checkIfMobile();
    this.form = this.fb.group({
      personalInfo: this.fb.group({
        fullName: [''],
        birthDate: [''],
        weight: [''],
        height: ['']
      }),
      medicalHistory: this.fb.group({
        chronicConditions: [''],
        medications: [''],
        allergies: [''],
        surgeries: [''],
        generalObservations: ['']
      }),
      lifestyleHabits: this.fb.group({
        smoker: [''],
        alcoholConsumption: [''],
        physicalActivity: [''],
        generalObservations: ['']
      }),
      vitalSigns: this.fb.group({
        bloodPressure: [''],
        heartRate: [''],
        temperature: [''],
        oxygenSaturation: [''],
        generalObservations: ['']
      }),
      currentSymptoms: this.fb.group({
        mainSymptoms: [''],
        symptomOnset: [''],
        painIntensity: [''],
        generalObservations: ['']
      }),
      additionalObservations: ['']
    });
  }

  checkIfMobile() {
    if (typeof navigator !== 'undefined') {
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.appointmentId = params['id'];
      if (this.appointmentId) {
        this.loadAppointment(this.appointmentId);
      }
    });
  }

  loadAppointment(id: string) {
    this.appointmentsService.getAppointmentById(id).subscribe({
      next: (appt) => {
        if (appt) {
          this.appointment = appt;
          
          // Pre-fill if data exists
          if (appt.preConsultationJson) {
            try {
              const preConsultationData = JSON.parse(appt.preConsultationJson);
              this.form.patchValue(preConsultationData);
              
              // Load existing attachments if any
              if (preConsultationData.attachments && Array.isArray(preConsultationData.attachments)) {
                this.attachments = preConsultationData.attachments.map((att: any) => ({
                  title: att.title,
                  file: new File([], att.title),
                  previewUrl: att.fileUrl,
                  type: att.type
                }));
              }
            } catch (error) {
              console.error('Erro ao carregar dados da pré-consulta:', error);
            }
          } else {
            // Auto-fill patient name if available
            this.form.get('personalInfo.fullName')?.setValue(appt.patientName);
          }
        } else {
          this.router.navigate(['/consultas']);
        }
      },
      error: () => this.router.navigate(['/consultas'])
    });
  }

  // Attachment Methods
  startAddingAttachment() {
    this.isAddingAttachment = true;
    this.newAttachmentTitle = '';
    this.selectedFile = null;
    this.selectedFilePreview = null;
  }

  cancelAddingAttachment() {
    this.isAddingAttachment = false;
    this.newAttachmentTitle = '';
    this.selectedFile = null;
    this.selectedFilePreview = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onFileSelectedDirectly(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.newAttachmentTitle = file.name.replace(/\.[^/.]+$/, ""); // Default title from filename
      
      // Create preview and save immediately (simplified flow for mobile)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedFilePreview = e.target.result;
          this.saveAttachment(); // Auto-save for streamlined mobile UX
        };
        reader.readAsDataURL(file);
      } else {
        this.selectedFilePreview = 'assets/icons/file-placeholder.svg';
        this.saveAttachment();
      }
    }
    // Reset input
    event.target.value = '';
  }

  private handleFile(file: File) {
    this.selectedFile = file;
    
    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFilePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // For non-image files, use a placeholder or handle accordingly
      // Since the UI expects a previewUrl for the list, we might need a placeholder icon
      // But for the 'add attachment' preview, it shows an <img> tag.
      // We'll use a placeholder image or generic icon data URL
      this.selectedFilePreview = 'assets/icons/file-placeholder.svg'; // Or a base64 string of a file icon
    }
  }

  saveAttachment() {
    if (this.newAttachmentTitle && this.selectedFile) {
      this.attachments.push({
        title: this.newAttachmentTitle,
        file: this.selectedFile,
        previewUrl: this.selectedFilePreview || '',
        type: this.selectedFile.type.startsWith('image/') ? 'image' : 'document'
      });
      this.cancelAddingAttachment();
    }
  }

  // Mobile Upload Methods
  openMobileUpload() {
    this.mobileUploadToken = Math.random().toString(36).substring(7); // Generate new token
    this.mobileUploadUrl = `${window.location.origin}/mobile-upload?token=${this.mobileUploadToken}`;
    this.isQrCodeModalOpen = true;
    this.startPolling();
  }

  regenerateQrCode() {
    this.stopPolling(); // Stop previous poll
    this.mobileUploadToken = Math.random().toString(36).substring(7);
    this.mobileUploadUrl = `${window.location.origin}/mobile-upload?token=${this.mobileUploadToken}`;
    this.startPolling(); // Start new poll
  }

  closeQrCodeModal() {
    this.isQrCodeModalOpen = false;
    this.stopPolling();
  }

  startPolling() {
    // Poll every 1 second
    this.pollingInterval = setInterval(() => {
      this.checkMobileUpload();
    }, 1000);
    
    // Also listen for storage events for instant updates
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageListener);
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  private storageListener = (event: StorageEvent) => {
    if (event.key === `mobile_upload_${this.mobileUploadToken}` && event.newValue) {
      this.zone.run(() => {
        this.checkMobileUpload();
      });
    }
  };

  checkMobileUpload() {
    const key = `mobile_upload_${this.mobileUploadToken}`;
    const data = localStorage.getItem(key);

    if (data) {
      try {
        const payload = JSON.parse(data);
        
        // Add to attachments
        this.attachments.push({
          title: payload.title,
          file: new File([], payload.title), // Dummy file object since we only have base64
          previewUrl: payload.fileUrl,
          type: payload.type
        });

        // Clean up
        localStorage.removeItem(key);
        this.closeQrCodeModal();

        // Notify user
        this.modalService.alert({
          title: 'Upload Recebido',
          message: `Arquivo "${payload.title}" adicionado com sucesso!`,
          variant: 'success'
        });

      } catch (e) {
        console.error('Error parsing mobile upload data', e);
      }
    }
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  openPreview(attachment: Attachment) {
    this.previewUrl = attachment.previewUrl;
    this.previewTitle = attachment.title;
    // Assuming type logic - if it has image in type string or starts with image
    this.previewType = attachment.type === 'image' ? 'image' : 'file';
    this.isPreviewModalOpen = true;
  }

  closePreview() {
    this.isPreviewModalOpen = false;
    this.previewUrl = '';
    this.previewTitle = '';
  }

  downloadAttachment() {
    // Basic download implementation
    const link = document.createElement('a');
    link.href = this.previewUrl;
    link.download = this.previewTitle;
    link.click();
  }

  onSubmit() {
    if (this.appointmentId) {
      this.isSubmitting = true;
      
      const formData = this.form.value;
      
      // Add attachments to form data
      formData.attachments = this.attachments.map(att => ({
        title: att.title,
        fileUrl: att.previewUrl,
        type: att.type
      }));

      // Criar o DTO correto para update
      const updateDto = {
        preConsultationJson: JSON.stringify(formData)
      };

      this.appointmentsService.updateAppointment(this.appointmentId, updateDto).subscribe({
        next: (appointment) => {
          this.isSubmitting = false;
          this.modalService.alert({
            title: 'Sucesso',
            message: 'Pré-consulta salva com sucesso!',
            variant: 'success'
          }).subscribe(() => {
            this.router.navigate(['/consultas']);
          });
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Erro ao salvar pré-consulta:', error);
          this.modalService.alert({
            title: 'Erro',
            message: 'Erro ao salvar pré-consulta. Tente novamente.',
            variant: 'danger'
          }).subscribe();
        }
      });
    }
  }

  onCancel() {
    this.router.navigate(['/consultas']);
  }
}
