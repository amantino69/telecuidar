import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { BiometricsTabComponent } from '../tabs/biometrics-tab/biometrics-tab';
import { AttachmentsChatTabComponent } from '../tabs/attachments-chat-tab/attachments-chat-tab';
import { SoapTabComponent } from '../tabs/soap-tab/soap-tab';
import { ConclusionTabComponent } from '../tabs/conclusion-tab/conclusion-tab';
import { PatientDataTabComponent } from '../tabs/patient-data-tab/patient-data-tab';
import { PreConsultationDataTabComponent } from '../tabs/pre-consultation-data-tab/pre-consultation-data-tab';
import { AnamnesisTabComponent } from '../tabs/anamnesis-tab/anamnesis-tab';
import { SpecialtyFieldsTabComponent } from '../tabs/specialty-fields-tab/specialty-fields-tab';
import { IotTabComponent } from '../tabs/iot-tab/iot-tab';
import { AITabComponent } from '../tabs/ai-tab/ai-tab';
import { CnsTabComponent } from '../tabs/cns-tab/cns-tab';
import { ReceitaTabComponent } from '../tabs/receita-tab/receita-tab';
import { AtestadoTabComponent } from '../tabs/atestado-tab/atestado-tab';
import { ReturnTabComponent } from './../tabs/return-tab/return-tab';
import { ReferralTabComponent } from './../tabs/referral-tab/referral-tab';
import { PhonocardiogramTabComponent } from '../tabs/phonocardiogram-tab/phonocardiogram-tab.component';
import { MedicalDevicesTabComponent } from '../tabs/medical-devices-tab/medical-devices-tab';
// AuscultationTabComponent removido do sistema
// ExamCameraTabComponent removido do sistema
// DeviceSettingsTabComponent removido do sistema
import { DictationService } from '@core/services/dictation.service';
import { Appointment } from '@core/services/appointments.service';
import { Subject, takeUntil } from 'rxjs';
import { getTeleconsultationTabGroups, type TabGroup } from '../tabs/tab-config';

@Component({
  selector: 'app-teleconsultation-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    BiometricsTabComponent,
    AttachmentsChatTabComponent,
    SoapTabComponent,
    ConclusionTabComponent,
    PatientDataTabComponent,
    PreConsultationDataTabComponent,
    AnamnesisTabComponent,
    SpecialtyFieldsTabComponent,
    IotTabComponent,
    AITabComponent,
    CnsTabComponent,
    ReceitaTabComponent,
    AtestadoTabComponent,
    ReturnTabComponent,
    ReferralTabComponent,
    PhonocardiogramTabComponent,
    MedicalDevicesTabComponent
    // AuscultationTabComponent, ExamCameraTabComponent e DeviceSettingsTabComponent removidos
  ],
  templateUrl: './teleconsultation-sidebar.html',
  styleUrls: ['./teleconsultation-sidebar.scss']
})
export class TeleconsultationSidebarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() isFullScreen = false;
  @Input() isHeaderVisible = true;
  @Input() tabs: string[] = [];
  @Input() activeTab = '';
  @Input() userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';
  @Input() appointmentId: string | null = null;
  @Input() appointment: Appointment | null = null;
  
  // Data inputs for AI tab
  @Input() patientData: any = null;
  @Input() preConsultationData: any = null;
  @Input() anamnesisData: any = null;
  @Input() biometricsData: any = null;
  @Input() soapData: any = null;
  @Input() specialtyFieldsData: any = null;

  @Output() toggle = new EventEmitter<void>();
  @Output() toggleMode = new EventEmitter<void>();
  @Output() toggleHeader = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<string>();
  @Output() finishConsultation = new EventEmitter<string>();

  isDictationActive = false;
  isListening = false;
  private destroy$ = new Subject<void>();

  // Sistema de grupos de tabs
  tabGroups: TabGroup[] = [];
  activeGroup: 'exame-fisico' | 'documentos' | 'standalone' | null = null;
  standaloneTabsVisible: { [key: string]: boolean } = {};

  constructor(private dictationService: DictationService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userrole']) {
      this.loadTabGroups();
    }
    if (changes['tabs'] || changes['activeTab'] || changes['appointment'] || changes['isOpen']) {
      try {
        this.cdr.detectChanges();
      } catch (e) {
        // ignore
      }
    }
  }

  ngOnInit() {
    this.loadTabGroups();
    
    this.dictationService.isDictationActive$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isActive => this.isDictationActive = isActive);

    this.dictationService.isListening$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isListening => this.isListening = isListening);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTabGroups() {
    this.tabGroups = getTeleconsultationTabGroups(this.userrole);
    
    // Abre o primeiro grupo por padrão
    if (this.tabGroups.length > 0 && !this.activeGroup) {
      const firstGroupWithTabs = this.tabGroups.find(g => g.tabs.length > 0);
      if (firstGroupWithTabs) {
        this.activeGroup = firstGroupWithTabs.id;
        // Ativa primeira tab do primeiro grupo
        if (firstGroupWithTabs.tabs.length > 0) {
          this.onTabChange(firstGroupWithTabs.tabs[0].label);
        }
      }
    }
  }

  setActiveGroup(groupId: 'exame-fisico' | 'documentos' | 'standalone') {
    this.activeGroup = this.activeGroup === groupId ? null : groupId;
    
    // Se abriu um grupo, ativa a primeira tab
    if (this.activeGroup) {
      const group = this.tabGroups.find(g => g.id === groupId);
      if (group && group.tabs.length > 0) {
        this.onTabChange(group.tabs[0].label);
      }
    }
  }

  isTabActive(tabLabel: string): boolean {
    return this.activeTab === tabLabel;
  }

  getStandaloneGroup(): TabGroup | undefined {
    return this.tabGroups.find(g => g.id === 'standalone');
  }

  getGroupedTabs(): TabGroup[] {
    return this.tabGroups.filter(g => g.id !== 'standalone');
  }

  getActiveGroupTabs(): any[] {
    if (!this.activeGroup) return [];
    const group = this.tabGroups.find(g => g.id === this.activeGroup);
    return group?.tabs || [];
  }

  toggleDictation() {
    this.dictationService.toggleDictation();
  }

  onToggle() {
    this.toggle.emit();
  }

  onToggleMode() {
    this.toggleMode.emit();
  }

  onToggleHeader() {
    this.toggleHeader.emit();
  }

  onTabChange(tab: string) {
    this.tabChange.emit(tab);
  }

  onFinishConsultation(observations: string) {
    this.finishConsultation.emit(observations);
  }
}
