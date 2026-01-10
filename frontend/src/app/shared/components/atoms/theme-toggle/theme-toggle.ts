import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ThemeService } from '@app/core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [CommonModule, IconComponent],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss'
})
export class ThemeToggleComponent implements OnInit {
  private themeService = inject(ThemeService);
  isDark = false;

  ngOnInit() {
    this.isDark = this.themeService.isDarkMode();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.isDark = this.themeService.isDarkMode();
  }
}
