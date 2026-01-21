import { Component, EventEmitter, Input, Output, OnInit, inject, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { Specialty } from '@app/core/services/specialties.service';
import { UsersService, User } from '@app/core/services/users.service';

@Component({
  selector: 'app-assign-specialty-modal',
  imports: [FormsModule, IconComponent, ButtonComponent],
  templateUrl: './assign-specialty-modal.html',
  styleUrl: './assign-specialty-modal.scss'
})
export class AssignSpecialtyModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() specialty: Specialty | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() assign = new EventEmitter<{ userId: string; specialtyId: string }>();

  professionals: User[] = [];
  selectedUserId = '';
  isLoading = false;

  private cdr = inject(ChangeDetectorRef);

  constructor(private usersService: UsersService) {
    afterNextRender(() => {
      this.loadProfessionals();
    });
  }

  ngOnInit(): void {
  }

  loadProfessionals(): void {
    this.isLoading = true;
    this.usersService.getUsers(
      { role: 'PROFESSIONAL', status: 'Active' },
      1,
      100
    ).subscribe({
      next: (response) => {
        this.professionals = response.data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onBackdropClick(): void {
    this.onCancel();
  }

  onCancel(): void {
    this.selectedUserId = '';
    this.close.emit();
  }

  onAssign(): void {
    if (this.selectedUserId && this.specialty) {
      this.assign.emit({
        userId: this.selectedUserId,
        specialtyId: this.specialty.id
      });
      this.selectedUserId = '';
    }
  }

  isFormValid(): boolean {
    return !!this.selectedUserId;
  }
}
