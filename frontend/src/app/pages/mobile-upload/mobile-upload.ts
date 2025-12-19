import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { ThemeToggleComponent } from '@shared/components/atoms/theme-toggle/theme-toggle';
import { AttachmentsChatService, AttachmentMessage } from '@core/services/attachments-chat.service';
import { ModalService } from '@core/services/modal.service';

@Component({
  selector: 'app-mobile-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonComponent, ThemeToggleComponent],
  templateUrl: './mobile-upload.html',
  styleUrls: ['./mobile-upload.scss']
})
export class MobileUploadComponent implements OnInit {
  appointmentId: string | null = null;
  token: string | null = null;
  
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  selectedFile: File | null = null;
  attachmentTitle = '';
  isUploading = false;
  uploadSuccess = false;

  constructor(
    private route: ActivatedRoute,
    private chatService: AttachmentsChatService,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.appointmentId = params['appointmentId'];
      this.token = params['token'];
    });
  }

  triggerCamera() {
    this.cameraInput.nativeElement.click();
  }

  triggerGallery() {
    this.galleryInput.nativeElement.click();
  }

  triggerFiles() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.attachmentTitle = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      this.uploadSuccess = false;
    }
    // Reset inputs to allow selecting same file again if needed
    input.value = '';
  }

  cancelUpload() {
    this.selectedFile = null;
    this.attachmentTitle = '';
    this.uploadSuccess = false;
  }

  async sendAttachment() {
    if (!this.selectedFile) return;
    
    // Check if we have required params for either mode
    if (!this.appointmentId && !this.token) {
        this.modalService.alert({
          title: 'Erro',
          message: 'Sessão inválida.',
          variant: 'danger'
        }).subscribe();
        return;
    }
    
    this.isUploading = true;

    try {
      let base64: string | ArrayBuffer | null;
      
      // Compress image if it's an image
      if (this.selectedFile.type.startsWith('image/')) {
        base64 = await this.compressImage(this.selectedFile);
      } else {
        base64 = await this.fileToBase64(this.selectedFile);
      }
      
      if (this.appointmentId) {
          // Mode 1: Chat Upload (Direct to Service)
          const newMessage: AttachmentMessage = {
            id: crypto.randomUUID(),
            senderRole: 'PATIENT',
            senderName: 'Upload via Mobile',
            timestamp: new Date().toISOString(),
            title: this.attachmentTitle || this.selectedFile.name,
            fileName: this.selectedFile.name,
            fileType: this.selectedFile.type,
            fileSize: this.selectedFile.size,
            fileUrl: base64 as string
          };
    
          this.chatService.addMessage(this.appointmentId, newMessage);
      } else if (this.token) {
          // Mode 2: Pre-consultation Upload (LocalStorage Polling)
          const payload = {
            title: this.attachmentTitle || this.selectedFile.name,
            fileUrl: base64,
            type: this.selectedFile.type.startsWith('image/') ? 'image' : 'document',
            timestamp: new Date().getTime()
          };
    
          try {
            localStorage.setItem(`mobile_upload_${this.token}`, JSON.stringify(payload));
          } catch (e: any) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
              throw new Error('Arquivo muito grande para transferência via QR Code. Tente um arquivo menor.');
            }
            throw e;
          }
      }

      this.uploadSuccess = true;
      
      // Reset after success
      setTimeout(() => {
        this.cancelUpload();
      }, 3000);

    } catch (error: any) {
      console.error('Error processing file', error);
      this.modalService.alert({
        title: 'Erro',
        message: error.message || 'Erro ao processar arquivo.',
        variant: 'danger'
      }).subscribe();
    } finally {
      this.isUploading = false;
    }
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Resize to max 800px width
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  private fileToBase64(file: File): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
