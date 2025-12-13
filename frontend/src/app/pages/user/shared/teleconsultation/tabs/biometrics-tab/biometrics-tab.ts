import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { BiometricsService, BiometricsData } from '@core/services/biometrics.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';

@Component({
  selector: 'app-biometrics-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './biometrics-tab.html',
  styleUrls: ['./biometrics-tab.scss']
})
export class BiometricsTabComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() userRole: 'patient' | 'professional' | 'admin' = 'patient';

  biometricsForm: FormGroup;
  lastUpdated: Date | null = null;
  private destroy$ = new Subject<void>();
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private biometricsService: BiometricsService
  ) {
    this.biometricsForm = this.fb.group({
      heartRate: [null, [Validators.min(0), Validators.max(300)]],
      bloodPressureSystolic: [null, [Validators.min(0), Validators.max(300)]],
      bloodPressureDiastolic: [null, [Validators.min(0), Validators.max(300)]],
      oxygenSaturation: [null, [Validators.min(0), Validators.max(100)]],
      temperature: [null, [Validators.min(30), Validators.max(45)]],
      respiratoryRate: [null, [Validators.min(0), Validators.max(100)]],
      glucose: [null, [Validators.min(0), Validators.max(1000)]],
      weight: [null, [Validators.min(0), Validators.max(500)]],
      height: [null, [Validators.min(0), Validators.max(300)]]
    });
  }

  ngOnInit() {
    if (this.appointmentId) {
      this.loadData();
      
      // Auto-save for patient on value changes (debounced)
      if (this.userRole === 'patient') {
        this.biometricsForm.valueChanges
          .pipe(
            takeUntil(this.destroy$),
            debounceTime(1000)
          )
          .subscribe(value => {
            if (this.biometricsForm.valid) {
              this.saveData(value);
            }
          });
      } else {
        // Professional mode: Disable form
        this.biometricsForm.disable();
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    if (!this.appointmentId) return;

    this.biometricsService.getBiometrics(this.appointmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data) {
          // Update form without emitting event to avoid infinite loop
          this.biometricsForm.patchValue(data, { emitEvent: false });
          if (data.lastUpdated) {
            this.lastUpdated = new Date(data.lastUpdated);
          }
        }
      });
  }

  saveData(data: BiometricsData) {
    if (!this.appointmentId) return;
    
    this.isSaving = true;
    this.biometricsService.saveBiometrics(this.appointmentId, data);
    this.lastUpdated = new Date();
    
    // Reset saving indicator after a delay
    setTimeout(() => {
      this.isSaving = false;
    }, 500);
  }

  get isProfessional(): boolean {
    return this.userRole === 'professional';
  }
}
