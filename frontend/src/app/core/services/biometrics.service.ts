import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface BiometricsData {
  heartRate?: number; // bpm
  bloodPressureSystolic?: number; // mmHg
  bloodPressureDiastolic?: number; // mmHg
  oxygenSaturation?: number; // %
  temperature?: number; // Celsius
  respiratoryRate?: number; // rpm
  weight?: number; // kg
  height?: number; // cm
  glucose?: number; // mg/dL
  lastUpdated?: string; // ISO date
}

@Injectable({
  providedIn: 'root'
})
export class BiometricsService implements OnDestroy {
  private storageKeyPrefix = 'telecuidar_biometrics_';
  private biometricsSubjects: Map<string, BehaviorSubject<BiometricsData | null>> = new Map();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  private getSubject(appointmentId: string): BehaviorSubject<BiometricsData | null> {
    if (!this.biometricsSubjects.has(appointmentId)) {
      const initialData = this.loadFromStorage(appointmentId);
      this.biometricsSubjects.set(appointmentId, new BehaviorSubject<BiometricsData | null>(initialData));
    }
    return this.biometricsSubjects.get(appointmentId)!;
  }

  getBiometrics(appointmentId: string): Observable<BiometricsData | null> {
    return this.getSubject(appointmentId).asObservable();
  }

  saveBiometrics(appointmentId: string, data: BiometricsData): void {
    const dataWithTimestamp = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    this.saveToStorage(appointmentId, dataWithTimestamp);
    this.getSubject(appointmentId).next(dataWithTimestamp);
  }

  private loadFromStorage(appointmentId: string): BiometricsData | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    
    const key = `${this.storageKeyPrefix}${appointmentId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  private saveToStorage(appointmentId: string, data: BiometricsData): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const key = `${this.storageKeyPrefix}${appointmentId}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  private handleStorageEvent(event: StorageEvent) {
    if (event.key && event.key.startsWith(this.storageKeyPrefix)) {
      const appointmentId = event.key.replace(this.storageKeyPrefix, '');
      const newData = event.newValue ? JSON.parse(event.newValue) : null;
      
      // Update the subject if it exists
      if (this.biometricsSubjects.has(appointmentId)) {
        this.biometricsSubjects.get(appointmentId)!.next(newData);
      }
    }
  }
}
