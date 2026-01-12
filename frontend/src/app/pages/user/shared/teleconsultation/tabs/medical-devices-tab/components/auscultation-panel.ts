import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { IconComponent, IconName } from '@shared/components/atoms/icon/icon';
import { 
  MedicalStreamingService, 
  MediaDeviceInfo,
  AudioAnalysis,
  AuscultationArea 
} from '@app/core/services/medical-streaming.service';
import { MedicalDevicesSyncService } from '@app/core/services/medical-devices-sync.service';

// Posições cardíacas específicas
export type CardiacPosition = 'mitral' | 'aortic' | 'pulmonary' | 'tricuspid' | 'erb';

export interface AuscultationPosition {
  id: CardiacPosition | 'pulmonary-left' | 'pulmonary-right' | 'abdominal';
  label: string;
  area: AuscultationArea;
  description: string;
}

@Component({
  selector: 'app-auscultation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="auscultation-panel">
      <div class="panel-header">
        <h4>
          <app-icon name="mic" [size]="20" />
          Ausculta Digital (Lagosta v2)
        </h4>
        <span class="stream-status" [class]="getStatusClass()">
          <span class="status-dot"></span>
          {{ getStatusText() }}
        </span>
      </div>

      <!-- Log Visual de Debug -->
      @if (debugLogs.length > 0) {
        <div class="debug-log-panel">
          <div class="debug-header">
            <strong>📋 Log de Conexão</strong>
            <button class="btn-clear-log" (click)="clearDebugLogs()">Limpar</button>
          </div>
          <div class="debug-content">
            @for (log of debugLogs; track log.time) {
              <div class="log-entry" [class]="log.type">
                <span class="log-time">{{ log.time }}</span>
                <span class="log-msg">{{ log.message }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Seleção de área -->
      <div class="area-selector">
        <label>Área de Ausculta:</label>
        <div class="area-buttons">
          @for (area of areas; track area.id) {
            <button 
              class="area-btn"
              [class.active]="selectedArea === area.id"
              (click)="selectArea(area.id)"
              [disabled]="isStreaming">
              <app-icon [name]="area.icon" [size]="18" />
              {{ area.label }}
            </button>
          }
        </div>
      </div>

      <!-- Posições específicas para área cardíaca -->
      @if (selectedArea === 'cardiac') {
        <div class="position-selector">
          <label>Posição Cardíaca:</label>
          <div class="position-buttons">
            @for (pos of cardiacPositions; track pos.id) {
              <button 
                class="position-btn"
                [class.active]="selectedPosition === pos.id"
                (click)="selectPosition(pos.id)"
                [disabled]="isStreaming"
                [title]="pos.description">
                {{ pos.label }}
              </button>
            }
          </div>
          <div class="position-info" *ngIf="selectedPositionInfo">
            <app-icon name="info" [size]="14" />
            <span>{{ selectedPositionInfo.description }}</span>
          </div>
        </div>
      }

      <!-- Posições para área pulmonar -->
      @if (selectedArea === 'pulmonary') {
        <div class="position-selector">
          <label>Lado:</label>
          <div class="position-buttons">
            <button 
              class="position-btn"
              [class.active]="selectedPosition === 'pulmonary-left'"
              (click)="selectPosition('pulmonary-left')"
              [disabled]="isStreaming">
              Esquerdo
            </button>
            <button 
              class="position-btn"
              [class.active]="selectedPosition === 'pulmonary-right'"
              (click)="selectPosition('pulmonary-right')"
              [disabled]="isStreaming">
              Direito
            </button>
          </div>
        </div>
      }

      <!-- Seleção de dispositivo + Botão Iniciar na mesma linha -->
      <div class="device-control-row">
        <div class="device-selector compact">
          <label>Estetoscópio:</label>
          <div class="device-row">
            <select [(ngModel)]="selectedDeviceId" [disabled]="isAuscultationActive" (change)="onDeviceChange()">
              <option value="">Selecione</option>
              @for (device of audioDevices; track device.deviceId) {
                <option [value]="device.deviceId">{{ device.label }}</option>
              }
            </select>
            <button class="btn-refresh" (click)="refreshDevices()" [disabled]="isAuscultationActive" title="Atualizar">
              <app-icon name="refresh-cw" [size]="14" />
            </button>
          </div>
        </div>
        
        <!-- Botão de controle principal -->
        <div class="main-control compact">
          @if (!isAuscultationActive) {
            <button 
              class="btn-start"
              [disabled]="!selectedDeviceId"
              (click)="startAuscultationPreview()">
              <app-icon name="play" [size]="18" />
              Iniciar
            </button>
          } @else {
            <button class="btn-stop" (click)="stopAuscultationPreview()">
              <app-icon name="square" [size]="18" />
              Parar
            </button>
          }
        </div>
      </div>
      
      @if (deviceError) {
        <div class="device-error">
          <app-icon name="alert-triangle" [size]="14" />
          {{ deviceError }}
        </div>
      }

      <!-- Controles adicionais quando ativo -->
      @if (isAuscultationActive) {
        <div class="active-controls-bar">
          @if (!isStreaming) {
            <button 
              class="btn-transmit"
              [disabled]="!appointmentId"
              (click)="startTransmissionToDoctor()">
              <app-icon name="cast" [size]="16" />
              Transmitir ao Médico
            </button>
          } @else {
            <button class="btn-transmit active" (click)="stopTransmissionToDoctor()">
              <app-icon name="cast" [size]="16" />
              Parar Transmissão
            </button>
          }
          @if (!isRecording) {
            <button class="btn-record" (click)="startRecording()" title="Gravar">
              <app-icon name="circle" [size]="16" />
            </button>
          } @else {
            <button class="btn-record recording" (click)="stopRecording()" title="Parar gravação">
              <app-icon name="square" [size]="16" />
            </button>
          }
          <div class="time-badge">{{ formatTime(auscultationDuration) }}</div>
        </div>
      }

      <!-- Visualização do áudio com waveform -->
      <div class="audio-visualization" [class.active]="isAuscultationActive" [class.transmitting]="isStreaming">
        <div class="viz-header">
          <span class="viz-title">
            @if (isStreaming) {
              <span class="live-badge transmitting">TRANSMITINDO</span>
            } @else if (isAuscultationActive) {
              <span class="live-badge">ESCUTANDO</span>
            }
            {{ getCurrentPositionLabel() }}
          </span>
        </div>
        
        <div class="waveform-container">
          <canvas #waveformCanvas class="waveform-canvas"></canvas>
          @if (!isAuscultationActive) {
            <div class="waveform-placeholder">
              <span>Selecione o dispositivo e clique em Iniciar</span>
            </div>
          }
        </div>
        
        <div class="audio-meters">
          <div class="meter">
            <span class="meter-label">VOL</span>
            <div class="meter-bar">
              <div class="meter-fill" [style.width.%]="audioLevel * 100" [class.high]="audioLevel > 0.7" [class.medium]="audioLevel > 0.3 && audioLevel <= 0.7"></div>
            </div>
            <span class="meter-value">{{ (audioLevel * 100).toFixed(0) }}%</span>
          </div>
          <div class="meter">
            <span class="meter-label">Hz</span>
            <span class="meter-value frequency">{{ frequency.toFixed(0) }}</span>
          </div>
          <div class="meter">
            <span class="meter-label">BPM</span>
            <span class="meter-value bpm">{{ estimatedBPM }}</span>
          </div>
          @if (isAuscultationActive) {
            <div class="volume-control">
              <button class="btn-icon-sm" (click)="toggleLocalAudio()">
                <app-icon [name]="isLocalAudioEnabled ? 'volume-2' : 'volume-x'" [size]="14" />
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                [value]="localVolume"
                (input)="onLocalVolumeChange($event)"
                class="volume-slider-sm" 
                [disabled]="!isLocalAudioEnabled" />
            </div>
          }
        </div>
      </div>
      
      @if (!appointmentId && isAuscultationActive && !isStreaming) {
        <div class="info-banner">
          <app-icon name="info" [size]="14" />
          <span>Entre na videochamada para transmitir ao médico</span>
        </div>
      }

      <!-- Gravações salvas -->
      @if (recordings.length > 0) {
        <div class="recordings-list">
          <h5>
            <app-icon name="folder" [size]="16" />
            Gravações ({{ recordings.length }})
          </h5>
          @for (rec of recordings; track rec.id) {
            <div class="recording-item">
              <div class="rec-info">
                <app-icon name="music" [size]="16" />
                <div class="rec-details">
                  <span class="rec-position">{{ rec.positionLabel }}</span>
                  <span class="rec-meta">{{ rec.duration }}s • {{ formatRecordingTime(rec.timestamp) }}</span>
                </div>
              </div>
              <div class="rec-actions">
                <button class="btn-icon" (click)="playRecording(rec)" title="Reproduzir">
                  <app-icon [name]="playingRecordingId === rec.id ? 'pause' : 'play'" [size]="14" />
                </button>
                <button class="btn-icon" (click)="downloadRecording(rec)" title="Baixar">
                  <app-icon name="download" [size]="14" />
                </button>
                <button class="btn-icon danger" (click)="deleteRecording(rec)" title="Excluir">
                  <app-icon name="trash-2" [size]="14" />
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .auscultation-panel {
      padding: 12px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
    }

    /* Log Visual de Debug */
    .debug-log-panel {
      background: #1a1a2e;
      border: 1px solid #2d2d44;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      max-height: 150px;
      overflow: hidden;
    }

    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: #2d2d44;
      color: #fff;
    }

    .btn-clear-log {
      background: transparent;
      border: 1px solid #666;
      color: #aaa;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
    }

    .debug-content {
      max-height: 110px;
      overflow-y: auto;
      padding: 6px;
    }

    .log-entry {
      display: flex;
      gap: 8px;
      padding: 2px 0;
      border-bottom: 1px solid #2d2d44;
    }

    .log-time {
      color: #888;
      flex-shrink: 0;
    }

    .log-msg {
      color: #ddd;
    }

    .log-entry.success .log-msg { color: #10b981; }
    .log-entry.error .log-msg { color: #ef4444; }
    .log-entry.warning .log-msg { color: #f59e0b; }
    .log-entry.info .log-msg { color: #60a5fa; }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h4 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .stream-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 10px;
        background: var(--bg-secondary);
        color: var(--text-secondary);

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-secondary);
        }

        &.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;

          .status-dot {
            background: #10b981;
            animation: pulse-dot 1.5s infinite;
          }
        }

        &.capturing {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;

          .status-dot {
            background: #ef4444;
            animation: pulse-dot 0.8s infinite;
          }
        }
      }
    }

    .area-selector, .position-selector {
      label {
        display: block;
        font-size: 11px;
        color: var(--text-secondary);
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .area-buttons, .position-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .area-btn {
        flex: 1;
        min-width: 60px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 8px 6px;
        background: var(--bg-secondary);
        border: 2px solid transparent;
        border-radius: 8px;
        font-size: 11px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        &.active {
          border-color: var(--color-primary);
          background: var(--bg-primary-subtle);
          color: var(--color-primary);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .position-btn {
        flex: 1;
        padding: 6px 10px;
        background: var(--bg-secondary);
        border: 2px solid transparent;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;

        &:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        &.active {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .position-info {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
        padding: 6px 10px;
        background: var(--bg-tertiary);
        border-radius: 6px;
        font-size: 11px;
        color: var(--text-secondary);
      }
    }

    /* Linha de dispositivo + botão iniciar */
    .device-control-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .device-selector {
      &.compact {
        flex: 1;
      }

      label {
        display: block;
        font-size: 11px;
        color: var(--text-secondary);
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .device-row {
        display: flex;
        gap: 4px;
      }

      select {
        flex: 1;
        padding: 8px 10px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 13px;
        min-width: 0;

        &:disabled {
          opacity: 0.6;
        }
      }

      .btn-refresh {
        padding: 8px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-secondary);
        cursor: pointer;

        &:hover:not(:disabled) {
          background: var(--bg-tertiary);
          color: var(--color-primary);
        }
      }
    }

    .device-error {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 6px;
      font-size: 11px;
      color: #ef4444;
    }

    /* Botão principal de controle compacto */
    .main-control.compact {
      .btn-start {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        &:disabled {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          cursor: not-allowed;
        }
      }

      .btn-stop {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: #ef4444;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;

        &:hover {
          background: #dc2626;
        }
      }
    }

    /* Barra de controles quando ativo */
    .active-controls-bar {
      display: flex;
      gap: 8px;
      align-items: center;

      .btn-transmit {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid #3b82f6;
        border-radius: 6px;
        color: #3b82f6;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: #3b82f6;
          color: white;
        }

        &.active {
          background: #3b82f6;
          color: white;
          animation: pulse-glow-blue 2s infinite;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-record {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        background: var(--bg-secondary);
        border: 1px solid #ef4444;
        border-radius: 50%;
        color: #ef4444;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        &.recording {
          background: #ef4444;
          color: white;
          animation: recording-pulse 1s infinite;
        }
      }

      .time-badge {
        padding: 4px 8px;
        background: var(--bg-tertiary);
        border-radius: 4px;
        font-size: 11px;
        font-family: monospace;
        color: var(--text-secondary);
      }
    }

    @keyframes pulse-glow-blue {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
      50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
    }

    @keyframes recording-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }

    .audio-visualization {
      flex: 1;
      min-height: 0;
      background: var(--bg-secondary);
      border-radius: 10px;
      padding: 10px;
      border: 2px solid transparent;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;

      &.active {
        border-color: #10b981;
      }

      &.transmitting {
        border-color: #3b82f6;
      }

      .viz-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .viz-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .live-badge {
          padding: 2px 6px;
          background: #10b981;
          color: white;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          animation: pulse 1.5s infinite;

          &.transmitting {
            background: #3b82f6;
          }
        }
      }

      .waveform-container {
        flex: 1;
        min-height: 100px;
        position: relative;
        background: #0a0a0a;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 8px;

        .waveform-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .waveform-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          font-size: 11px;
        }
      }

      .audio-meters {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }

      .meter {
        display: flex;
        align-items: center;
        gap: 6px;

        .meter-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          min-width: 24px;
        }

        .meter-bar {
          width: 60px;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;

          .meter-fill {
            height: 100%;
            background: #10b981;
            transition: width 0.1s ease;
            border-radius: 3px;

            &.medium {
              background: #f59e0b;
            }

            &.high {
              background: #ef4444;
            }
          }
        }

        .meter-value {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          min-width: 32px;

          &.frequency {
            color: var(--color-primary);
          }

          &.bpm {
            color: #ef4444;
          }
        }
      }

      .volume-control {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;

        .btn-icon-sm {
          padding: 4px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;

          &:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
          }
        }

        .volume-slider-sm {
          width: 60px;
          height: 3px;
          -webkit-appearance: none;
          appearance: none;
          background: var(--bg-tertiary);
          border-radius: 2px;
          cursor: pointer;

          &::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            background: var(--color-primary);
            border-radius: 50%;
            cursor: pointer;
          }

          &:disabled {
            opacity: 0.5;
          }
        }
      }
    }

    .info-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      font-size: 11px;
      color: #3b82f6;
    }

    .live-badge {
      display: inline-block;
      padding: 2px 6px;
      background: #10b981;
      color: white;
      font-size: 9px;
      font-weight: 700;
      border-radius: 3px;
      margin-right: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.transmitting {
        background: #3b82f6;
        animation: pulse-glow 2s infinite;
      }
    }

    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
    }

    .recordings-list {
      padding-top: 16px;
      border-top: 1px solid var(--border-color);

      h5 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px 0;
        font-size: 14px;
        color: var(--text-primary);
      }

      .recording-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: var(--bg-secondary);
        border-radius: 8px;
        margin-bottom: 8px;

        .rec-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rec-details {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .rec-position {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
          }

          .rec-meta {
            font-size: 11px;
            color: var(--text-secondary);
          }
        }

        .rec-actions {
          display: flex;
          gap: 4px;
        }

        .btn-icon {
          padding: 6px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;

          &:hover {
            background: var(--bg-tertiary);
            color: var(--color-primary);
          }

          &.danger:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
          }
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }

    @keyframes recording-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class AuscultationPanelComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() appointmentId: string | null = null;
  @Input() userrole: string = '';
  
  @ViewChild('waveformCanvas') waveformCanvas!: ElementRef<HTMLCanvasElement>;

  // Log visual de debug
  debugLogs: Array<{time: string; message: string; type: 'info' | 'success' | 'error' | 'warning'}> = [];

  // Áreas principais
  areas: Array<{id: AuscultationArea; label: string; icon: IconName}> = [
    { id: 'cardiac' as AuscultationArea, label: 'Cardíaco', icon: 'heart' },
    { id: 'pulmonary' as AuscultationArea, label: 'Pulmonar', icon: 'wind' },
    { id: 'abdominal' as AuscultationArea, label: 'Abdominal', icon: 'circle' }
  ];

  // Posições cardíacas específicas
  cardiacPositions: AuscultationPosition[] = [
    { id: 'mitral', label: 'Mitral', area: 'cardiac', description: '5º espaço intercostal esquerdo, linha hemiclavicular (apex)' },
    { id: 'aortic', label: 'Aórtico', area: 'cardiac', description: '2º espaço intercostal direito, borda esternal' },
    { id: 'pulmonary', label: 'Pulmonar', area: 'cardiac', description: '2º espaço intercostal esquerdo, borda esternal' },
    { id: 'tricuspid', label: 'Tricúspide', area: 'cardiac', description: '4º espaço intercostal esquerdo, borda esternal' },
    { id: 'erb', label: 'Erb', area: 'cardiac', description: '3º espaço intercostal esquerdo, borda esternal' }
  ];

  selectedArea: AuscultationArea = 'cardiac';
  selectedPosition: CardiacPosition | 'pulmonary-left' | 'pulmonary-right' | 'abdominal' = 'mitral';
  selectedDeviceId: string = '';
  audioDevices: MediaDeviceInfo[] = [];
  deviceError: string = '';
  
  isStreaming = false;
  isCapturing = false;
  isRecording = false;
  isTesting = false;
  isAuscultationActive = false; // Novo: indica se ausculta local está ativa
  recordingDuration = 0;
  streamDuration = 0;
  testDuration = 0;
  auscultationDuration = 0; // Novo: tempo de ausculta local
  audioLevel = 0;
  frequency = 0;
  estimatedBPM = 0;
  
  // Controle de áudio local (desabilitado por padrão para evitar feedback)
  isLocalAudioEnabled = false;
  localVolume = 0.5;
  private localAudioElement: HTMLAudioElement | null = null;

  recordings: Array<{
    id: string;
    area: AuscultationArea;
    position: string;
    positionLabel: string;
    duration: number;
    blob: Blob;
    timestamp: Date;
  }> = [];

  playingRecordingId: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  private subscriptions = new Subscription();
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private recordingInterval: any = null;
  private streamInterval: any = null;
  private testInterval: any = null;
  private auscultationInterval: any = null; // Novo: intervalo de ausculta
  private testStream: MediaStream | null = null;
  private localStream: MediaStream | null = null; // Novo: stream local
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private bpmHistory: number[] = [];

  constructor(
    private streamingService: MedicalStreamingService,
    private syncService: MedicalDevicesSyncService
  ) {}

  get selectedPositionInfo(): AuscultationPosition | undefined {
    return this.cardiacPositions.find(p => p.id === this.selectedPosition);
  }

  ngOnInit(): void {
    this.refreshDevices();

    // Verifica se já existe um stream de ausculta ativo (restauração após mudança de aba)
    this.restoreExistingStream();

    // Observa dispositivos de áudio
    this.subscriptions.add(
      this.streamingService.availableAudioDevices$.subscribe(devices => {
        this.audioDevices = devices;
        if (devices.length > 0 && !this.selectedDeviceId) {
          // Prioridade de seleção automática:
          // 1. Dispositivo com "ausculta" no nome
          // 2. Estetoscópio digital ou microfone médico
          // 3. Microfone USB/externo
          // 4. Primeiro dispositivo disponível
          const auscultaDevice = devices.find(d => 
            d.label.toLowerCase().includes('ausculta')
          );
          const stethoscope = devices.find(d => 
            d.label.toLowerCase().includes('steth') || 
            d.label.toLowerCase().includes('medical')
          );
          const externalMic = devices.find(d => 
            d.label.toLowerCase().includes('usb') ||
            d.label.toLowerCase().includes('external')
          );
          
          this.selectedDeviceId = auscultaDevice?.deviceId || 
                                  stethoscope?.deviceId || 
                                  externalMic?.deviceId || 
                                  devices[0].deviceId;
          
          console.log('[Auscultation] Dispositivo selecionado automaticamente:', 
            auscultaDevice?.label || stethoscope?.label || externalMic?.label || devices[0].label);
          
          // AUTO-INICIAR: Se não há stream ativo e temos dispositivo, inicia automaticamente
          if (!this.isAuscultationActive && this.selectedDeviceId) {
            console.log('[Auscultation] Auto-iniciando captura de ausculta...');
            setTimeout(() => this.startAuscultationPreview(), 500);
          }
        }
      })
    );

    // Observa stream de ausculta persistente
    this.subscriptions.add(
      this.syncService.localAuscultationStream$.subscribe(stream => {
        if (stream && !this.localStream) {
          console.log('[Auscultation] Stream persistente detectado, restaurando...');
          this.localStream = stream;
          this.isAuscultationActive = true;
          this.startAuscultationTimer();
        }
      })
    );

    // Observa estado de transmissão
    this.subscriptions.add(
      this.syncService.isAuscultationTransmitting$.subscribe(isTransmitting => {
        this.isStreaming = isTransmitting;
      })
    );

    // Observa logs de debug do serviço de sincronização
    this.subscriptions.add(
      this.syncService.debugLog$.subscribe(log => {
        this.addDebugLog(log.message, log.type);
      })
    );

    // Observa análise de áudio
    this.subscriptions.add(
      this.streamingService.audioAnalysis$.subscribe(analysis => {
        this.audioLevel = analysis.volume;
        this.frequency = analysis.frequency;
        this.isCapturing = analysis.volume > 0.01;
        this.drawWaveform(analysis.waveform);
        this.estimateBPM(analysis.frequency);
      })
    );

    // Observa erros de stream
    this.subscriptions.add(
      this.streamingService.streamError$.subscribe(error => {
        if (error.type === 'auscultation') {
          this.deviceError = error.error;
          this.isStreaming = false;
          this.isCapturing = false;
        }
      })
    );
  }

  ngAfterViewInit(): void {
    if (this.waveformCanvas) {
      const canvas = this.waveformCanvas.nativeElement;
      // Ajusta tamanho do canvas para resolução correta
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      this.canvasCtx = canvas.getContext('2d');
      if (this.canvasCtx) {
        this.canvasCtx.scale(2, 2);
      }
    }
  }

  refreshDevices(): void {
    this.deviceError = '';
    this.streamingService.refreshDeviceList();
  }

  onDeviceChange(): void {
    this.deviceError = '';
  }

  selectArea(area: AuscultationArea): void {
    this.selectedArea = area;
    // Define posição padrão para cada área
    if (area === 'cardiac') {
      this.selectedPosition = 'mitral';
    } else if (area === 'pulmonary') {
      this.selectedPosition = 'pulmonary-left';
    } else {
      this.selectedPosition = 'abdominal';
    }
  }

  selectPosition(position: CardiacPosition | 'pulmonary-left' | 'pulmonary-right' | 'abdominal'): void {
    this.selectedPosition = position;
  }

  getCurrentPositionLabel(): string {
    if (this.selectedArea === 'cardiac') {
      return this.cardiacPositions.find(p => p.id === this.selectedPosition)?.label || '';
    } else if (this.selectedArea === 'pulmonary') {
      return this.selectedPosition === 'pulmonary-left' ? 'Pulmonar Esquerdo' : 'Pulmonar Direito';
    }
    return 'Abdominal';
  }

  getStatusClass(): string {
    if (this.isRecording) return 'capturing';
    if (this.isStreaming) return 'active transmitting';
    if (this.isAuscultationActive && this.isCapturing) return 'active capturing';
    if (this.isAuscultationActive) return 'active';
    return '';
  }

  getStatusText(): string {
    if (this.isRecording) return 'Gravando';
    if (this.isStreaming) return 'Transmitindo ao Médico';
    if (this.isAuscultationActive && this.isCapturing) return 'Capturando';
    if (this.isAuscultationActive) return 'Escutando';
    return 'Parado';
  }

  /**
   * Adiciona log visual para debug
   */
  addDebugLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.debugLogs.unshift({ time, message, type });
    // Mantém apenas os últimos 20 logs
    if (this.debugLogs.length > 20) {
      this.debugLogs.pop();
    }
  }

  clearDebugLogs(): void {
    this.debugLogs = [];
  }

  /**
   * Restaura stream existente (após mudança de aba)
   */
  private restoreExistingStream(): void {
    const existingStream = this.syncService.currentLocalAuscultationStream;
    if (existingStream) {
      console.log('[Auscultation] Restaurando stream existente');
      this.localStream = existingStream;
      this.isAuscultationActive = true;
      this.isStreaming = this.syncService.isAuscultationCurrentlyTransmitting;
      
      // Configura áudio local
      this.setupLocalAudio(existingStream);
      
      // Reconecta ao analisador de áudio
      this.streamingService.reconnectAudioAnalysis(existingStream);
      
      // Reinicia timer
      this.startAuscultationTimer();
    }
  }

  /**
   * Inicia o timer de ausculta
   */
  private startAuscultationTimer(): void {
    if (this.auscultationInterval) {
      clearInterval(this.auscultationInterval);
    }
    this.auscultationInterval = setInterval(() => {
      this.auscultationDuration++;
    }, 1000);
  }

  /**
   * Inicia preview de ausculta local (sem transmitir ao médico)
   */
  async startAuscultationPreview(): Promise<void> {
    // Se já existe stream ativo, não inicia novamente
    if (this.syncService.isAuscultationCurrentlyActive) {
      console.log('[Auscultation] Stream já ativo, ignorando...');
      this.restoreExistingStream();
      return;
    }

    this.deviceError = '';
    this.auscultationDuration = 0;
    this.waveformHistory = []; // Limpa histórico do waveform

    try {
      // Usa apenas o serviço para criar o stream (evita duplicação)
      const session = await this.streamingService.startAuscultation(
        this.selectedDeviceId, 
        this.selectedArea
      );

      if (session) {
        // Guarda referência ao stream do serviço
        this.localStream = session.stream;
        this.isAuscultationActive = true;
        
        // REGISTRA STREAM PERSISTENTE no sync service
        this.syncService.setLocalAuscultationStream(session.stream, false);
        
        // Cria elemento de áudio para ouvir localmente
        this.setupLocalAudio(session.stream);
        
        // Contador de tempo
        this.startAuscultationTimer();

        console.log('[Auscultation] Preview de ausculta iniciado e registrado');
      } else {
        this.deviceError = 'Não foi possível acessar o microfone. Verifique as permissões.';
      }
    } catch (error: any) {
      console.error('[Auscultation] Erro ao iniciar ausculta:', error);
      this.deviceError = `Erro: ${error.message || 'Não foi possível acessar o microfone'}`;
    }
  }

  /**
   * Configura áudio local para o paciente ouvir
   */
  private setupLocalAudio(stream: MediaStream): void {
    // Cria elemento de áudio
    this.localAudioElement = new Audio();
    this.localAudioElement.srcObject = stream;
    this.localAudioElement.volume = this.localVolume;
    
    if (this.isLocalAudioEnabled) {
      this.localAudioElement.play().catch(err => {
        console.warn('[Auscultation] Não foi possível iniciar áudio local:', err);
      });
    }
  }

  /**
   * Para preview de ausculta local
   */
  stopAuscultationPreview(): void {
    // Se estava transmitindo, para a transmissão primeiro
    if (this.isStreaming) {
      this.stopTransmissionToDoctor();
    }
    
    // Se estava gravando, para a gravação
    if (this.isRecording) {
      this.stopRecording();
    }
    
    // Para o serviço de streaming
    this.streamingService.stopStream();
    
    // Para o áudio local
    if (this.localAudioElement) {
      this.localAudioElement.pause();
      this.localAudioElement.srcObject = null;
      this.localAudioElement = null;
    }
    
    // Para o stream local E remove do sync service
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.syncService.setLocalAuscultationStream(null, false);
    
    this.isAuscultationActive = false;
    this.isCapturing = false;
    this.audioLevel = 0;
    this.frequency = 0;
    this.estimatedBPM = 0;
    this.bpmHistory = [];

    if (this.auscultationInterval) {
      clearInterval(this.auscultationInterval);
      this.auscultationInterval = null;
    }

    // Limpa o canvas
    if (this.canvasCtx && this.waveformCanvas) {
      const canvas = this.waveformCanvas.nativeElement;
      this.canvasCtx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }

    console.log('[Auscultation] Preview de ausculta parado');
  }

  /**
   * Inicia transmissão ao médico (WebRTC)
   */
  async startTransmissionToDoctor(): Promise<void> {
    this.addDebugLog('Iniciando transmissão ao médico...', 'info');
    
    if (!this.appointmentId) {
      this.deviceError = 'ID da consulta não definido';
      this.addDebugLog('ERRO: ID da consulta não definido', 'error');
      return;
    }

    if (!this.isAuscultationActive) {
      this.deviceError = 'Inicie a ausculta primeiro';
      this.addDebugLog('ERRO: Ausculta não ativa', 'error');
      return;
    }

    const activeStream = this.streamingService.getActiveStream();
    if (!activeStream) {
      this.deviceError = 'Stream de áudio não disponível';
      this.addDebugLog('ERRO: Stream não disponível', 'error');
      return;
    }

    this.addDebugLog(`Stream OK: ${activeStream.getTracks().length} track(s)`, 'success');

    try {
      // Garante conexão ao hub antes de transmitir
      this.addDebugLog('Conectando ao hub SignalR...', 'info');
      await this.syncService.connect(this.appointmentId);
      this.addDebugLog('✓ Hub conectado!', 'success');
      
      // Inicia streaming via WebRTC
      this.addDebugLog('Enviando oferta WebRTC...', 'info');
      await this.syncService.startStreaming(activeStream, 'auscultation', this.selectedArea);
      this.addDebugLog('✓ Oferta enviada! Aguardando resposta do médico...', 'success');
      this.isStreaming = true;
      
      // Atualiza estado de transmissão no serviço
      this.syncService.setAuscultationTransmitting(true);
      
      // Inicia contador de streaming
      this.streamDuration = 0;
      this.streamInterval = setInterval(() => {
        this.streamDuration++;
      }, 1000);
      
      console.log('[Auscultation] Transmissão ao médico iniciada');
    } catch (error: any) {
      console.error('[Auscultation] Erro ao iniciar transmissão:', error);
      this.deviceError = `Erro ao transmitir: ${error.message}`;
    }
  }

  /**
   * Para transmissão ao médico
   */
  stopTransmissionToDoctor(): void {
    this.syncService.stopStreaming();
    this.isStreaming = false;
    
    // Atualiza estado de transmissão no serviço
    this.syncService.setAuscultationTransmitting(false);
    
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    
    console.log('[Auscultation] Transmissão ao médico parada');
  }

  /**
   * Alterna áudio local (mute/unmute)
   */
  toggleLocalAudio(): void {
    this.isLocalAudioEnabled = !this.isLocalAudioEnabled;
    
    if (this.localAudioElement) {
      if (this.isLocalAudioEnabled) {
        this.localAudioElement.volume = this.localVolume;
        this.localAudioElement.play().catch(() => {});
      } else {
        this.localAudioElement.pause();
      }
    }
  }

  /**
   * Ajusta volume do áudio local
   */
  onLocalVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.localVolume = parseFloat(input.value);
    
    if (this.localAudioElement && this.isLocalAudioEnabled) {
      this.localAudioElement.volume = this.localVolume;
    }
  }

  /**
   * Inicia teste de áudio local (sem transmissão)
   */
  async startAudioTest(): Promise<void> {
    this.deviceError = '';
    this.testDuration = 0;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        },
        video: false
      };

      this.testStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Inicia análise de áudio usando o serviço
      const session = await this.streamingService.startAuscultation(
        this.selectedDeviceId, 
        this.selectedArea
      );

      if (session) {
        this.isTesting = true;
        
        // Contador de tempo
        this.testInterval = setInterval(() => {
          this.testDuration++;
        }, 1000);

        console.log('[Auscultation] Teste de áudio iniciado');
      } else {
        this.deviceError = 'Não foi possível acessar o microfone. Verifique as permissões.';
      }
    } catch (error: any) {
      console.error('[Auscultation] Erro ao iniciar teste:', error);
      this.deviceError = `Erro: ${error.message || 'Não foi possível acessar o microfone'}`;
    }
  }

  /**
   * Para teste de áudio local
   */
  stopAudioTest(): void {
    this.streamingService.stopStream();
    this.isTesting = false;
    this.audioLevel = 0;
    this.frequency = 0;

    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }

    if (this.testStream) {
      this.testStream.getTracks().forEach(track => track.stop());
      this.testStream = null;
    }

    // Limpa o canvas
    if (this.canvasCtx && this.waveformCanvas) {
      const canvas = this.waveformCanvas.nativeElement;
      this.canvasCtx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }

    console.log('[Auscultation] Teste de áudio parado');
  }

  async startAuscultation(): Promise<void> {
    if (!this.appointmentId) {
      this.deviceError = 'ID da consulta não definido';
      return;
    }

    this.deviceError = '';
    this.streamDuration = 0;

    const session = await this.streamingService.startAuscultation(
      this.selectedDeviceId, 
      this.selectedArea
    );

    if (session) {
      this.isStreaming = true;
      
      // Contador de tempo
      this.streamInterval = setInterval(() => {
        this.streamDuration++;
      }, 1000);
      
      // Inicia streaming via WebRTC
      await this.syncService.startStreaming(session.stream, 'auscultation', this.selectedArea);
    } else {
      this.deviceError = 'Não foi possível acessar o dispositivo de áudio. Verifique as permissões do navegador.';
    }
  }

  stopAuscultation(): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    
    this.streamingService.stopStream();
    this.syncService.stopStreaming();
    this.isStreaming = false;
    this.isCapturing = false;
    this.audioLevel = 0;
    this.frequency = 0;
    this.estimatedBPM = 0;
    this.bpmHistory = [];

    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }

    // Limpa o canvas
    if (this.canvasCtx && this.waveformCanvas) {
      const canvas = this.waveformCanvas.nativeElement;
      this.canvasCtx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
  }

  async startRecording(): Promise<void> {
    const stream = this.streamingService.getActiveStream();
    if (!stream) return;

    this.recordingChunks = [];
    this.recordingDuration = 0;

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordingChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
      this.recordings.unshift({
        id: `rec_${Date.now()}`,
        area: this.selectedArea,
        position: this.selectedPosition,
        positionLabel: this.getCurrentPositionLabel(),
        duration: this.recordingDuration,
        blob,
        timestamp: new Date()
      });
    };

    this.mediaRecorder.start();
    this.isRecording = true;

    this.recordingInterval = setInterval(() => {
      this.recordingDuration++;
    }, 1000);
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }
    }
  }

  getAreaLabel(area: AuscultationArea): string {
    return this.areas.find(a => a.id === area)?.label || area;
  }

  playRecording(rec: { id: string; blob: Blob }): void {
    // Para reprodução atual se houver
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    if (this.playingRecordingId === rec.id) {
      this.playingRecordingId = null;
      return;
    }

    const url = URL.createObjectURL(rec.blob);
    this.currentAudio = new Audio(url);
    this.playingRecordingId = rec.id;

    this.currentAudio.onended = () => {
      this.playingRecordingId = null;
      URL.revokeObjectURL(url);
    };

    this.currentAudio.play();
  }

  downloadRecording(rec: { id: string; position: string; blob: Blob }): void {
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ausculta_${rec.position}_${rec.id}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }

  deleteRecording(rec: { id: string }): void {
    const index = this.recordings.findIndex(r => r.id === rec.id);
    if (index > -1) {
      this.recordings.splice(index, 1);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatRecordingTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  private estimateBPM(frequency: number): void {
    // Estima BPM baseado em picos de frequência (simplificado)
    // Frequências cardíacas típicas: 20-200 Hz para sons cardíacos
    if (frequency > 20 && frequency < 200 && this.audioLevel > 0.1) {
      this.bpmHistory.push(frequency);
      if (this.bpmHistory.length > 30) {
        this.bpmHistory.shift();
      }
      
      // Média simples para estabilizar
      const avg = this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length;
      // Conversão aproximada - isso é apenas uma estimativa visual
      this.estimatedBPM = Math.round(Math.min(180, Math.max(40, 60 + avg * 0.5)));
    }
  }

  // Histórico de amostras para traçado contínuo tipo gravador de som
  private waveformHistory: number[] = [];
  private readonly HISTORY_LENGTH = 1500; // Quantidade de pontos no histórico
  private scrollOffset = 0;

  private drawWaveform(waveform: Float32Array): void {
    if (!this.canvasCtx || !this.waveformCanvas) return;

    const canvas = this.waveformCanvas.nativeElement;
    const ctx = this.canvasCtx;
    
    // Ajusta o tamanho do canvas para o tamanho real do elemento
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    
    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    // Adiciona novas amostras ao histórico (subamostragem inteligente)
    const targetSamplesPerFrame = 30;
    const step = Math.max(1, Math.floor(waveform.length / targetSamplesPerFrame));
    for (let i = 0; i < waveform.length; i += step) {
      this.waveformHistory.push(waveform[i]);
    }

    // Mantém o histórico no tamanho máximo
    while (this.waveformHistory.length > this.HISTORY_LENGTH) {
      this.waveformHistory.shift();
    }

    // === FUNDO ===
    // Gradiente de fundo escuro
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0d1117');
    bgGradient.addColorStop(0.5, '#0a0a0a');
    bgGradient.addColorStop(1, '#0d1117');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // === GRADE DE FUNDO (estilo gravador de som / ECG) ===
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 0.5;

    // Linhas horizontais (grade fina)
    const horizontalLines = 8;
    for (let i = 1; i < horizontalLines; i++) {
      const y = (height / horizontalLines) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Linhas verticais (marcadores de tempo - espaçadas a cada ~0.5s visual)
    const verticalSpacing = 40;
    const numVerticalLines = Math.ceil(width / verticalSpacing);
    for (let i = 1; i <= numVerticalLines; i++) {
      const x = i * verticalSpacing;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // === LINHA CENTRAL (eixo 0) ===
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // === DESENHO DO WAVEFORM ===
    if (this.waveformHistory.length < 2) return;

    const pointsToShow = Math.min(this.waveformHistory.length, this.HISTORY_LENGTH);
    const startIndex = this.waveformHistory.length - pointsToShow;
    const pixelsPerPoint = width / pointsToShow;

    // Cor baseada no estado
    const mainColor = this.isRecording ? '#ef4444' : (this.isStreaming ? '#3b82f6' : '#10b981');
    const glowColor = this.isRecording ? 'rgba(239, 68, 68, 0.3)' : 
                      (this.isStreaming ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)');

    // === PREENCHIMENTO (área sob a curva - estilo gravador de som) ===
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    for (let i = 0; i < pointsToShow; i++) {
      const sample = this.waveformHistory[startIndex + i];
      const x = i * pixelsPerPoint;
      const y = centerY - (sample * height * 0.42);
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, centerY);
    ctx.closePath();
    
    // Gradiente de preenchimento
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, glowColor);
    fillGradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
    fillGradient.addColorStop(1, glowColor);
    ctx.fillStyle = fillGradient;
    ctx.fill();

    // === LINHA PRINCIPAL DO WAVEFORM ===
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = mainColor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let i = 0; i < pointsToShow; i++) {
      const sample = this.waveformHistory[startIndex + i];
      const x = i * pixelsPerPoint;
      const y = centerY - (sample * height * 0.42);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // === GLOW EFFECT (brilho suave) ===
    ctx.lineWidth = 3;
    ctx.strokeStyle = glowColor;
    ctx.beginPath();
    for (let i = 0; i < pointsToShow; i++) {
      const sample = this.waveformHistory[startIndex + i];
      const x = i * pixelsPerPoint;
      const y = centerY - (sample * height * 0.42);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // === INDICADOR DE POSIÇÃO (playhead) ===
    const playheadX = width - 3;
    
    // Linha vertical do playhead
    ctx.strokeStyle = this.isRecording ? '#ef4444' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Triângulo indicador no topo
    ctx.fillStyle = this.isRecording ? '#ef4444' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();

    // === ESCALA DE AMPLITUDE (bordas) ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('+1', 4, 12);
    ctx.fillText('0', 4, centerY + 3);
    ctx.fillText('-1', 4, height - 4);
  }

  ngOnDestroy(): void {
    // NÃO paramos a ausculta aqui - ela continua ativa no serviço
    // Apenas limpamos recursos locais do componente
    console.log('[Auscultation] ngOnDestroy - mantendo stream ativo no serviço');
    
    this.stopAudioTest();
    this.subscriptions.unsubscribe();
    
    // Limpa timer local (o timer será restaurado quando o componente for recriado)
    if (this.auscultationInterval) {
      clearInterval(this.auscultationInterval);
      this.auscultationInterval = null;
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    
    // NÃO chamamos stopAuscultation() para manter o stream ativo
  }
}
