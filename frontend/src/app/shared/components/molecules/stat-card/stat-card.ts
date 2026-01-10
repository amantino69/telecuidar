import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss'
})
export class StatCardComponent {
  @Input() value!: string;
  @Input() label!: string;
  @Input() color: 'primary' | 'red' | 'green' | 'blue' = 'primary';
}
