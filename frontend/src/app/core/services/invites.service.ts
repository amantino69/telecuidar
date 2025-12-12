import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
export type UserRole = 'patient' | 'professional' | 'admin';

export interface Invite {
  id: number;
  email: string;
  role: UserRole;
  status: InviteStatus;
  createdAt: Date;
  expiresAt: Date;
  createdBy: string;
  acceptedAt?: Date;
  token: string;
}

export interface InvitesFilter {
  search?: string;
  role?: UserRole | 'all';
  status?: InviteStatus | 'all';
}

export interface InvitesSortOptions {
  field: keyof Invite;
  direction: 'asc' | 'desc';
}

export interface InvitesResponse {
  data: Invite[];
  total: number;
  totalPages: number;
  currentPage: number;
}

@Injectable({
  providedIn: 'root'
})
export class InvitesService {
  private mockInvites: Invite[] = [
    {
      id: 1,
      email: 'maria.silva@email.com',
      role: 'professional',
      status: 'pending',
      createdAt: new Date('2024-12-08T10:30:00'),
      expiresAt: new Date('2024-12-15T10:30:00'),
      createdBy: 'Admin Sistema',
      token: 'abc123def456'
    },
    {
      id: 2,
      email: 'joao.santos@email.com',
      role: 'patient',
      status: 'accepted',
      createdAt: new Date('2024-12-05T14:20:00'),
      expiresAt: new Date('2024-12-12T14:20:00'),
      createdBy: 'Admin Sistema',
      acceptedAt: new Date('2024-12-06T09:15:00'),
      token: 'ghi789jkl012'
    },
    {
      id: 3,
      email: 'ana.costa@email.com',
      role: 'professional',
      status: 'expired',
      createdAt: new Date('2024-11-20T16:45:00'),
      expiresAt: new Date('2024-11-27T16:45:00'),
      createdBy: 'Admin Sistema',
      token: 'mno345pqr678'
    },
    {
      id: 4,
      email: 'carlos.mendes@email.com',
      role: 'admin',
      status: 'pending',
      createdAt: new Date('2024-12-09T08:00:00'),
      expiresAt: new Date('2024-12-16T08:00:00'),
      createdBy: 'Admin Sistema',
      token: 'stu901vwx234'
    },
    {
      id: 5,
      email: 'paula.oliveira@email.com',
      role: 'patient',
      status: 'cancelled',
      createdAt: new Date('2024-12-01T11:30:00'),
      expiresAt: new Date('2024-12-08T11:30:00'),
      createdBy: 'Admin Sistema',
      token: 'yza567bcd890'
    },
    {
      id: 6,
      email: 'roberto.lima@email.com',
      role: 'professional',
      status: 'pending',
      createdAt: new Date('2024-12-10T15:00:00'),
      expiresAt: new Date('2024-12-17T15:00:00'),
      createdBy: 'Admin Sistema',
      token: 'efg123hij456'
    }
  ];

  getInvites(
    filter: InvitesFilter,
    sort: InvitesSortOptions,
    page: number,
    pageSize: number
  ): Observable<InvitesResponse> {
    let filtered = [...this.mockInvites];

    // Aplicar filtros
    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(invite =>
        invite.email.toLowerCase().includes(search) ||
        invite.createdBy.toLowerCase().includes(search) ||
        invite.id.toString().includes(search)
      );
    }

    if (filter.role && filter.role !== 'all') {
      filtered = filtered.filter(invite => invite.role === filter.role);
    }

    if (filter.status && filter.status !== 'all') {
      filtered = filtered.filter(invite => invite.status === filter.status);
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];

      if (aValue === undefined || bValue === undefined) return 0;
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    // Aplicar paginação
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);

    return of({
      data,
      total,
      totalPages,
      currentPage: page
    }).pipe(delay(300));
  }

  createInvite(email: string, role: UserRole): Observable<Invite> {
    const newInvite: Invite = {
      id: this.mockInvites.length > 0 ? Math.max(...this.mockInvites.map(i => i.id)) + 1 : 1,
      email,
      role,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdBy: 'Admin Sistema',
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    };
    this.mockInvites.unshift(newInvite);
    return of(newInvite).pipe(delay(500));
  }

  resendInvite(inviteId: number): Observable<void> {
    return of(void 0).pipe(delay(500));
  }

  cancelInvite(inviteId: number): Observable<void> {
    const invite = this.mockInvites.find(i => i.id === inviteId);
    if (invite) {
      invite.status = 'cancelled';
    }
    return of(void 0).pipe(delay(500));
  }

  deleteInvite(inviteId: number): Observable<void> {
    const index = this.mockInvites.findIndex(i => i.id === inviteId);
    if (index !== -1) {
      this.mockInvites.splice(index, 1);
    }
    return of(void 0).pipe(delay(500));
  }

  copyInviteLink(token: string): string {
    return `${window.location.origin}/register?invite=${token}`;
  }
}
