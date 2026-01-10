import { Pipe, PipeTransform } from '@angular/core';
import { UserStatus } from '@app/core/services/users.service';

@Pipe({
  name: 'userStatus'
})
export class UserStatusPipe implements PipeTransform {
  transform(status: UserStatus): string {
    const statusMap: Record<UserStatus, string> = {
      Active: 'Ativo',
      Inactive: 'Inativo'
    };
    return statusMap[status] || status;
  }
}
