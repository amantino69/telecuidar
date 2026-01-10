import { Injectable } from '@angular/core';
import { Subject, Observable, take } from 'rxjs';

export interface ModalConfig {
  title: string;
  message?: string;
  htmlMessage?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'alert' | 'prompt';
  variant?: 'danger' | 'warning' | 'info' | 'success';
  prompt?: {
    label: string;
    placeholder?: string;
    required?: boolean;
  };
}

export interface ModalResult {
  confirmed: boolean;
  promptValue?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new Subject<ModalConfig>();
  private resultSubject = new Subject<ModalResult>();
  private modalCounter = 0;
  private baseZIndex = 2100; // Acima da teleconsulta (z-index: 2020)

  modal$ = this.modalSubject.asObservable();
  result$ = this.resultSubject.asObservable();

  open(config: ModalConfig): Observable<ModalResult> {
    this.modalSubject.next(config);
    // Usar take(1) para garantir que apenas um resultado seja emitido e o observable seja completado
    return this.result$.pipe(take(1));
  }

  getNextZIndex(): number {
    this.modalCounter += 2; // Incrementa por 2 (backdrop + modal)
    return this.baseZIndex + this.modalCounter;
  }

  resetZIndex(): void {
    this.modalCounter = 0;
  }

  confirm(config: Omit<ModalConfig, 'type'>): Observable<ModalResult> {
    return this.open({ ...config, type: 'confirm' });
  }

  alert(config: Omit<ModalConfig, 'type'>): Observable<ModalResult> {
    return this.open({ ...config, type: 'alert' });
  }

  prompt(config: Omit<ModalConfig, 'type'>): Observable<ModalResult> {
    return this.open({ ...config, type: 'prompt' });
  }

  close(result: ModalResult): void {
    this.resultSubject.next(result);
  }
}
