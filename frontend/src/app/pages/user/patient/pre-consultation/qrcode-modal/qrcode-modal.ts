import { Component, EventEmitter, Input, Output, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qrcode-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent],
  templateUrl: './qrcode-modal.html',
  styleUrls: ['./qrcode-modal.scss']
})
export class QrCodeModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() uploadUrl = '';
  @Output() close = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  ngOnInit() {
    // Generate initially if open
    if (this.isOpen && this.uploadUrl) {
      setTimeout(() => this.generateQRCode(), 100);
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.uploadUrl) {
      setTimeout(() => this.generateQRCode(), 100);
    }
  }

  generateQRCode() {
    if (!this.qrCanvas || !this.uploadUrl) return;

    QRCode.toCanvas(this.qrCanvas.nativeElement, this.uploadUrl, { 
      width: 200,
      margin: 2
    }, (error: any) => {
      if (error) console.error('Error generating QR code', error);
    });
  }

  onClose() {
    this.close.emit();
  }

  onRegenerate() {
    this.regenerate.emit();
  }
}
