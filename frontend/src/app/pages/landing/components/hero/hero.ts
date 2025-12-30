import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { BadgeComponent } from '@app/shared/components/atoms/badge/badge';
import { StatCardComponent } from '@app/shared/components/molecules/stat-card/stat-card';

@Component({
  selector: 'app-hero',
  imports: [CommonModule, ButtonComponent, IconComponent, BadgeComponent, StatCardComponent],
  templateUrl: './hero.html',
  styleUrl: './hero.scss'
})
export class HeroComponent {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  stats = [
    { value: '📊', label: 'Dados em Tempo Real', color: 'primary' as const },
    { value: '🤖', label: 'IA Diagnóstica', color: 'blue' as const },
    { value: '💊', label: 'Prescrição Digital', color: 'green' as const },
  ];

  scrollToSection(sectionId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
  }
}
