import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { QrCodeModalComponent } from './qrcode-modal/qrcode-modal';
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
    QrCodeModalComponent
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private appointmentsService: AppointmentsService,
    private modalService: ModalService
  ) {
    this.checkIfMobile();
    this.form = this.fb.group({
      personalInfo: this.fb.group({
        fullName: ['', Validators.required],
        birthDate: ['', Validators.required],
        weight: ['', Validators.required],
        height: ['', Validators.required]
      }),
      medicalHistory: this.fb.group({
        chronicConditions: [''],
        medications: [''],
        allergies: [''],
        surgeries: [''],
        generalObservations: ['']
      }),
      lifestyleHabits: this.fb.group({
        smoker: ['', Validators.required],
        alcoholConsumption: ['', Validators.required],
        physicalActivity: ['', Validators.required],
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
        mainSymptoms: ['', Validators.required],
        symptomOnset: ['', Validators.required],
        painIntensity: [''],
        generalObservations: ['']
      }),
      additionalObservations: ['']
    });
  }

  checkIfMobile() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
          if (appt.preConsultation) {
            this.form.patchValue(appt.preConsultation);
            // Load existing attachments if any (mock logic would need to handle this differently in real app)
            if (appt.preConsultation.attachments) {
                // In a real scenario, we would map these back. For now, we skip or mock.
            }
          } else {
             // Auto-fill patient name if available (mock logic)
             this.form.get('personalInfo.fullName')?.setValue(appt.patientName);
          }
        } else {
          this.router.navigate(['/patient/appointments']);
        }
      },
      error: () => this.router.navigate(['/patient/appointments'])
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
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

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

  onSubmit() {
    if (this.form.valid && this.appointmentId) {
      this.isSubmitting = true;
      
      const formData = this.form.value;
      
      // Add attachments to form data
      formData.attachments = this.attachments.map(att => ({
        title: att.title,
        fileUrl: att.previewUrl, // Sending base64 for mock purposes
        type: att.type
      }));

      this.appointmentsService.savePreConsultation(this.appointmentId, formData).subscribe({
        next: (success) => {
          this.isSubmitting = false;
          if (success) {
            this.modalService.alert({
              title: 'Sucesso',
              message: 'Pré-consulta enviada com sucesso!',
              variant: 'success'
            }).subscribe(() => {
              this.router.navigate(['/patient/appointments']);
            });
          }
        },
        error: () => {
          this.isSubmitting = false;
          this.modalService.alert({
            title: 'Erro',
            message: 'Erro ao enviar pré-consulta. Tente novamente.',
            variant: 'danger'
          });
        }
      });
    } else {
      this.form.markAllAsTouched();
      // Scroll to top or first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onCancel() {
    this.router.navigate(['/patient/appointments']);
  }
}
