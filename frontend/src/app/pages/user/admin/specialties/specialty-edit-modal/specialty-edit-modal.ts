import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { Specialty, SpecialtyStatus, CustomField } from '@app/core/services/specialties.service';

@Component({
  selector: 'app-specialty-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonComponent],
  templateUrl: './specialty-edit-modal.html',
  styleUrl: './specialty-edit-modal.scss'
})
export class SpecialtyEditModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() specialty: Specialty | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() update = new EventEmitter<Partial<Specialty>>();

  specialtyData = {
    name: '',
    description: '',
    status: 'active' as SpecialtyStatus,
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['specialty'] && this.specialty) {
      this.specialtyData = {
        name: this.specialty.name,
        description: this.specialty.description,
        status: this.specialty.status,
        customFields: this.specialty.customFields 
          ? this.specialty.customFields.map(f => ({
              ...f, 
              options: f.options ? [...f.options] : []
            })) 
          : []
      };
    }
  }

  onBackdropClick(): void {
    this.onCancel();
  }

  onCancel(): void {
    this.close.emit();
  }

  onUpdate(): void {
    if (this.isFormValid()) {
      this.update.emit({ ...this.specialtyData });
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
}
