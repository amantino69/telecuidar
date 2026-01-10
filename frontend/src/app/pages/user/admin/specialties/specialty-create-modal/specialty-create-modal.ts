import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { SpecialtyStatus, CustomField } from '@app/core/services/specialties.service';

@Component({
  selector: 'app-specialty-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonComponent],
  templateUrl: './specialty-create-modal.html',
  styleUrl: './specialty-create-modal.scss'
})
export class SpecialtyCreateModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<{ name: string; description: string; status: SpecialtyStatus; customFields: CustomField[] }>();

  specialtyData = {
    name: '',
    description: '',
    status: 'Active' as SpecialtyStatus,
    customFields: [] as CustomField[]
  };

  fieldTypes = [
    { value: 'text', label: 'Texto Simples' },
    { value: 'textarea', label: 'Texto Longo' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
    { value: 'select', label: 'Lista Suspensa (Select)' },
    { value: 'checkbox', label: 'Caixa de Seleção (Checkbox)' },
    { value: 'radio', label: 'Múltipla Escolha (Radio)' }
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
      this.create.emit({ ...this.specialtyData });
      this.resetModal();
    }
  }

  isFormValid(): boolean {
    return !!(
      this.specialtyData.name?.trim() &&
      this.specialtyData.description?.trim()
    );
  }

  addCustomField(): void {
    this.specialtyData.customFields.push({
      name: '',
      type: 'text',
      required: false,
      description: '',
      defaultValue: '',
      order: this.specialtyData.customFields.length + 1,
      options: []
    });
  }

  removeCustomField(index: number): void {
    this.specialtyData.customFields.splice(index, 1);
  }

  addOption(fieldIndex: number, optionInput: HTMLInputElement): void {
    const value = optionInput.value.trim();
    if (value) {
      if (!this.specialtyData.customFields[fieldIndex].options) {
        this.specialtyData.customFields[fieldIndex].options = [];
      }
      this.specialtyData.customFields[fieldIndex].options?.push(value);
      optionInput.value = '';
    }
  }

  removeOption(fieldIndex: number, optionIndex: number): void {
    this.specialtyData.customFields[fieldIndex].options?.splice(optionIndex, 1);
  }

  private resetModal(): void {
    this.specialtyData = {
      name: '',
      description: '',
      status: 'Active',
      customFields: []
    };
  }
}
