import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';

@Component({
  selector: 'app-phonocardiogram-tab',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './phonocardiogram-tab.html',
  styleUrls: ['./phonocardiogram-tab.scss']
})
export class PhonocardiogramTabComponent {
  @Input() appointmentId: string | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';
  @Input() readonly = false;

  isRecording = false;
  recordingDuration = 0;
  private recordingInterval: any;

  startRecording() {
    this.isRecording = true;
    this.recordingDuration = 0;
    this.recordingInterval = setInterval(() => {
      this.recordingDuration++;
    }, 1000);
  }

  stopRecording() {
    this.isRecording = false;
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
