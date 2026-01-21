import { Pipe, PipeTransform } from '@angular/core';
import { UserRole } from '@app/core/services/users.service';

@Pipe({
  name: 'userRole'
})
export class UserRolePipe implements PipeTransform {
  transform(role: UserRole | string | null | undefined): string {
    if (!role) return '';
    
    const roleMap: Record<string, string> = {
      PATIENT: 'Paciente',
      PROFESSIONAL: 'Profissional',
      ADMIN: 'Administrador'
    };
    return roleMap[role] || role;
  }
}
