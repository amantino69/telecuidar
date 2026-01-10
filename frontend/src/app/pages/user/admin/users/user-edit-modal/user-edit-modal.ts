import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { AvatarComponent } from '@app/shared/components/atoms/avatar/avatar';
import { CpfMaskDirective } from '@app/core/directives/cpf-mask.directive';
import { PhoneMaskDirective } from '@app/core/directives/phone-mask.directive';
import { User, UserRole, UserStatus } from '@app/core/services/users.service';
import { AuthService } from '@app/core/services/auth.service';
import { SpecialtiesService, Specialty } from '@app/core/services/specialties.service';
import { CustomValidators } from '@app/core/validators/custom-validators';
import { AUTH_CONSTANTS } from '@app/core/constants/auth.constants';

@Component({
  selector: 'app-user-edit-modal',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconComponent, ButtonComponent, AvatarComponent, CpfMaskDirective, PhoneMaskDirective],
  templateUrl: './user-edit-modal.html',
  styleUrl: './user-edit-modal.scss'
})
export class UserEditModalComponent implements OnChanges, OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @Input() user: User | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<User>();

  editedUser: Partial<User> = {};
  userForm!: FormGroup;
  specialties: Specialty[] = [];

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
      this.initializeForm();
      // Detectar mudanças após atualizar dados para evitar NG0100
      setTimeout(() => this.cdr.detectChanges(), 0);
    }
  }

  private initializeForm(): void {
    const originalUserId = this.user?.id;
    
    this.userForm = this.fb.group({
      name: [
        this.editedUser.name || '',
        [
          Validators.required,
          Validators.pattern(AUTH_CONSTANTS.VALIDATION_PATTERNS.NAME),
          Validators.minLength(AUTH_CONSTANTS.FIELD_LENGTHS.NAME.min),
          Validators.maxLength(AUTH_CONSTANTS.FIELD_LENGTHS.NAME.max)
        ]
      ],
      lastName: [
        this.editedUser.lastName || '',
        [
          Validators.required,
          Validators.pattern(AUTH_CONSTANTS.VALIDATION_PATTERNS.NAME),
          Validators.minLength(AUTH_CONSTANTS.FIELD_LENGTHS.NAME.min),
          Validators.maxLength(AUTH_CONSTANTS.FIELD_LENGTHS.NAME.max)
        ]
      ],
      email: [
        this.editedUser.email || '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(AUTH_CONSTANTS.VALIDATION_PATTERNS.EMAIL)
        ],
        [this.emailAvailabilityValidator(originalUserId)]
      ],
      cpf: [
        this.editedUser.cpf || '',
        [Validators.required, CustomValidators.cpf()],
        [this.cpfAvailabilityValidator(originalUserId)]
      ],
      phone: [
        this.editedUser.phone || '',
        [Validators.required, CustomValidators.phone()],
        [this.phoneAvailabilityValidator(originalUserId)]
      ],
      role: [this.editedUser.role || 'PATIENT', [Validators.required]],
      status: [this.editedUser.status || 'Active', [Validators.required]],
      specialtyId: [this.editedUser.professionalProfile?.specialtyId || '']
    });

    // Observar mudanças no role para mostrar/ocultar especialidade
    this.userForm.get('role')?.valueChanges.subscribe(role => {
      if (this.editedUser) {
        this.editedUser.role = role;
      }
    });
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
    if (!this.userForm) return;

    // Marca todos os campos como touched para exibir erros
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });

    if (this.userForm.valid && this.editedUser) {
      const formValue = this.userForm.value;
      const updatedUser = {
        ...this.editedUser,
        name: formValue.name,
        lastName: formValue.lastName,
        email: formValue.email,
        cpf: formValue.cpf,
        phone: formValue.phone,
        role: formValue.role,
        status: formValue.status
      };
      
      // Atualizar specialtyId se for profissional
      if (formValue.role === 'PROFESSIONAL' && formValue.specialtyId) {
        if (!updatedUser.professionalProfile) {
          updatedUser.professionalProfile = {};
        }
        updatedUser.professionalProfile.specialtyId = formValue.specialtyId;
      }
      
      this.save.emit(updatedUser as User);
    }
  }

  isFormValid(): boolean {
    return this.userForm?.valid || false;
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      PATIENT: 'Paciente',
      PROFESSIONAL: 'Profissional',
      ADMIN: 'Administrador',
      ASSISTANT: 'Assistente'
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

  getErrorMessage(fieldName: string): string {
    const control = this.userForm?.get(fieldName);
    
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return AUTH_CONSTANTS.VALIDATION_MESSAGES.REQUIRED;
    }

    if (fieldName === 'email') {
      if (control.errors['email'] || control.errors['pattern']) {
        return AUTH_CONSTANTS.VALIDATION_MESSAGES.EMAIL;
      }
      if (control.errors['emailTaken']) {
        return 'Este e-mail já está em uso';
      }
    }

    if (fieldName === 'name' || fieldName === 'lastName') {
      if (control.errors['pattern']) {
        return AUTH_CONSTANTS.VALIDATION_MESSAGES.NAME;
      }
      if (control.errors['minlength']) {
        return AUTH_CONSTANTS.VALIDATION_MESSAGES.NAME_MIN_LENGTH;
      }
    }

    if (fieldName === 'cpf') {
      if (control.errors['invalidCpf']) {
        return AUTH_CONSTANTS.VALIDATION_MESSAGES.CPF;
      }
      if (control.errors['cpfTaken']) {
        return 'Este CPF já está cadastrado';
      }
    }

    if (fieldName === 'phone') {
      if (control.errors['invalidPhone']) {
        return AUTH_CONSTANTS.VALIDATION_MESSAGES.PHONE;
      }
      if (control.errors['phoneTaken']) {
        return 'Este telefone já está cadastrado';
      }
    }

    return '';
  }

  private emailAvailabilityValidator(excludeUserId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      // Não validar se for o mesmo email do usuário atual
      if (excludeUserId && this.user?.email === control.value) {
        return of(null);
      }

      return timer(500).pipe(
        switchMap(() => this.authService.checkEmailAvailability(control.value)),
        map(result => result.available ? null : { emailTaken: true }),
        catchError(() => of(null))
      );
    };
  }

  private cpfAvailabilityValidator(excludeUserId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      // Não validar se for o mesmo CPF do usuário atual
      if (excludeUserId && this.user?.cpf === control.value) {
        return of(null);
      }

      return timer(500).pipe(
        switchMap(() => this.authService.checkCpfAvailability(control.value)),
        map(result => result.available ? null : { cpfTaken: true }),
        catchError(() => of(null))
      );
    };
  }

  private phoneAvailabilityValidator(excludeUserId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      // Não validar se for o mesmo telefone do usuário atual
      if (excludeUserId && this.user?.phone === control.value) {
        return of(null);
      }

      return timer(500).pipe(
        switchMap(() => this.authService.checkPhoneAvailability(control.value)),
        map(result => result.available ? null : { phoneTaken: true }),
        catchError(() => of(null))
      );
    };
  }
}
