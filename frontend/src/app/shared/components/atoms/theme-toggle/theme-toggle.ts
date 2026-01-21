import { Component, OnInit, OnDestroy, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from '@app/shared/components/atoms/icon/icon';
import { ThemeService, ThemeType, ThemeOption } from '@app/core/services/theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-theme-toggle',
  imports: [CommonModule, IconComponent],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss'
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private elementRef = inject(ElementRef);
  private destroy$ = new Subject<void>();
  
  currentTheme: ThemeType = 'light';
  themes: ThemeOption[] = [];
  isOpen = false;

  ngOnInit() {
    this.themes = this.themeService.themes;
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => this.currentTheme = theme);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectTheme(theme: ThemeType) {
    this.themeService.setTheme(theme);
    this.isOpen = false;
  }

  getCurrentThemeIcon(): IconName {
    const theme = this.themes.find(t => t.id === this.currentTheme);
    return theme?.icon || 'sun';
  }

  getCurrentThemeName(): string {
    const theme = this.themes.find(t => t.id === this.currentTheme);
    return theme?.name || 'Profissional';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.isOpen = false;
  }
}
