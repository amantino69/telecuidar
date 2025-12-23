import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '@app/shared/components/atoms/logo/logo';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { ThemeToggleComponent } from '@app/shared/components/atoms/theme-toggle/theme-toggle';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { AuthService } from '@core/services/auth.service';
import { STORAGE_KEYS } from '@core/constants/auth.constants';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, LogoComponent, ButtonComponent, ThemeToggleComponent, IconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isMenuOpen = false;
  isLoggedIn = false;
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Verificar estado inicial
      this.checkAuthStatus();
      
      // Assinar mudanças no estado de autenticação
      this.authSubscription = this.authService.authState$.subscribe(() => {
        this.checkAuthStatus();
      });
    }
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  private checkAuthStatus(): void {
    // Verificar se está autenticado via signal ou storage
    const hasToken = !!(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
    this.isLoggedIn = this.authService.isAuthenticated() || hasToken;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
