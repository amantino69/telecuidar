import { Injectable, Renderer2, RendererFactory2, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { IconName } from '@app/shared/components/atoms/icon/icon';

export type ThemeType = 'light' | 'dark' | 'contrast';

export interface ThemeOption {
  id: ThemeType;
  name: string;
  icon: IconName;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private renderer: Renderer2;
  private readonly THEME_KEY = 'telecuidar-theme';
  private mediaQueryListener: (() => void) | null = null;
  
  // Temas disponíveis
  public readonly themes: ThemeOption[] = [
    { id: 'light', name: 'Profissional', icon: 'sun', description: 'Tema claro com cores institucionais' },
    { id: 'dark', name: 'Noturno', icon: 'moon', description: 'Tema escuro suave para uso noturno' },
    { id: 'contrast', name: 'Vibrante', icon: 'heart', description: 'Tema alegre com cores vibrantes' }
  ];
  
  // Observable para mudanças de tema
  private currentThemeSubject = new BehaviorSubject<ThemeType>('light');
  public currentTheme$ = this.currentThemeSubject.asObservable();
  
  // Mantido para compatibilidade
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
    if (this.mediaQueryListener) {
      this.mediaQueryListener();
    }
  }

  private initTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeType | null;
      if (savedTheme && this.isValidTheme(savedTheme)) {
        this.applyTheme(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.applyTheme(prefersDark ? 'dark' : 'light');
      }
    }
  }

  private isValidTheme(theme: string): theme is ThemeType {
    return ['light', 'dark', 'contrast'].includes(theme);
  }

  private listenToSystemThemeChanges(): void {
    if (isPlatformBrowser(this.platformId)) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handler = (e: MediaQueryListEvent) => {
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

  private applyTheme(theme: ThemeType): void {
    if (isPlatformBrowser(this.platformId)) {
      // Remove todos os temas primeiro
      this.renderer.removeAttribute(document.documentElement, 'data-theme');
      
      // Aplica o novo tema (light não precisa de atributo, é o padrão)
      if (theme !== 'light') {
        this.renderer.setAttribute(document.documentElement, 'data-theme', theme);
      }
      
      this.currentThemeSubject.next(theme);
      this.isDarkThemeSubject.next(theme === 'dark');
    }
  }

  setTheme(theme: ThemeType): void {
    if (isPlatformBrowser(this.platformId) && this.isValidTheme(theme)) {
      this.applyTheme(theme);
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  getCurrentTheme(): ThemeType {
    return this.currentThemeSubject.getValue();
  }

  // Cicla entre os temas (para o toggle simples)
  toggleTheme(): void {
    const current = this.getCurrentTheme();
    const themeOrder: ThemeType[] = ['light', 'dark', 'contrast'];
    const currentIndex = themeOrder.indexOf(current);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    this.setTheme(themeOrder[nextIndex]);
  }

  // Mantido para compatibilidade
  isDarkMode(): boolean {
    return this.getCurrentTheme() === 'dark';
  }

  useSystemTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  isUsingManualPreference(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.THEME_KEY) !== null;
    }
    return false;
  }
}
