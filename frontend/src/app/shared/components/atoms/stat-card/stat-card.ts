import { Component, Input } from '@angular/core';
import { DecimalPipe, PercentPipe, CurrencyPipe, NgClass } from '@angular/common';
import { IconComponent, IconName } from '@app/shared/components/atoms/icon/icon';

export type StatCardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export type StatCardFormat = 'number' | 'currency' | 'percent' | 'text';

@Component({
  selector: 'app-stat-card',
  imports: [IconComponent, DecimalPipe, PercentPipe, CurrencyPipe, NgClass],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss'
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() format: StatCardFormat = 'text';
  @Input() icon?: IconName;
  @Input() variant: StatCardVariant = 'default';
  @Input() trend?: 'up' | 'down';
  @Input() trendValue?: string;
  @Input() description?: string;
  @Input() loading = false;

  get numericValue(): number {
    return typeof this.value === 'number' ? this.value : parseFloat(this.value) || 0;
  }

  get trendIcon(): IconName {
    return this.trend === 'up' ? 'chevron-up' : 'chevron-down';
  }

  get variantClass(): string {
    return `stat-card--${this.variant}`;
  }
}
