import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneMask',
  standalone: true
})
export class PhoneMaskPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    
    // Remove all non-digits
    const phone = value.replace(/\D/g, '');
    
    // Apply mask: (00) 00000-0000 or (00) 0000-0000
    if (phone.length <= 2) {
      return phone;
    } else if (phone.length <= 6) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
    } else if (phone.length <= 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    } else {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`;
    }
  }
}
