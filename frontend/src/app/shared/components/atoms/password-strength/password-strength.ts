import { Component, input, computed } from '@angular/core';
import { getPasswordRequirements, PasswordRequirement } from '@app/core/validators/password.validator';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-password-strength',
  imports: [IconComponent],
  templateUrl: './password-strength.html',
  styleUrl: './password-strength.scss'
})
export class PasswordStrengthComponent {
  password = input<string>('');
  
  requirements = computed(() => getPasswordRequirements(this.password()));
  
  allMet = computed(() => this.requirements().every(req => req.met));
}
