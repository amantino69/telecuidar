import { Pipe, PipeTransform } from '@angular/core';
import { ScheduleStatus } from '@app/core/services/schedules.service';

@Pipe({
  name: 'scheduleStatus',
  standalone: true
})
export class ScheduleStatusPipe implements PipeTransform {
  transform(status: ScheduleStatus): string {
    const statusMap: Record<ScheduleStatus, string> = {
      'Active': 'Ativa',
      'Inactive': 'Inativa'
    };
    return statusMap[status] || status;
  }
}
