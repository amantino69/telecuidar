import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { UserRole } from '@app/core/services/invites.service';

@Component({
  selector: 'app-invite-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonComponent],
  templateUrl: './invite-create-modal.html',
  styleUrl: './invite-create-modal.scss'
})
export class InviteCreateModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{ email: string; role: UserRole }>();

  inviteData = {
    email: '',
    role: 'patient' as UserRole
  };

  roleOptions = [
    { value: 'patient', label: 'Paciente' },
    { value: 'professional', label: 'Profissional' },
    { value: 'admin', label: 'Administrador' }
  ];

  onBackdropClick(): void {
    this.onCancel();
  }

  onCancel(): void {
    this.resetModal();
    this.close.emit();
  }

  onCreate(): void {
    if (this.isFormValid()) {
      this.create.emit({ ...this.inviteData });
      this.resetModal();
    }
  }

  isFormValid(): boolean {
    return !!(
      this.inviteData.email?.trim() &&
      this.isValidEmail(this.inviteData.email)
    );
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private resetModal(): void {
    this.inviteData = {
      email: '',
      role: 'patient'
    };
  }
}
