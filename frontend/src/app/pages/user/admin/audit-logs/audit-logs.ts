import { Component, afterNextRender, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { PaginationComponent } from '@app/shared/components/atoms/pagination/pagination';
import { SearchInputComponent } from '@app/shared/components/atoms/search-input/search-input';
import { FilterSelectComponent, FilterOption } from '@app/shared/components/atoms/filter-select/filter-select';
import { TableHeaderComponent } from '@app/shared/components/atoms/table-header/table-header';
import { AuditLogsService, AuditLog, AuditLogsFilter, AuditLogsSortOptions, AuditActionType } from '@app/core/services/audit-logs.service';
import { AuditActionPipe } from '@app/core/pipes/audit-action.pipe';

@Component({
  selector: 'app-audit-logs',
  imports: [FormsModule, IconComponent, ButtonComponent, DatePipe, AuditActionPipe, NgClass, PaginationComponent, SearchInputComponent, FilterSelectComponent, TableHeaderComponent],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.scss'
})
export class AuditLogsComponent {
  logs: AuditLog[] = [];
  isLoading = false;
  selectedLog: AuditLog | null = null;

  // Filtros
  searchTerm = '';
  selectedAction: AuditActionType | 'all' = 'all';
  selectedEntityType: string | 'all' = 'all';
  startDate = '';
  endDate = '';

  // Paginação
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalItems = 0;

  // Ordenação
  sortField: keyof AuditLog = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Dropdowns
  isActionDropdownOpen = false;
  isEntityTypeDropdownOpen = false;

  // Opções
  actionOptions: FilterOption[] = [
    { value: 'all', label: 'Todas as Ações' },
    { value: 'create', label: 'Criar' },
    { value: 'update', label: 'Atualizar' },
    { value: 'delete', label: 'Excluir' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'view', label: 'Visualizar' },
    { value: 'export', label: 'Exportar' }
  ];

  entityTypeOptions: FilterOption[] = [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'User', label: 'Usuário' },
    { value: 'Specialty', label: 'Especialidade' },
    { value: 'Appointment', label: 'Consulta' },
    { value: 'Schedule', label: 'Agenda' },
    { value: 'Notification', label: 'Notificação' },
    { value: 'Attachment', label: 'Anexo' },
    { value: 'Invite', label: 'Convite' }
  ];

  private auditLogsService = inject(AuditLogsService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    afterNextRender(() => {
      this.loadLogs();
    });
  }

  onSearch(value?: string): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;

    const filter: AuditLogsFilter = {
      search: this.searchTerm || undefined,
      action: this.selectedAction,
      entityType: this.selectedEntityType,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined
    };

    const sort: AuditLogsSortOptions = {
      field: this.sortField,
      direction: this.sortDirection
    };

    this.auditLogsService.getAuditLogs(filter, sort, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.logs = response.data;
          this.totalPages = response.totalPages;
          this.totalItems = response.total;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  onSort(field: string): void {
    const typedField = field as keyof AuditLog;
    if (this.sortField === typedField) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = typedField;
      this.sortDirection = 'asc';
    }
    this.loadLogs();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadLogs();
  }

  onExportPDF(): void {
    this.isLoading = true;

    const filter: AuditLogsFilter = {
      search: this.searchTerm || undefined,
      action: this.selectedAction,
      entityType: this.selectedEntityType,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined
    };

    this.auditLogsService.exportToPDF(filter).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedAction = 'all';
    this.selectedEntityType = 'all';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadLogs();
  }

  getSortIcon(field: keyof AuditLog): 'chevrons-up-down' | 'chevron-up' | 'chevron-down' {
    if (this.sortField !== field) return 'chevrons-up-down';
    return this.sortDirection === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  getActionClass(action: string): string {
    const classes: Record<string, string> = {
      'create': 'action-badge--create',
      'update': 'action-badge--update',
      'delete': 'action-badge--delete',
      'login': 'action-badge--login',
      'logout': 'action-badge--logout',
      'view': 'action-badge--view',
      'export': 'action-badge--export'
    };
    return classes[action] || '';
  }

  viewDetails(log: AuditLog): void {
    this.selectedLog = log;
  }

  closeDetails(): void {
    this.selectedLog = null;
  }

  formatJson(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  }
}
