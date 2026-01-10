import { Component, Input, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { AvatarService } from '@app/core/services/avatar.service';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

@Component({
  selector: 'app-avatar',
  imports: [NgClass],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss'
})
export class AvatarComponent {
  @Input() name: string = '';
  @Input() set imageUrl(value: string | undefined) {
    this._imageUrl = value ? this.avatarService.getAvatarUrl(value) : undefined;
    this.imageLoadError = false;
  }
  @Input() size: AvatarSize = 'md';
  
  private _imageUrl?: string;
  private avatarService = inject(AvatarService);
  imageLoadError = false;

  get imageUrl(): string | undefined {
    return this._imageUrl;
  }

  get initials(): string {
    if (!this.name) return '';
    
    const parts = this.name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get sizeClass(): string {
    return `avatar--${this.size}`;
  }

  onImageError(): void {
    this.imageLoadError = true;
  }
}
