import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, interval, takeUntil } from 'rxjs';

Chart.register(...registerables);

interface BiometricReading {
  timestamp: Date;
  heartRate: number;
  systolic: number;
  diastolic: number;
  oxygenSaturation: number;
  temperature: number;
  respiratoryRate: number;
}

@Component({
  selector: 'app-iot-tab',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './iot-tab.html',
  styleUrls: ['./iot-tab.scss']
})
export class IotTabComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() appointmentId: string | null = null;
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';
  @Input() readonly = false;

  @ViewChild('heartRateCanvas') heartRateCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bloodPressureCanvas') bloodPressureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('oxygenCanvas') oxygenCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('temperatureCanvas') temperatureCanvas!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private heartRateChart?: Chart;
  private bloodPressureChart?: Chart;
  private oxygenChart?: Chart;
  private temperatureChart?: Chart;

  isConnected = false;
  currentReadings: BiometricReading | null = null;
  historicalData: BiometricReading[] = [];
  maxDataPoints = 20;

  connectionStatus = 'Desconectado';
  deviceInfo = {
    name: 'Sensor Biométrico IoT',
    model: 'SmartHealth Pro 2.0',
    serialNumber: 'SH-2024-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    batteryLevel: 85,
    signalStrength: 4
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Inicializar com dados vazios
    this.initializeEmptyData();
  }

  ngAfterViewInit() {
    // Aguardar um frame para garantir que os canvas estão renderizados
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  ngOnDestroy() {
    this.disconnect();
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeEmptyData() {
    const now = new Date();
    for (let i = this.maxDataPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3000); // 3 segundos entre pontos
      this.historicalData.push({
        timestamp,
        heartRate: 0,
        systolic: 0,
        diastolic: 0,
        oxygenSaturation: 0,
        temperature: 0,
        respiratoryRate: 0
      });
    }
  }

  initializeCharts() {
    this.createHeartRateChart();
    this.createBloodPressureChart();
    this.createOxygenChart();
    this.createTemperatureChart();
  }

  createHeartRateChart() {
    if (!this.heartRateCanvas) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.historicalData.map(d => d.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        datasets: [{
          label: 'Frequência Cardíaca (BPM)',
          data: this.historicalData.map(d => d.heartRate),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 40,
            max: 180,
            ticks: {
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              color: '#6b7280',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        }
      }
    };

    this.heartRateChart = new Chart(this.heartRateCanvas.nativeElement, config);
  }

  createBloodPressureChart() {
    if (!this.bloodPressureCanvas) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.historicalData.map(d => d.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        datasets: [
          {
            label: 'Sistólica (mmHg)',
            data: this.historicalData.map(d => d.systolic),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Diastólica (mmHg)',
            data: this.historicalData.map(d => d.diastolic),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 50,
            max: 200,
            ticks: {
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              color: '#6b7280',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#374151',
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        }
      }
    };

    this.bloodPressureChart = new Chart(this.bloodPressureCanvas.nativeElement, config);
  }

  createOxygenChart() {
    if (!this.oxygenCanvas) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.historicalData.map(d => d.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        datasets: [{
          label: 'Saturação de O₂ (%)',
          data: this.historicalData.map(d => d.oxygenSaturation),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 85,
            max: 100,
            ticks: {
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              color: '#6b7280',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        }
      }
    };

    this.oxygenChart = new Chart(this.oxygenCanvas.nativeElement, config);
  }

  createTemperatureChart() {
    if (!this.temperatureCanvas) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.historicalData.map(d => d.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        datasets: [{
          label: 'Temperatura (°C)',
          data: this.historicalData.map(d => d.temperature),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 35,
            max: 40,
            ticks: {
              color: '#6b7280',
              callback: (value) => {
                const num = Number(value);
                return !isNaN(num) ? num.toFixed(1) + '°C' : value;
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              color: '#6b7280',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: (context) => {
                const y = context.parsed?.y;
                return y != null ? y.toFixed(1) + '°C' : '0°C';
              }
            }
          }
        }
      }
    };

    this.temperatureChart = new Chart(this.temperatureCanvas.nativeElement, config);
  }

  connect() {
    this.isConnected = true;
    this.connectionStatus = 'Conectando...';
    this.cdr.detectChanges();

    // Simular delay de conexão
    setTimeout(() => {
      this.connectionStatus = 'Conectado';
      this.cdr.detectChanges();
      this.startDataSimulation();
    }, 1500);
  }

  disconnect() {
    this.isConnected = false;
    this.connectionStatus = 'Desconectado';
    this.cdr.detectChanges();
    this.destroy$.next(); // Para todas as subscriptions
  }

  startDataSimulation() {
    // Atualizar dados a cada 3 segundos
    interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isConnected) {
          this.generateNewReading();
        }
      });

    // Gerar primeira leitura imediatamente
    this.generateNewReading();
  }

  generateNewReading() {
    const reading: BiometricReading = {
      timestamp: new Date(),
      heartRate: this.simulateHeartRate(),
      systolic: this.simulateSystolic(),
      diastolic: this.simulateDiastolic(),
      oxygenSaturation: this.simulateOxygenSaturation(),
      temperature: this.simulateTemperature(),
      respiratoryRate: this.simulateRespiratoryRate()
    };

    this.currentReadings = reading;
    this.historicalData.push(reading);

    // Manter apenas os últimos N pontos
    if (this.historicalData.length > this.maxDataPoints) {
      this.historicalData.shift();
    }

    this.updateCharts();
    this.cdr.detectChanges();
  }

  simulateHeartRate(): number {
    const base = this.currentReadings?.heartRate || 75;
    return Math.round(Math.max(50, Math.min(140, base + (Math.random() - 0.5) * 10)));
  }

  simulateSystolic(): number {
    const base = this.currentReadings?.systolic || 120;
    return Math.round(Math.max(90, Math.min(160, base + (Math.random() - 0.5) * 8)));
  }

  simulateDiastolic(): number {
    const base = this.currentReadings?.diastolic || 80;
    return Math.round(Math.max(60, Math.min(100, base + (Math.random() - 0.5) * 6)));
  }

  simulateOxygenSaturation(): number {
    const base = this.currentReadings?.oxygenSaturation || 97;
    return Math.round(Math.max(92, Math.min(100, base + (Math.random() - 0.5) * 2)));
  }

  simulateTemperature(): number {
    const base = this.currentReadings?.temperature || 36.5;
    return Math.max(35.5, Math.min(38.5, base + (Math.random() - 0.5) * 0.3));
  }

  simulateRespiratoryRate(): number {
    const base = this.currentReadings?.respiratoryRate || 16;
    return Math.round(Math.max(12, Math.min(24, base + (Math.random() - 0.5) * 3)));
  }

  updateCharts() {
    const labels = this.historicalData.map(d => 
      d.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );

    if (this.heartRateChart) {
      this.heartRateChart.data.labels = labels;
      this.heartRateChart.data.datasets[0].data = this.historicalData.map(d => d.heartRate);
      this.heartRateChart.update('none'); // Sem animação para atualizações em tempo real
    }

    if (this.bloodPressureChart) {
      this.bloodPressureChart.data.labels = labels;
      this.bloodPressureChart.data.datasets[0].data = this.historicalData.map(d => d.systolic);
      this.bloodPressureChart.data.datasets[1].data = this.historicalData.map(d => d.diastolic);
      this.bloodPressureChart.update('none');
    }

    if (this.oxygenChart) {
      this.oxygenChart.data.labels = labels;
      this.oxygenChart.data.datasets[0].data = this.historicalData.map(d => d.oxygenSaturation);
      this.oxygenChart.update('none');
    }

    if (this.temperatureChart) {
      this.temperatureChart.data.labels = labels;
      this.temperatureChart.data.datasets[0].data = this.historicalData.map(d => d.temperature);
      this.temperatureChart.update('none');
    }
  }

  destroyCharts() {
    this.heartRateChart?.destroy();
    this.bloodPressureChart?.destroy();
    this.oxygenChart?.destroy();
    this.temperatureChart?.destroy();
  }

  getHeartRateStatus(): string {
    if (!this.currentReadings) return 'normal';
    const hr = this.currentReadings.heartRate;
    if (hr < 60 || hr > 100) return 'alert';
    return 'normal';
  }

  getBloodPressureStatus(): string {
    if (!this.currentReadings) return 'normal';
    const sys = this.currentReadings.systolic;
    const dia = this.currentReadings.diastolic;
    if (sys > 140 || dia > 90 || sys < 90 || dia < 60) return 'alert';
    return 'normal';
  }

  getOxygenStatus(): string {
    if (!this.currentReadings) return 'normal';
    const o2 = this.currentReadings.oxygenSaturation;
    if (o2 < 95) return 'alert';
    return 'normal';
  }

  getTemperatureStatus(): string {
    if (!this.currentReadings) return 'normal';
    const temp = this.currentReadings.temperature;
    if (temp > 37.5 || temp < 36.0) return 'alert';
    return 'normal';
  }
}
