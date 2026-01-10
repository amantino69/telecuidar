import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { IconComponent, IconName } from '@app/shared/components/atoms/icon/icon';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-select',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './filter-select.html',
  styleUrl: './filter-select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterSelectComponent),
      multi: true
    }
  ]
})
export class FilterSelectComponent implements ControlValueAccessor {
  @Input() options: FilterOption[] = [];
  @Input() placeholder = 'Selecione...';
  @Input() icon?: IconName;
  @Input() iconSize = 18;
  @Output() change = new EventEmitter<string>();

  value = '';
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  onValueChange(value: string): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
    this.change.emit(value);
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  get selectedLabel(): string {
    const selected = this.options.find(opt => opt.value === this.value);
    return selected ? selected.label : this.placeholder;
  }
}
