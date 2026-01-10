import { Component, afterNextRender, inject, ChangeDetectorRef, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { SearchInputComponent } from '@app/shared/components/atoms/search-input/search-input';
import { FilterSelectComponent, FilterOption } from '@app/shared/components/atoms/filter-select/filter-select';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { 
  NotificationsService, 
  Notification, 
  NotificationType 
} from '@app/core/services/notifications.service';
import { AuthService } from '@app/core/services/auth.service';
import { RealTimeService, UserNotificationUpdate } from '@app/core/services/real-time.service';
import { Subscription } from 'rxjs';

type NotificationCategory = 'appointment' | 'schedule-block' | 'general';

@Component({
  selector: 'app-notifications',
  imports: [FormsModule, IconComponent, SearchInputComponent, FilterSelectComponent, ButtonComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class NotificationsComponent implements OnInit, OnDestroy {
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
  private realTimeService = inject(RealTimeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private realTimeSubscriptions: Subscription[] = [];
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    afterNextRender(() => {
      this.loadNotifications();
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.setupRealTimeSubscriptions();
    }
  }

  ngOnDestroy(): void {
    this.realTimeSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupRealTimeSubscriptions(): void {
    // Garantir conexão e então escutar novas notificações
    this.realTimeService.connect().then(() => {
      const newNotificationSub = this.realTimeService.newNotification$.subscribe(
        (notification: UserNotificationUpdate) => this.handleNewNotification(notification)
      );
      this.realTimeSubscriptions.push(newNotificationSub);
    }).catch(err => console.error('[Notifications] Erro ao conectar SignalR:', err));
  }

  private handleNewNotification(notification: UserNotificationUpdate): void {
    // Recarregar lista de notificações do servidor para obter IDs reais
    // Isso garante que podemos deletar/marcar como lida corretamente
    console.log('[Notifications] Nova notificação recebida via SignalR:', notification.title);
    this.loadNotifications();
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
    // Atualizar otimisticamente primeiro
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.updateUnreadCount();
      this.cdr.detectChanges();
    }
    
    this.notificationsService.markAsRead(notificationId).subscribe({
      next: () => {
        // Sucesso - já atualizamos localmente
      },
      error: (error: Error) => {
        console.error('Erro ao marcar notificação como lida:', error);
        // Se falhar, recarregar lista do servidor para sincronizar
        this.loadNotifications();
      }
    });
  }

  markAllAsRead(): void {
    // Atualizar otimisticamente primeiro
    this.notifications.forEach(n => n.isRead = true);
    this.updateUnreadCount();
    this.cdr.detectChanges();
    
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        // Sucesso - já atualizamos localmente
      },
      error: (error: Error) => {
        console.error('Erro ao marcar todas como lidas:', error);
        // Se falhar, recarregar lista do servidor
        this.loadNotifications();
      }
    });
  }

  deleteNotification(notificationId: string): void {
    // Remover otimisticamente da lista local primeiro
    const originalNotifications = [...this.notifications];
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateUnreadCount();
    this.cdr.detectChanges();
    
    this.notificationsService.deleteNotification(notificationId).subscribe({
      next: () => {
        // Sucesso - já removemos da lista
      },
      error: (error: Error) => {
        console.error('Erro ao excluir notificação:', error);
        // Se falhar, recarregar lista do servidor para sincronizar
        this.loadNotifications();
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

  // Métodos de navegação/redirecionamento
  getNotificationCategory(notification: Notification): NotificationCategory {
    const title = notification.title.toLowerCase();
    const message = notification.message.toLowerCase();

    // Notificações de agendamento/consulta
    if (
      title.includes('consulta') ||
      title.includes('agendada') ||
      title.includes('confirmada') ||
      title.includes('cancelada') ||
      message.includes('consulta')
    ) {
      return 'appointment';
    }

    // Notificações de bloqueio de agenda
    if (
      title.includes('bloqueio') ||
      title.includes('solicitação de bloqueio') ||
      message.includes('bloqueio')
    ) {
      return 'schedule-block';
    }

    return 'general';
  }

  getNotificationRoute(notification: Notification): string | null {
    const category = this.getNotificationCategory(notification);
    const user = this.authService.getCurrentUser();
    const role = user?.role;

    switch (category) {
      case 'appointment':
        return '/consultas';
      
      case 'schedule-block':
        if (role === 'ADMIN') {
          return '/solicitacoes-bloqueio';
        } else if (role === 'PROFESSIONAL') {
          return '/bloqueios-agenda';
        }
        return null;
      
      default:
        return null;
    }
  }

  hasRelatedPage(notification: Notification): boolean {
    return this.getNotificationRoute(notification) !== null;
  }

  getActionLabel(notification: Notification): string {
    const category = this.getNotificationCategory(notification);
    
    switch (category) {
      case 'appointment':
        return 'Ver Consultas';
      case 'schedule-block':
        return 'Ver Bloqueios';
      default:
        return 'Ver Detalhes';
    }
  }

  navigateToRelatedPage(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const route = this.getNotificationRoute(notification);
    
    if (route) {
      // Marcar como lida ao navegar
      if (!notification.isRead) {
        this.markAsRead(notification.id);
      }
      
      this.router.navigate([route]);
    }
  }

  onCardClick(notification: Notification): void {
    // Se tiver página relacionada, navegar
    if (this.hasRelatedPage(notification)) {
      this.navigateToRelatedPage(notification);
    } else {
      // Caso contrário, apenas marcar como lida
      if (!notification.isRead) {
        this.markAsRead(notification.id);
      }
    }
  }
}
