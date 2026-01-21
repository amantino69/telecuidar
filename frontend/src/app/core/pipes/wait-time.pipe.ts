import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'waitTime'
})
export class WaitTimePipe implements PipeTransform {
  transform(days: number): string {
    if (days < 1) return 'menos de 1 dia';
    if (days === 1) return '1 dia';
    return `${days} dias`;
  }
}
