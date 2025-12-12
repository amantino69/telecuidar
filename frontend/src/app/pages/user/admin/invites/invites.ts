import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { BadgeComponent } from '@app/shared/components/atoms/badge/badge';
import { PaginationComponent } from '@app/shared/components/atoms/pagination/pagination';
import { SearchInputComponent } from '@app/shared/components/atoms/search-input/search-input';
import { FilterSelectComponent, FilterOption } from '@app/shared/components/atoms/filter-select/filter-select';
import { TableHeaderComponent } from '@app/shared/components/atoms/table-header/table-header';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { InvitesService, Invite, InvitesFilter, InvitesSortOptions, InviteStatus, UserRole } from '@app/core/services/invites.service';
import { ModalService } from '@app/core/services/modal.service';
import { BadgeVariant } from '@app/shared/components/atoms/badge/badge';
import { InviteCreateModalComponent } from './invite-create-modal/invite-create-modal';

@Component({
  selector: 'app-invites',
  imports: [
    FormsModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    PaginationComponent,
    SearchInputComponent,
    FilterSelectComponent,
    TableHeaderComponent,
    ButtonComponent,
    InviteCreateModalComponent
  ],
  templateUrl: './invites.html',
  styleUrl: './invites.scss'
})
export class InvitesComponent implements OnInit {
  invites: Invite[] = [];
  isLoading = false;
  isCreateModalOpen = false;

  // Filtros
  searchTerm = '';
  roleFilter: UserRole | 'all' = 'all';
  statusFilter: InviteStatus | 'all' = 'all';

  roleOptions: FilterOption[] = [
    { value: 'all', label: 'Todos os perfis' },
    { value: 'patient', label: 'Pacientes' },
    { value: 'professional', label: 'Profissionais' },
    { value: 'admin', label: 'Administradores' }
  ];

  statusOptions: FilterOption[] = [
    { value: 'all', label: 'Todos os status' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'accepted', label: 'Aceitos' },
    { value: 'expired', label: 'Expirados' },
    { value: 'cancelled', label: 'Cancelados' }
  ];

  // Ordenação
  sortField: keyof Invite = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Paginação
  currentPage = 1;
  pageSize = 10;
  totalInvites = 0;
  totalPages = 0;

  constructor(
    private invitesService: InvitesService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.loadInvites();
  }

  loadInvites(): void {
    this.isLoading = true;

    const filter: InvitesFilter = {
      search: this.searchTerm || undefined,
      role: this.roleFilter,
      status: this.statusFilter
    };

    const sort: InvitesSortOptions = {
      field: this.sortField,
      direction: this.sortDirection
    };

    this.invitesService.getInvites(filter, sort, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.invites = response.data;
          this.totalInvites = response.total;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  onSearch(value: string): void {
    this.currentPage = 1;
    this.loadInvites();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadInvites();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadInvites();
  }

  sort(field: string): void {
    const typedField = field as keyof Invite;
    if (this.sortField === typedField) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = typedField;
      this.sortDirection = 'asc';
    }
    this.loadInvites();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadInvites();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.loadInvites();
  }

  getRoleBadgeVariant(role: UserRole): BadgeVariant {
    const variants: Record<UserRole, BadgeVariant> = {
      patient: 'info',
      professional: 'primary',
      admin: 'warning'
    };
    return variants[role];
  }

  getStatusBadgeVariant(status: InviteStatus): BadgeVariant {
    const variants: Record<InviteStatus, BadgeVariant> = {
      pending: 'warning',
      accepted: 'success',
      expired: 'error',
      cancelled: 'neutral'
    };
    return variants[status];
  }

  getStatusLabel(status: InviteStatus): string {
    const labels: Record<InviteStatus, string> = {
      pending: 'Pendente',
      accepted: 'Aceito',
      expired: 'Expirado',
      cancelled: 'Cancelado'
    };
    return labels[status];
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      patient: 'Paciente',
      professional: 'Profissional',
      admin: 'Administrador'
    };
    return labels[role];
  }

  isExpired(invite: Invite): boolean {
    return new Date(invite.expiresAt) < new Date();
  }

  copyInviteLink(invite: Invite): void {
    const link = this.invitesService.copyInviteLink(invite.token);
    navigator.clipboard.writeText(link).then(() => {
      this.modalService.alert({
        title: 'Link Copiado',
        message: 'O link do convite foi copiado para a área de transferência!',
        variant: 'success'
      });
    });
  }

  resendInvite(invite: Invite): void {
    this.modalService.confirm({
      title: 'Reenviar Convite',
      message: `Deseja reenviar o convite para ${invite.email}?`,
      confirmText: 'Reenviar',
      cancelText: 'Cancelar'
    }).subscribe((result) => {
      if (result.confirmed) {
        this.invitesService.resendInvite(invite.id).subscribe({
          next: () => {
            this.modalService.alert({
              title: 'Sucesso',
              message: 'Convite reenviado com sucesso!',
              variant: 'success'
            });
          },
          error: () => {
            this.modalService.alert({
              title: 'Erro',
              message: 'Erro ao reenviar convite. Tente novamente.',
              variant: 'danger'
            });
          }
        });
      }
    });
  }

  cancelInvite(invite: Invite): void {
    this.modalService.confirm({
      title: 'Cancelar Convite',
      message: `Tem certeza que deseja cancelar o convite para ${invite.email}?`,
      confirmText: 'Cancelar Convite',
      cancelText: 'Voltar',
      variant: 'warning'
    }).subscribe((result) => {
      if (result.confirmed) {
        this.invitesService.cancelInvite(invite.id).subscribe({
          next: () => {
            this.modalService.alert({
              title: 'Sucesso',
              message: 'Convite cancelado com sucesso!',
              variant: 'success'
            });
            this.loadInvites();
          },
          error: () => {
            this.modalService.alert({
              title: 'Erro',
              message: 'Erro ao cancelar convite. Tente novamente.',
              variant: 'danger'
            });
          }
        });
      }
    });
  }

  deleteInvite(invite: Invite): void {
    this.modalService.confirm({
      title: 'Excluir Convite',
      message: `Tem certeza que deseja excluir o convite para ${invite.email}?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger'
    }).subscribe((result) => {
      if (result.confirmed) {
        this.invitesService.deleteInvite(invite.id).subscribe({
          next: () => {
            this.modalService.alert({
              title: 'Sucesso',
              message: 'Convite excluído com sucesso!',
              variant: 'success'
            });
            this.loadInvites();
          },
          error: () => {
            this.modalService.alert({
              title: 'Erro',
              message: 'Erro ao excluir convite. Tente novamente.',
              variant: 'danger'
            });
          }
        });
      }
    });
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  handleCreateInvite(data: { email: string; role: UserRole }): void {
    this.isLoading = true;
    this.invitesService.createInvite(data.email, data.role).subscribe({
      next: (newInvite) => {
        this.modalService.alert({
          title: 'Sucesso',
          message: 'Convite criado com sucesso!',
          variant: 'success'
        });
        this.loadInvites();
        this.closeCreateModal();
      },
      error: () => {
        this.isLoading = false;
        this.modalService.alert({
          title: 'Erro',
          message: 'Erro ao criar convite. Tente novamente.',
          variant: 'danger'
        });
      }
    });
  }
}
