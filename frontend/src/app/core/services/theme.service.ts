import { Injectable, Renderer2, RendererFactory2, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private renderer: Renderer2;
  private readonly THEME_KEY = 'telecuidar-theme';
  private mediaQueryListener: (() => void) | null = null;
  
  // Observable para mudanças de tema
  private isDarkThemeSubject = new BehaviorSubject<boolean>(false);
  public isDarkTheme$ = this.isDarkThemeSubject.asObservable();

  constructor(
    rendererFactory: RendererFactory2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initTheme();
    this.listenToSystemThemeChanges();
  }

  ngOnDestroy(): void {
    // Limpar listener quando o serviço for destruído
    if (this.mediaQueryListener) {
      this.mediaQueryListener();
    }
  }

  private initTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem(this.THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (prefersDark ? 'dark' : 'light');
      this.applyTheme(theme);
    }
  }

  private listenToSystemThemeChanges(): void {
    if (isPlatformBrowser(this.platformId)) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handler = (e: MediaQueryListEvent) => {
        // Só aplica mudança automática se não houver preferência manual salva
        const savedTheme = localStorage.getItem(this.THEME_KEY);
        if (!savedTheme) {
          const theme = e.matches ? 'dark' : 'light';
          this.applyTheme(theme);
        }
      };

      mediaQuery.addEventListener('change', handler);
      this.mediaQueryListener = () => mediaQuery.removeEventListener('change', handler);
    }
  }

  private applyTheme(theme: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const isDark = theme === 'dark';
      if (isDark) {
        this.renderer.setAttribute(document.documentElement, 'data-theme', 'dark');
      } else {
        this.renderer.removeAttribute(document.documentElement, 'data-theme');
      }
      this.isDarkThemeSubject.next(isDark);
    }
  }

  private setTheme(theme: string): void {
    if (isPlatformBrowser(this.platformId)) {
      this.applyTheme(theme);
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  toggleTheme(): void {
    const currentTheme = this.isDarkMode() ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  isDarkMode(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  }

  /**
   * Remove a preferência manual e volta a seguir o tema do sistema
   */
  useSystemTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  /**
   * Verifica se está usando preferência manual ou do sistema
   */
  isUsingManualPreference(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.THEME_KEY) !== null;
    }
    return false;
  }
}
