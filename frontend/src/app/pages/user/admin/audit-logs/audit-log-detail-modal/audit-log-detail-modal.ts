import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { BadgeComponent } from '@app/shared/components/atoms/badge/badge';
import { AuditLog } from '@app/core/services/audit-logs.service';
import { UserRolePipe } from '@app/core/pipes/user-role.pipe';

@Component({
  selector: 'app-audit-log-detail-modal',
  imports: [DatePipe, IconComponent, ButtonComponent, BadgeComponent, UserRolePipe],
  templateUrl: './audit-log-detail-modal.html',
  styleUrl: './audit-log-detail-modal.scss'
})
export class AuditLogDetailModalComponent {
  log = input.required<AuditLog>();
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }

  getActionBadgeVariant(action: string): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    const variants: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
      'create': 'success',
      'update': 'info',
      'delete': 'error',
      'login': 'primary',
      'logout': 'neutral',
      'view': 'info',
      'export': 'warning'
    };
    return variants[action] || 'neutral';
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'create': 'Criar',
      'update': 'Atualizar',
      'delete': 'Excluir',
      'login': 'Login',
      'logout': 'Logout',
      'view': 'Visualizar',
      'export': 'Exportar'
    };
    return labels[action] || action;
  }

  getEntityTypeLabel(entityType: string): string {
    const labels: Record<string, string> = {
      'User': 'Usuário',
      'Specialty': 'Especialidade',
      'Appointment': 'Consulta',
      'Schedule': 'Agenda',
      'Notification': 'Notificação',
      'Attachment': 'Anexo',
      'Invite': 'Convite',
      'ScheduleBlock': 'Bloqueio de Agenda',
      'Prescription': 'Receita',
      'MedicalCertificate': 'Atestado'
    };
    return labels[entityType] || entityType;
  }

  parseJSON(jsonString: string | null | undefined): any {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  getOldValues(): any {
    return this.parseJSON(this.log().oldValues);
  }

  getNewValues(): any {
    return this.parseJSON(this.log().newValues);
  }

  hasOldValues(): boolean {
    return !!this.log().oldValues && this.log().oldValues !== '{}' && this.log().oldValues !== 'null';
  }

  hasNewValues(): boolean {
    return !!this.log().newValues && this.log().newValues !== '{}' && this.log().newValues !== 'null';
  }

  getFormattedJSON(value: any): string {
    if (!value) return '';
    return JSON.stringify(value, null, 2);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  isModificationAction(): boolean {
    const action = this.log().action.toLowerCase();
    return action === 'update' || action === 'delete';
  }

  getTargetUserInfo(): { name?: string; email?: string; role?: string } | null {
    if (!this.isModificationAction() || this.log().entityType !== 'User') {
      return null;
    }

    const newValues = this.getNewValues();
    const oldValues = this.getOldValues();
    const values = newValues || oldValues;

    if (!values) return null;

    return {
      name: values.name || values.Name,
      email: values.email || values.Email,
      role: values.role || values.Role
    };
  }

  hasTargetUserInfo(): boolean {
    const info = this.getTargetUserInfo();
    return info !== null && (!!info.name || !!info.email);
  }
}
