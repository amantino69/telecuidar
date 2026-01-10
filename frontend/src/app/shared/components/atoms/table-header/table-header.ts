import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';

export type SortDirection = 'asc' | 'desc' | null;

@Component({
  selector: 'app-table-header',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './table-header.html',
  styleUrl: './table-header.scss'
})
export class TableHeaderComponent {
  @Input() label!: string;
  @Input() field?: string;
  @Input() sortable = false;
  @Input() currentSortField?: string;
  @Input() currentSortDirection?: 'asc' | 'desc';
  @Input() align: 'left' | 'center' | 'right' = 'left';
  @Input() width?: string;
  
  @Output() sort = new EventEmitter<string>();

  get isActive(): boolean {
    return this.sortable && this.field === this.currentSortField;
  }

  get sortIcon(): 'arrow-right' | 'arrow-left' | 'chevrons-up-down' {
    if (!this.isActive) return 'chevrons-up-down';
    return this.currentSortDirection === 'asc' ? 'arrow-right' : 'arrow-left';
  }

  onHeaderClick(): void {
    if (this.sortable && this.field) {
      this.sort.emit(this.field);
    }
  }
}
