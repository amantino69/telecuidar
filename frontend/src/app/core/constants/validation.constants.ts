/**
 * Constantes centralizadas de validação para todo o sistema
 * Use estas constantes para garantir consistência nas validações
 */

// Regex patterns for validation
export const VALIDATION_REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CPF_NUMBERS_ONLY: /^\d{11}$/,
  PHONE: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  PHONE_NUMBERS_ONLY: /^\d{10,11}$/,
  /**
   * Senha: mínimo 8 caracteres, pelo menos:
   * - 1 letra minúscula
   * - 1 letra maiúscula
   * - 1 número
   * - 1 caractere especial
   */
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[a-zA-ZÀ-ÿ\s]{2,}$/,
} as const;

// Mensagens de validação padronizadas
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Este campo é obrigatório',
  EMAIL_INVALID: 'Email inválido',
  EMAIL_REQUIRED: 'Email é obrigatório',
  
  CPF_INVALID: 'CPF inválido. Formato: 000.000.000-00',
  CPF_REQUIRED: 'CPF é obrigatório',
  
  PHONE_INVALID: 'Telefone inválido. Formato: (00) 00000-0000',
  PHONE_REQUIRED: 'Telefone é obrigatório',
  
  PASSWORD_REQUIRED: 'Senha é obrigatória',
  PASSWORD_MIN_LENGTH: 'A senha deve ter no mínimo 8 caracteres',
  PASSWORD_WEAK: 'A senha deve conter: maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&)',
  PASSWORD_REQUIREMENTS: 'Senha deve ter 8+ caracteres, incluindo: maiúsculas, minúsculas, números e caracteres especiais',
  PASSWORD_MATCH: 'As senhas não coincidem',
  CONFIRM_PASSWORD_REQUIRED: 'Confirme sua senha',
  
  NAME_INVALID: 'Nome deve conter apenas letras',
  NAME_MIN_LENGTH: 'Nome deve ter no mínimo 2 caracteres',
  NAME_REQUIRED: 'Nome é obrigatório',
  
  LASTNAME_REQUIRED: 'Sobrenome é obrigatório',
  LASTNAME_MIN_LENGTH: 'Sobrenome deve ter no mínimo 2 caracteres',
  
  TERMS_REQUIRED: 'Você deve aceitar os termos de uso',
  
  MIN_LENGTH: (length: number) => `Mínimo de ${length} caracteres`,
  MAX_LENGTH: (length: number) => `Máximo de ${length} caracteres`,
} as const;

// Limites de tamanho dos campos
export const FIELD_CONSTRAINTS = {
  NAME: {
    min: 2,
    max: 50
  },
  LASTNAME: {
    min: 2,
    max: 50
  },
  EMAIL: {
    min: 5,
    max: 100
  },
  PASSWORD: {
    min: 8,
    max: 50
  },
  CPF: {
    exact: 14 // com máscara: 000.000.000-00
  },
  PHONE: {
    exact: 15 // com máscara: (00) 00000-0000
  }
} as const;

/**
 * Valida se a senha atende aos requisitos mínimos
 * @param password - Senha a ser validada
 * @returns true se válida, false caso contrário
 */
export function validatePassword(password: string): boolean {
  if (!password || password.length < FIELD_CONSTRAINTS.PASSWORD.min) {
    return false;
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

/**
 * Retorna os requisitos de senha não atendidos
 * @param password - Senha a ser validada
 * @returns Array com os requisitos faltantes
 */
export function getPasswordMissingRequirements(password: string): string[] {
  const missing: string[] = [];
  
  if (password.length < FIELD_CONSTRAINTS.PASSWORD.min) {
    missing.push(`${FIELD_CONSTRAINTS.PASSWORD.min} caracteres`);
  }
  
  if (!/[A-Z]/.test(password)) {
    missing.push('uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    missing.push('uma letra minúscula');
  }
  
  if (!/\d/.test(password)) {
    missing.push('um número');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    missing.push('um caractere especial (@$!%*?&)');
  }
  
  return missing;
}

/**
 * Valida CPF (apenas números)
 * @param cpf - CPF sem máscara
 * @returns true se válido
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCpf = cpf.replace(/\D/g, '');
  
  if (cleanCpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
  
  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCpf.charAt(9))) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCpf.charAt(10))) return false;
  
  return true;
}

/**
 * Valida email
 * @param email - Email a ser validado
 * @returns true se válido
 */
export function validateEmail(email: string): boolean {
  return VALIDATION_REGEX.EMAIL.test(email);
}

/**
 * Valida telefone
 * @param phone - Telefone com ou sem máscara
 * @returns true se válido
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

// Exporta tudo como um objeto único também
export const VALIDATION_CONSTANTS = {
  REGEX: VALIDATION_REGEX,
  MESSAGES: VALIDATION_MESSAGES,
  CONSTRAINTS: FIELD_CONSTRAINTS,
  validatePassword,
  getPasswordMissingRequirements,
  validateCPF,
  validateEmail,
  validatePhone
} as const;
