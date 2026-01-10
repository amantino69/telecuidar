import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '@app/shared/components/organisms/header/header';
import { HeroComponent } from '@pages/landing/components/hero/hero';
import { WhyWeExistComponent } from '@pages/landing/components/why-we-exist/why-we-exist';
import { FeaturesComponent } from '@pages/landing/components/features/features';
import { TechnologyComponent } from '@pages/landing/components/technology/technology';
import { SolutionComponent } from '@pages/landing/components/solution/solution';
import { ImpactComponent } from '@pages/landing/components/impact/impact';
import { VisionComponent } from '@pages/landing/components/vision/vision';
import { FooterComponent } from '@app/shared/components/organisms/footer/footer';

@Component({
  selector: 'app-landing',
  imports: [
    CommonModule, 
    HeaderComponent, 
    HeroComponent, 
    WhyWeExistComponent,
    FeaturesComponent, 
    TechnologyComponent,
    SolutionComponent,
    ImpactComponent,
    VisionComponent,
    FooterComponent
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class LandingComponent implements OnInit, OnDestroy {
  private lastScrollY = 0;
  private observer?: IntersectionObserver;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Setup scroll animations
    this.setupScrollAnimations();
    
    // Setup header show/hide on scroll
    this.setupHeaderScroll();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.handleScroll);
    }
  }

  private setupScrollAnimations(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    // Observe all sections
    const sections = document.querySelectorAll('main > *');
    sections.forEach((section) => this.observer?.observe(section));
  }

  private setupHeaderScroll(): void {
    window.addEventListener('scroll', this.handleScroll);
  }

  private handleScroll = (): void => {
    const currentScrollY = window.scrollY;
    const header = document.querySelector('.header');
    
    if (!header) return;

    // Show header when scrolling up, hide when scrolling down
    if (currentScrollY < this.lastScrollY || currentScrollY < 100) {
      header.classList.remove('header--hidden');
    } else if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
      header.classList.add('header--hidden');
    }

    this.lastScrollY = currentScrollY;
  };
}
