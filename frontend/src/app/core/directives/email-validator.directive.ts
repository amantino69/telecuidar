import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appEmailValidator]',
  standalone: true
})
export class EmailValidatorDirective {
  constructor(private el: ElementRef) {}

  @HostListener('blur', ['$event'])
  onBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    
    if (value && !this.isValidEmail(value)) {
      input.classList.add('invalid');
    } else {
      input.classList.remove('invalid');
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.classList.remove('invalid');
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
