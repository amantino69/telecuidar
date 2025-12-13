import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { ThemeToggleComponent } from '@shared/components/atoms/theme-toggle/theme-toggle';
import { AttachmentsChatService, AttachmentMessage } from '@core/services/attachments-chat.service';

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
    private chatService: AttachmentsChatService
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
        alert('Erro: Sessão inválida.');
        return;
    }
    
    this.isUploading = true;

    try {
      const base64 = await this.fileToBase64(this.selectedFile);
      
      if (this.appointmentId) {
          // Mode 1: Chat Upload (Direct to Service)
          const newMessage: AttachmentMessage = {
            id: crypto.randomUUID(),
            senderRole: 'patient',
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
    
          localStorage.setItem(`mobile_upload_${this.token}`, JSON.stringify(payload));
      }

      this.uploadSuccess = true;
      
      // Reset after success
      setTimeout(() => {
        this.cancelUpload();
      }, 3000);

    } catch (error) {
      console.error('Error processing file', error);
      alert('Erro ao processar arquivo.');
    } finally {
      this.isUploading = false;
    }
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
