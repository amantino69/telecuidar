import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LogoComponent } from '@app/shared/components/atoms/logo/logo';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterLink, LogoComponent],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  links = {
    platform: [
      { label: 'Nossa Missão', href: '#about', isAnchor: true },
      { label: 'Tecnologia', href: '#technology', isAnchor: true },
      { label: 'Nossa Solução', href: '#solution', isAnchor: true },
      { label: 'Impacto Social', href: '#impact', isAnchor: true }
    ],
    legal: [
      { label: 'Política de Privacidade', href: '/privacidade', isExternal: false },
      { label: 'Termos de Uso', href: '/termos', isExternal: false },
      { label: 'Conformidade LGPD', href: '/lgpd', isExternal: false },
      { label: 'Certificações', href: 'https://docs.microsoft.com/pt-br/azure/compliance/', isExternal: true }
    ]
  };

  handlePlatformLinkClick(link: { label: string; href: string; isAnchor: boolean }, event: Event): void {
    if (link.isAnchor) {
      event.preventDefault();
      const sectionId = link.href.replace('#', '');
      
      // Check if we're on the landing page
      if (isPlatformBrowser(this.platformId)) {
        if (this.router.url === '/' || this.router.url.startsWith('/#')) {
          this.scrollToSection(sectionId);
        } else {
          // Navigate to landing page with fragment
          this.router.navigate(['/'], { fragment: sectionId }).then(() => {
            setTimeout(() => this.scrollToSection(sectionId), 100);
          });
        }
      }
    }
  }

  private scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  }
}
