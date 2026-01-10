import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';

export interface CropperResult {
  imageUrl: string;
  blob: Blob;
}

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-image-cropper',
  imports: [IconComponent, ButtonComponent, DecimalPipe],
  templateUrl: './image-cropper.html',
  styleUrl: './image-cropper.scss'
})
export class ImageCropperComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() imageUrl: string = '';
  @Input() aspectRatio: number = 1; // 1 = quadrado
  @Output() crop = new EventEmitter<CropperResult>();
  @Output() cancel = new EventEmitter<void>();

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  
  // Crop area
  cropArea = {
    x: 0,
    y: 0,
    width: 200,
    height: 200
  };

  // Drag state
  private isDragging = false;
  private dragStart: Point = { x: 0, y: 0 };
  private dragOffset: Point = { x: 0, y: 0 };

  // Resize state
  private isResizing = false;
  private resizeHandle: string | null = null;

  // Zoom
  scale = 1;
  minScale = 0.5;
  maxScale = 3;

  // Image position
  imagePosition = { x: 0, y: 0 };

  ngOnInit(): void {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.loadImage();
  }

  ngOnDestroy(): void {
    if (this.image) {
      this.image.src = '';
    }
  }

  private loadImage(): void {
    this.image = new Image();
    this.image.onload = () => {
      this.initCanvas();
      this.draw();
    };
    this.image.src = this.imageUrl;
  }

  private initCanvas(): void {
    if (!this.image) return;

    const containerWidth = 600;
    const containerHeight = 500;
    
    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;

    // Centralizar crop area
    this.cropArea.x = (containerWidth - this.cropArea.width) / 2;
    this.cropArea.y = (containerHeight - this.cropArea.height) / 2;

    // Calcular escala inicial para a imagem caber no canvas
    const scaleX = containerWidth / this.image.width;
    const scaleY = containerHeight / this.image.height;
    this.scale = Math.min(scaleX, scaleY);

    // Centralizar imagem
    this.imagePosition.x = (containerWidth - this.image.width * this.scale) / 2;
    this.imagePosition.y = (containerHeight - this.image.height * this.scale) / 2;
  }

  private draw(): void {
    if (!this.image || !this.ctx) return;

    // Limpar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Desenhar imagem
    this.ctx.save();
    this.ctx.drawImage(
      this.image,
      this.imagePosition.x,
      this.imagePosition.y,
      this.image.width * this.scale,
      this.image.height * this.scale
    );
    this.ctx.restore();

    // Desenhar overlay escuro
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Limpar área de crop
    this.ctx.clearRect(
      this.cropArea.x,
      this.cropArea.y,
      this.cropArea.width,
      this.cropArea.height
    );

    // Redesenhar imagem na área de crop
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(this.cropArea.x, this.cropArea.y, this.cropArea.width, this.cropArea.height);
    this.ctx.clip();
    this.ctx.drawImage(
      this.image,
      this.imagePosition.x,
      this.imagePosition.y,
      this.image.width * this.scale,
      this.image.height * this.scale
    );
    this.ctx.restore();

    // Desenhar borda da área de crop
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      this.cropArea.x,
      this.cropArea.y,
      this.cropArea.width,
      this.cropArea.height
    );

    // Desenhar handles de resize
    this.drawResizeHandles();
  }

  private drawResizeHandles(): void {
    const handleSize = 10;
    const handles = [
      { x: this.cropArea.x - handleSize / 2, y: this.cropArea.y - handleSize / 2 }, // top-left
      { x: this.cropArea.x + this.cropArea.width - handleSize / 2, y: this.cropArea.y - handleSize / 2 }, // top-right
      { x: this.cropArea.x - handleSize / 2, y: this.cropArea.y + this.cropArea.height - handleSize / 2 }, // bottom-left
      { x: this.cropArea.x + this.cropArea.width - handleSize / 2, y: this.cropArea.y + this.cropArea.height - handleSize / 2 }, // bottom-right
    ];

    this.ctx.fillStyle = '#fff';
    handles.forEach(handle => {
      this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
  }

  onMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Verificar se clicou em um handle de resize
    const handle = this.getResizeHandle(x, y);
    if (handle) {
      this.isResizing = true;
      this.resizeHandle = handle;
      return;
    }

    // Verificar se clicou dentro da área de crop
    if (
      x >= this.cropArea.x &&
      x <= this.cropArea.x + this.cropArea.width &&
      y >= this.cropArea.y &&
      y <= this.cropArea.y + this.cropArea.height
    ) {
      this.isDragging = true;
      this.dragStart = { x, y };
      this.dragOffset = {
        x: x - this.cropArea.x,
        y: y - this.cropArea.y
      };
    }
  }

  onMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.isResizing && this.resizeHandle) {
      this.handleResize(x, y);
      this.draw();
    } else if (this.isDragging) {
      this.cropArea.x = Math.max(0, Math.min(x - this.dragOffset.x, this.canvas.width - this.cropArea.width));
      this.cropArea.y = Math.max(0, Math.min(y - this.dragOffset.y, this.canvas.height - this.cropArea.height));
      this.draw();
    } else {
      // Atualizar cursor
      const handle = this.getResizeHandle(x, y);
      const isInsideCrop = 
        x >= this.cropArea.x &&
        x <= this.cropArea.x + this.cropArea.width &&
        y >= this.cropArea.y &&
        y <= this.cropArea.y + this.cropArea.height;
      
      if (handle) {
        this.canvas.style.cursor = 'nwse-resize';
      } else if (isInsideCrop) {
        this.canvas.style.cursor = 'move';
      } else {
        this.canvas.style.cursor = 'default';
      }
    }
  }

  onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Verificar se o mouse está dentro da área de crop
    const isInsideCrop = 
      x >= this.cropArea.x &&
      x <= this.cropArea.x + this.cropArea.width &&
      y >= this.cropArea.y &&
      y <= this.cropArea.y + this.cropArea.height;

    if (isInsideCrop) {
      // Redimensionar área de crop com scroll
      const delta = event.deltaY > 0 ? -10 : 10;
      const newWidth = Math.max(100, Math.min(this.cropArea.width + delta, this.canvas.width));
      const newHeight = Math.max(100, Math.min(this.cropArea.height + delta, this.canvas.height));
      
      // Manter o centro da área de crop no mesmo lugar
      const centerX = this.cropArea.x + this.cropArea.width / 2;
      const centerY = this.cropArea.y + this.cropArea.height / 2;
      
      this.cropArea.width = newWidth;
      this.cropArea.height = newHeight;
      this.cropArea.x = Math.max(0, Math.min(centerX - newWidth / 2, this.canvas.width - newWidth));
      this.cropArea.y = Math.max(0, Math.min(centerY - newHeight / 2, this.canvas.height - newHeight));
      
      this.draw();
    }
  }

  private getResizeHandle(x: number, y: number): string | null {
    const handleSize = 10;
    const tolerance = 5;

    const handles = {
      'top-left': { x: this.cropArea.x, y: this.cropArea.y },
      'top-right': { x: this.cropArea.x + this.cropArea.width, y: this.cropArea.y },
      'bottom-left': { x: this.cropArea.x, y: this.cropArea.y + this.cropArea.height },
      'bottom-right': { x: this.cropArea.x + this.cropArea.width, y: this.cropArea.y + this.cropArea.height }
    };

    for (const [name, pos] of Object.entries(handles)) {
      if (
        x >= pos.x - tolerance &&
        x <= pos.x + tolerance &&
        y >= pos.y - tolerance &&
        y <= pos.y + tolerance
      ) {
        return name;
      }
    }

    return null;
  }

  private handleResize(x: number, y: number): void {
    if (!this.resizeHandle) return;

    const minSize = 100;
    
    switch (this.resizeHandle) {
      case 'top-left':
        const newWidth = this.cropArea.x + this.cropArea.width - x;
        const newHeight = this.cropArea.y + this.cropArea.height - y;
        if (newWidth >= minSize && newHeight >= minSize) {
          this.cropArea.width = newWidth;
          this.cropArea.height = newHeight;
          this.cropArea.x = x;
          this.cropArea.y = y;
        }
        break;
      case 'top-right':
        const widthTR = x - this.cropArea.x;
        const heightTR = this.cropArea.y + this.cropArea.height - y;
        if (widthTR >= minSize && heightTR >= minSize) {
          this.cropArea.width = widthTR;
          this.cropArea.height = heightTR;
          this.cropArea.y = y;
        }
        break;
      case 'bottom-left':
        const widthBL = this.cropArea.x + this.cropArea.width - x;
        const heightBL = y - this.cropArea.y;
        if (widthBL >= minSize && heightBL >= minSize) {
          this.cropArea.width = widthBL;
          this.cropArea.height = heightBL;
          this.cropArea.x = x;
        }
        break;
      case 'bottom-right':
        const widthBR = x - this.cropArea.x;
        const heightBR = y - this.cropArea.y;
        if (widthBR >= minSize && heightBR >= minSize) {
          this.cropArea.width = widthBR;
          this.cropArea.height = heightBR;
        }
        break;
    }
  }

  onZoomIn(): void {
    if (this.scale < this.maxScale) {
      this.scale = Math.min(this.scale + 0.1, this.maxScale);
      this.draw();
    }
  }

  onZoomOut(): void {
    if (this.scale > this.minScale) {
      this.scale = Math.max(this.scale - 0.1, this.minScale);
      this.draw();
    }
  }

  onRotateLeft(): void {
    if (!this.image) return;
    // Implementar rotação se necessário
  }

  onRotateRight(): void {
    if (!this.image) return;
    // Implementar rotação se necessário
  }

  onConfirm(): void {
    if (!this.image) return;

    // Criar canvas temporário para o crop
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d')!;

    cropCanvas.width = this.cropArea.width;
    cropCanvas.height = this.cropArea.height;

    // Calcular posição da imagem relativa ao crop
    const sourceX = (this.cropArea.x - this.imagePosition.x) / this.scale;
    const sourceY = (this.cropArea.y - this.imagePosition.y) / this.scale;
    const sourceWidth = this.cropArea.width / this.scale;
    const sourceHeight = this.cropArea.height / this.scale;

    cropCtx.drawImage(
      this.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      this.cropArea.width,
      this.cropArea.height
    );

    cropCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        this.crop.emit({ imageUrl: url, blob });
      }
    }, 'image/jpeg', 0.95);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
