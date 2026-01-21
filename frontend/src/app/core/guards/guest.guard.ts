import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { STORAGE_KEYS } from '@core/constants/auth.constants';

/**
 * Guard que redireciona usuários autenticados para o painel.
 * Usado nas rotas de login/registro para evitar que usuários logados acessem essas páginas.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Durante SSR, sempre permitir (deixar o browser decidir depois)
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Se já está autenticado, redirecionar para o painel
  if (authService.isAuthenticated()) {
    router.navigate(['/painel']);
    return false;
  }

  // Fallback: verificar se existe token no storage
  const hasToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (hasToken) {
    router.navigate(['/painel']);
    return false;
  }

  return true;
};
