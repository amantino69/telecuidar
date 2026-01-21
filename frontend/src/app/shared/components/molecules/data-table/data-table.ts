import { Component, ContentChild, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
  field: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss'
})
export class DataTableComponent {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'Nenhum registro encontrado';
  @Input() trackByFn: (index: number, item: any) => any = (index, item) => item.id || index;

  @ContentChild('header', { read: TemplateRef }) headerTemplate?: TemplateRef<any>;
  @ContentChild('row', { read: TemplateRef }) rowTemplate?: TemplateRef<any>;
}
