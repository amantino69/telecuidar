import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordStrengthErrors {
  minLength?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  number?: boolean;
  symbol?: boolean;
}

export interface PasswordRequirement {
  label: string;
  regex: RegExp;
  met: boolean;
}

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const errors: PasswordStrengthErrors = {};

    // Minimum 8 characters
    if (value.length < 8) {
      errors.minLength = true;
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(value)) {
      errors.uppercase = true;
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(value)) {
      errors.lowercase = true;
    }

    // At least one number
    if (!/\d/.test(value)) {
      errors.number = true;
    }

    // At least one symbol
    if (!/[@$!%*?&]/.test(value)) {
      errors.symbol = true;
    }

    return Object.keys(errors).length > 0 ? { passwordStrength: errors } : null;
  };
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: 'Mínimo de 8 caracteres',
      regex: /.{8,}/,
      met: /.{8,}/.test(password || '')
    },
    {
      label: 'Uma letra maiúscula',
      regex: /[A-Z]/,
      met: /[A-Z]/.test(password || '')
    },
    {
      label: 'Uma letra minúscula',
      regex: /[a-z]/,
      met: /[a-z]/.test(password || '')
    },
    {
      label: 'Um número',
      regex: /\d/,
      met: /\d/.test(password || '')
    },
    {
      label: 'Um símbolo (@$!%*?&)',
      regex: /[@$!%*?&]/,
      met: /[@$!%*?&]/.test(password || '')
    }
  ];
}

export function isPasswordStrong(password: string): boolean {
  const requirements = getPasswordRequirements(password);
  return requirements.every(req => req.met);
}
