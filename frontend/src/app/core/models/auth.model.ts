import { PatientProfile, ProfessionalProfile } from '@core/services/users.service';

export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string;
  cpf: string;
  phone?: string;
  avatar?: string;
  role: userrole;
  status: 'Active' | 'Inactive';
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Campo legado mantido para compatibilidade
  specialtyId?: string;
  
  // Perfis específicos por tipo de usuário
  patientProfile?: PatientProfile;
  professionalProfile?: ProfessionalProfile;
}

export type userrole = 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  name: string;
  lastName: string;
  email: string;
  cpf: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
