import { Pipe, PipeTransform } from '@angular/core';
import { AuditActionType } from '@app/core/services/audit-logs.service';

@Pipe({
  name: 'auditAction'
})
export class AuditActionPipe implements PipeTransform {
  private actionMap: Record<string, string> = {
    'create': 'Criar',
    'update': 'Atualizar',
    'delete': 'Excluir',
    'login': 'Login',
    'logout': 'Logout',
    'view': 'Visualizar',
    'export': 'Exportar'
  };

  transform(value: string): string {
    return this.actionMap[value] || value;
  }
}
