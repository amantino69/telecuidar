import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { ButtonComponent } from '@shared/components/atoms/button/button';

@Component({
  selector: 'app-media-preview-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" (click)="close.emit()">
            <app-icon name="close" [size]="24" />
          </button>
        </div>
        
        <div class="media-container">
          <ng-container *ngIf="type === 'image'">
            <img [src]="url" [alt]="title" class="preview-image">
          </ng-container>
          
          <ng-container *ngIf="type !== 'image'">
            <div class="file-placeholder">
              <app-icon name="file" [size]="64" />
              <p>Visualização não disponível para este tipo de arquivo.</p>
              <app-button (click)="download.emit()">Baixar Arquivo</app-button>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'variables' as *;
    @use 'mixins' as *;

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: $z-index-modal;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: $spacing-lg;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
      background: var(--surface);
      border-radius: $radius-xl;
      max-width: 90vw;
      max-height: 90vh;
      width: auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: $shadow-2xl;
      animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-header {
      padding: $spacing-md $spacing-lg;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface);

      h3 {
        margin: 0;
        font-size: $font-size-lg;
        color: var(--text-primary);
        @include truncate;
        max-width: 300px;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: $spacing-xs;
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        &:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
      }
    }

    .media-container {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--neutral-900);
      min-width: 300px;
      min-height: 300px;

      .preview-image {
        max-width: 100%;
        max-height: calc(90vh - 60px);
        object-fit: contain;
      }

      .file-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $spacing-lg;
        color: var(--neutral-100);
        padding: $spacing-2xl;
        text-align: center;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class MediaPreviewModalComponent {
  @Input() isOpen = false;
  @Input() url = '';
  @Input() title = '';
  @Input() type: 'image' | 'file' = 'image';
  
  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
}
