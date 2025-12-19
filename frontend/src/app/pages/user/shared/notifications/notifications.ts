import { Component, afterNextRender, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { SearchInputComponent } from '@app/shared/components/atoms/search-input/search-input';
import { FilterSelectComponent, FilterOption } from '@app/shared/components/atoms/filter-select/filter-select';
import { 
  NotificationsService, 
  Notification, 
  NotificationType 
} from '@app/core/services/notifications.service';

@Component({
  selector: 'app-notifications',
  imports: [FormsModule, IconComponent, SearchInputComponent, FilterSelectComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class NotificationsComponent {
  notifications: Notification[] = [];
  statusFilter: 'all' | boolean = 'all';
  typeFilter: 'all' | NotificationType = 'all';
  searchTerm = '';
  loading = false;
  unreadCount = 0;

  statusOptions: FilterOption[] = [
    { value: 'all', label: 'Todos os status' },
    { value: 'unread', label: 'Não lidas' },
    { value: 'read', label: 'Lidas' }
  ];

  typeOptions: FilterOption[] = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'info', label: 'Informação' },
    { value: 'warning', label: 'Avisos' },
    { value: 'error', label: 'Erros' },
    { value: 'success', label: 'Sucesso' }
  ];

  private notificationsService = inject(NotificationsService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    afterNextRender(() => {
      this.loadNotifications();
    });
  }

  get hasUnreadNotifications(): boolean {
    return this.unreadCount > 0;
  }

  setStatusFilter(status: 'all' | boolean): void {
    this.statusFilter = status;
    this.loadNotifications();
  }

  setTypeFilter(type: 'all' | NotificationType): void {
    this.typeFilter = type;
    this.loadNotifications();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.loadNotifications();
  }

  onFilterChange(): void {
    this.loadNotifications();
  }

  markAsRead(notificationId: string): void {
    this.notificationsService.markAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.isRead = true;
          this.updateUnreadCount();
        }
      },
      error: (error: Error) => {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    });
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.updateUnreadCount();
      },
      error: (error: Error) => {
        console.error('Erro ao marcar todas como lidas:', error);
      }
    });
  }

  deleteNotification(notificationId: string): void {
    this.notificationsService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.updateUnreadCount();
      },
      error: (error: Error) => {
        console.error('Erro ao excluir notificação:', error);
      }
    });
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private loadNotifications(): void {
    this.loading = true;
    const filter: any = {};
    if (this.statusFilter !== 'all') {
      filter.isRead = this.statusFilter === false ? false : true;
    }
    if (this.typeFilter !== 'all') {
      filter.type = this.typeFilter;
    }
    
    this.notificationsService.getNotifications(filter).subscribe({
      next: (response) => {
        this.notifications = response.data;
        this.updateUnreadCount();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: Error) => {
        console.error('Erro ao carregar notificações:', error);
        this.loading = false;
      }
    });
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }
}
