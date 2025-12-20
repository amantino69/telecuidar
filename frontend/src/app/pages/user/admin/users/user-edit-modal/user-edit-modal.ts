import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { AvatarComponent } from '@app/shared/components/atoms/avatar/avatar';
import { CpfMaskDirective } from '@app/core/directives/cpf-mask.directive';
import { PhoneMaskDirective } from '@app/core/directives/phone-mask.directive';
import { EmailValidatorDirective } from '@app/core/directives/email-validator.directive';
import { User, UserRole, UserStatus } from '@app/core/services/users.service';
import { SpecialtiesService, Specialty } from '@app/core/services/specialties.service';

@Component({
  selector: 'app-user-edit-modal',
  imports: [FormsModule, IconComponent, ButtonComponent, AvatarComponent, CpfMaskDirective, PhoneMaskDirective, EmailValidatorDirective],
  templateUrl: './user-edit-modal.html',
  styleUrl: './user-edit-modal.scss'
})
export class UserEditModalComponent implements OnChanges, OnInit {
  @Input() user: User | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<User>();

  editedUser: Partial<User> = {};
  specialties: Specialty[] = [];
  private cdr = inject(ChangeDetectorRef);

  constructor(private specialtiesService: SpecialtiesService) {
    afterNextRender(() => {
      this.loadSpecialties();
    });
  }

  ngOnInit(): void {}

  loadSpecialties(): void {
    this.specialtiesService.getSpecialties({ status: 'Active' }, { field: 'name', direction: 'asc' }, 1, 100).subscribe({
      next: (response) => {
        this.specialties = response.data;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.editedUser = { ...this.user };
      // Detectar mudanças após atualizar dados para evitar NG0100
      setTimeout(() => this.cdr.detectChanges(), 0);
    }
  }

  onBackdropClick(): void {
    this.onCancel();
  }

  onCancel(): void {
    this.close.emit();
  }

  onSpecialtyChange(specialtyId: string): void {
    if (!this.editedUser.professionalProfile) {
      this.editedUser.professionalProfile = {};
    }
    this.editedUser.professionalProfile.specialtyId = specialtyId || undefined;
  }

  onSave(): void {
    if (this.editedUser && this.isFormValid()) {
      this.save.emit(this.editedUser as User);
    }
  }

  isFormValid(): boolean {
    return !!(
      this.editedUser.name?.trim() &&
      this.editedUser.email?.trim() &&
      this.editedUser.cpf?.trim() &&
      this.editedUser.phone?.trim() &&
      this.editedUser.role &&
      this.editedUser.status
    );
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      PATIENT: 'Paciente',
      PROFESSIONAL: 'Profissional',
      ADMIN: 'Administrador'
    };
    return labels[role];
  }

  getStatusLabel(status: UserStatus): string {
    const labels: Record<UserStatus, string> = {
      Active: 'Ativo',
      Inactive: 'Inativo'
    };
    return labels[status];
  }
}
