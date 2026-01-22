import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, DatePipe, registerLocaleData } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { SearchInputComponent } from '@shared/components/atoms/search-input/search-input';
import { BadgeComponent, BadgeVariant } from '@shared/components/atoms/badge/badge';
import { AppointmentsService, Appointment, AppointmentsFilter, AppointmentStatus, AppointmentType } from '@core/services/appointments.service';
import { SchedulesService, Schedule } from '@core/services/schedules.service';
import { SpecialtiesService, Specialty } from '@core/services/specialties.service';
import { AppointmentDetailsModalComponent } from './appointment-details-modal/appointment-details-modal';
import { PreConsultationDetailsModalComponent } from './pre-consultation-details-modal/pre-consultation-details-modal';
import { ModalService } from '@core/services/modal.service';
import { AuthService } from '@core/services/auth.service';
import { RealTimeService, AppointmentStatusUpdate, EntityNotification } from '@core/services/real-time.service';
import { FilterSelectComponent, FilterOption } from '@shared/components/atoms/filter-select/filter-select';
import { filter, take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

type ViewMode = 'list' | 'calendar';
type CalendarViewMode = 'day' | 'week' | 'month';

interface TimeSlot {
  time: string;
  appointment?: Appointment;
  isPast: boolean;
}

interface WeekDay {
  date: Date;
  name: string;
  appointments: Appointment[];
}

interface MonthDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointmentsCount: number;
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    IconComponent,
    SearchInputComponent,
    BadgeComponent,
    AppointmentDetailsModalComponent,
    PreConsultationDetailsModalComponent,
    FilterSelectComponent
  ],
  providers: [
    DatePipe,
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ],
  templateUrl: './appointments.html',
  styleUrls: ['./appointments.scss']
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  allAppointments: Appointment[] = []; // Store all to count
  loading = false;
  userrole: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT' = 'PATIENT';
  
  // Counts
  counts = {
    all: 0,
    upcoming: 0,
    past: 0,
    Cancelled: 0
  };

  // Filters
  activeTab: 'all' | 'upcoming' | 'past' | 'cancelled' = 'all';
  searchQuery = '';
  sortOrder: 'asc' | 'desc' = 'desc';
  specialtyFilter = '';
  
  // Especialidades
  specialties: Specialty[] = [];
  specialtyOptions: FilterOption[] = [{ value: '', label: 'Todas as especialidades' }];

  // View Mode
  viewMode: ViewMode = 'list';
  calendarViewMode: CalendarViewMode = 'week';
  
  // Calendar State
  currentDate: Date = new Date();
  selectedCalendarDay: Date | null = null;
  showEmptySlots = true;
  weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Schedule data for generating slots
  schedules: Schedule[] = [];

  // Modal
  selectedAppointment: Appointment | null = null;
  isDetailsModalOpen = false;
  isPreConsultationModalOpen = false;

  // Real-time subscriptions
  private realTimeSubscriptions: Subscription[] = [];
  private isBrowser: boolean;

  private appointmentsService = inject(AppointmentsService);
  private schedulesService = inject(SchedulesService);
  private specialtiesService = inject(SpecialtiesService);
  private authService = inject(AuthService);
  private realTimeService = inject(RealTimeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private datePipe = inject(DatePipe);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Carregar especialidades para filtro
    this.loadSpecialties();
    
    // Aguardar até que o usuário esteja autenticado
    this.authService.authState$
      .pipe(
        filter(state => state.isAuthenticated && state.user !== null),
        take(1)
      )
      .subscribe((state) => {
        console.log('[Appointments] Usuário autenticado, carregando consultas');
        console.log('[Appointments] User role:', state.user?.role);
        // Usar o role do usuário autenticado (prioridade)
        if (state.user?.role) {
          this.userrole = state.user.role;
        } else {
          // Fallback para URL
          this.determineuserrole();
        }
        console.log('[Appointments] Final userrole:', this.userrole);
        
        // Envolver em setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.loadAppointments();
          if (this.userrole === 'PROFESSIONAL') {
            this.loadSchedules();
          }
          this.initializeRealTime();
          this.cdr.detectChanges();
        }, 0);
      });
  }
  
  private loadSpecialties(): void {
    this.specialtiesService.getSpecialties({ status: 'Active' }).subscribe({
      next: (response) => {
        this.specialties = response.data;
        this.specialtyOptions = [
          { value: '', label: 'Todas as especialidades' },
          ...this.specialties.map(s => ({ value: s.id, label: s.name }))
        ];
      },
      error: (error) => {
        console.error('[Appointments] Erro ao carregar especialidades:', error);
      }
    });
  }
  
  private initializeRealTime(): void {
    if (!this.isBrowser) return;
    
    this.realTimeService.connect().then(() => {
      // Subscribe to appointment status changes
      const statusSub = this.realTimeService.appointmentStatusChanged$.subscribe(
        (update: AppointmentStatusUpdate) => {
          this.handleAppointmentStatusChange(update);
        }
      );
      this.realTimeSubscriptions.push(statusSub);
      
      // Subscribe to appointment created/updated/deleted
      const entitySub = this.realTimeService.getEntityEvents$('Appointment').subscribe(
        (notification: EntityNotification) => {
          this.handleAppointmentEntityChange(notification);
        }
      );
      this.realTimeSubscriptions.push(entitySub);
    }).catch(error => {
      console.error('[Appointments] Erro ao conectar SignalR:', error);
    });
  }
  
  private handleAppointmentStatusChange(update: AppointmentStatusUpdate): void {
    const index = this.allAppointments.findIndex(a => a.id === update.appointmentId);
    if (index !== -1) {
      // Update status in the local list
      this.allAppointments[index] = {
        ...this.allAppointments[index],
        status: update.newStatus as AppointmentStatus
      };
      this.calculateCounts();
      this.filterAndSortAppointments();
      this.cdr.detectChanges();
    }
  }
  
  private handleAppointmentEntityChange(notification: EntityNotification): void {
    if (notification.action === 'Created') {
      // Reload to get the new appointment
      this.loadAppointments();
    } else if (notification.action === 'Deleted') {
      // Remove from local list
      this.allAppointments = this.allAppointments.filter(a => a.id !== notification.entityId);
      this.calculateCounts();
      this.filterAndSortAppointments();
      this.cdr.detectChanges();
    } else if (notification.action === 'Updated') {
      // Update or reload
      if (notification.data) {
        const index = this.allAppointments.findIndex(a => a.id === notification.entityId);
        if (index !== -1) {
          this.allAppointments[index] = { ...this.allAppointments[index], ...notification.data };
          this.calculateCounts();
          this.filterAndSortAppointments();
          this.cdr.detectChanges();
        }
      } else {
        this.loadAppointments();
      }
    }
  }
  
  ngOnDestroy(): void {
    this.realTimeSubscriptions.forEach(sub => sub.unsubscribe());
  }

  determineuserrole() {
    const url = this.router.url;
    if (url.includes('/patient')) {
      this.userrole = 'PATIENT';
    } else if (url.includes('/professional')) {
      this.userrole = 'PROFESSIONAL';
    } else {
      this.userrole = 'ADMIN';
    }
  }

  loadAppointments() {
    this.loading = true;
    
    // Load all to calculate counts
    this.appointmentsService.getAppointments({}, 1, 1000).subscribe({
      next: (response) => {
        this.allAppointments = response.data;
        this.calculateCounts();
        this.filterAndSortAppointments();
        setTimeout(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Erro ao carregar consultas:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateCounts() {
    const now = new Date();
    this.counts.all = this.allAppointments.length;
    
    this.counts.upcoming = this.allAppointments.filter(a => 
        new Date(a.date) >= now && a.status !== 'Cancelled' && a.status !== 'Completed'
    ).length;

    this.counts.past = this.allAppointments.filter(a => 
        new Date(a.date) < now || a.status === 'Completed'
    ).length;

    this.counts.Cancelled = this.allAppointments.filter(a => 
        a.status === 'Cancelled'
    ).length;
  }

  filterAndSortAppointments() {
    let filtered = [...this.allAppointments];
    const now = new Date();

    // Filter by Tab
    if (this.activeTab === 'upcoming') {
        filtered = filtered.filter(a => new Date(a.date) >= now && a.status !== 'Cancelled' && a.status !== 'Completed');
    } else if (this.activeTab === 'past') {
        filtered = filtered.filter(a => new Date(a.date) < now || a.status === 'Completed');
    } else if (this.activeTab === 'cancelled') {
        filtered = filtered.filter(a => a.status === 'Cancelled');
    }

    // Search
    if (this.searchQuery) {
        const searchLower = this.searchQuery.toLowerCase();
        filtered = filtered.filter(a => 
          a.professionalName?.toLowerCase().includes(searchLower) ||
          a.specialtyName?.toLowerCase().includes(searchLower) ||
          a.patientName?.toLowerCase().includes(searchLower)
        );
    }

    // Filter by Specialty
    if (this.specialtyFilter) {
        filtered = filtered.filter(a => a.specialtyId === this.specialtyFilter);
    }

    this.appointments = filtered;
    this.sortAppointments();
  }

  onTabChange(tab: 'all' | 'upcoming' | 'past' | 'cancelled') {
    this.activeTab = tab;
    this.filterAndSortAppointments();
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.filterAndSortAppointments();
  }

  onSpecialtyFilterChange() {
    this.filterAndSortAppointments();
  }

  toggleSort() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortAppointments();
  }

  sortAppointments() {
    this.appointments.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  // Actions
  openDetails(appointment: Appointment) {
    // Navigate to the details page instead of opening a modal
    this.router.navigate(['/consultas', appointment.id, 'detalhes']);
  }

  closeDetails() {
    this.isDetailsModalOpen = false;
    this.selectedAppointment = null;
  }

  accessConsultation(appointment: Appointment) {
    // Navigate to teleconsultation screen within the app
    this.router.navigate(['/teleconsulta', appointment.id]);
  }

  cancelAppointment(appointment: Appointment) {
    this.modalService.confirm({
      title: 'Cancelar Consulta',
      message: 'Tem certeza que deseja cancelar esta consulta? Essa ação não pode ser desfeita.',
      confirmText: 'Sim, Cancelar',
      cancelText: 'Voltar',
      variant: 'danger'
    }).subscribe(result => {
      if (result.confirmed) {
        this.appointmentsService.cancelAppointment(appointment.id).subscribe(success => {
            if (success) {
                this.loadAppointments(); // Reload list
            }
        });
      }
    });
  }

  scheduleNew() {
    this.router.navigate(['/agendar']);
  }

  goToPreConsultation(appointment: Appointment) {
    this.router.navigate(['/consultas', appointment.id, 'pre-consulta']);
  }

  viewPreConsultation(appointment: Appointment) {
    if (appointment.preConsultationJson) {
      this.selectedAppointment = appointment;
      this.isPreConsultationModalOpen = true;
    } else {
      this.modalService.alert({
        title: 'Aviso',
        message: 'O paciente ainda não preencheu a pré-consulta.',
        variant: 'info'
      });
    }
  }

  closePreConsultationModal() {
    this.isPreConsultationModalOpen = false;
    this.selectedAppointment = null;
  }

  getAppointmentTypeLabel(type: AppointmentType): string {
    const labels: Record<AppointmentType, string> = {
      'FirstVisit': 'Primeira Consulta',
      'Return': 'Retorno',
      'Routine': 'Rotina',
      'Emergency': 'Emergencial',
      'Common': 'Comum',
      'Referral': 'Encaminhamento'
    };
    return labels[type] || 'Consulta';
  }

  getAppointmentTypeVariant(type: AppointmentType): BadgeVariant {
    const variants: Record<AppointmentType, BadgeVariant> = {
      'FirstVisit': 'primary',
      'Return': 'info',
      'Routine': 'success',
      'Emergency': 'error',
      'Common': 'neutral',
      'Referral': 'warning'
    };
    return variants[type] || 'neutral';
  }

  // =============================================
  // Calendar Methods
  // =============================================

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'calendar') {
      this.refreshCalendar();
    }
  }

  setCalendarViewMode(mode: CalendarViewMode): void {
    this.calendarViewMode = mode;
    this.selectedCalendarDay = null;
    this.refreshCalendar();
  }

  navigateCalendar(delta: number): void {
    const date = new Date(this.currentDate);
    
    switch (this.calendarViewMode) {
      case 'day':
        date.setDate(date.getDate() + delta);
        break;
      case 'week':
        date.setDate(date.getDate() + (delta * 7));
        break;
      case 'month':
        date.setMonth(date.getMonth() + delta);
        break;
    }
    
    this.currentDate = date;
    this.selectedCalendarDay = null;
    this.refreshCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.selectedCalendarDay = null;
    this.refreshCalendar();
  }

  refreshCalendar(): void {
    this.cdr.detectChanges();
  }

  getCalendarTitle(): string {
    const options: Intl.DateTimeFormatOptions = { locale: 'pt-BR' } as any;
    
    switch (this.calendarViewMode) {
      case 'day':
        return this.datePipe.transform(this.currentDate, 'EEEE, dd MMMM yyyy', '', 'pt-BR') || '';
      case 'week':
        const weekStart = this.getWeekStart(this.currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const startStr = this.datePipe.transform(weekStart, 'dd MMM', '', 'pt-BR');
        const endStr = this.datePipe.transform(weekEnd, 'dd MMM yyyy', '', 'pt-BR');
        return `${startStr} - ${endStr}`;
      case 'month':
        return this.datePipe.transform(this.currentDate, 'MMMM yyyy', '', 'pt-BR') || '';
      default:
        return '';
    }
  }

  getDayName(date: Date): string {
    return this.datePipe.transform(date, 'EEEE', '', 'pt-BR') || '';
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  selectDay(date: Date): void {
    this.selectedCalendarDay = date;
    this.cdr.detectChanges();
  }

  closeDayDetail(): void {
    this.selectedCalendarDay = null;
  }

  // Get appointments for a specific day
  getDayAppointments(date: Date): Appointment[] {
    const dateStr = this.datePipe.transform(date, 'yyyy-MM-dd');
    return this.allAppointments.filter(apt => {
      const aptDateStr = this.datePipe.transform(apt.date, 'yyyy-MM-dd');
      return aptDateStr === dateStr;
    });
  }

  // Generate time slots for a day
  getDaySlots(date: Date): TimeSlot[] {
    const appointments = this.getDayAppointments(date);
    const slots: TimeSlot[] = [];
    const now = new Date();
    
    // Get schedule config for this day
    const dayOfWeek = date.getDay();
    const schedule = this.schedules[0]; // Use first schedule
    
    if (!schedule) {
      // Fallback: generate slots from 8:00 to 18:00
      for (let hour = 8; hour < 18; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        const slotDate = new Date(date);
        slotDate.setHours(hour, 0, 0, 0);
        
        const appointment = appointments.find(apt => apt.time === time);
        
        if (appointment || this.showEmptySlots) {
          slots.push({
            time,
            appointment,
            isPast: slotDate < now
          });
        }
      }
      return slots;
    }

    // Get day config
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    const dayConfig = schedule.daysConfig?.find(d => d.day === dayName);
    
    if (!dayConfig || !dayConfig.isWorking) {
      return slots;
    }

    const timeRange = dayConfig.timeRange || schedule.globalConfig.timeRange;
    const duration = dayConfig.consultationDuration || schedule.globalConfig.consultationDuration;
    const interval = dayConfig.intervalBetweenConsultations || schedule.globalConfig.intervalBetweenConsultations || 0;

    // Parse time range
    const [startHour, startMin] = timeRange.startTime.split(':').map(Number);
    const [endHour, endMin] = timeRange.endTime.split(':').map(Number);
    const slotDuration = duration + interval;

    // Generate slots
    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime + duration <= endTime) {
      const hour = Math.floor(currentTime / 60);
      const min = currentTime % 60;
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      const slotDate = new Date(date);
      slotDate.setHours(hour, min, 0, 0);
      
      // Check if this is break time
      let isBreak = false;
      const breakTime = dayConfig.breakTime || schedule.globalConfig.breakTime;
      if (breakTime) {
        const [breakStartH, breakStartM] = breakTime.startTime.split(':').map(Number);
        const [breakEndH, breakEndM] = breakTime.endTime.split(':').map(Number);
        const breakStart = breakStartH * 60 + breakStartM;
        const breakEnd = breakEndH * 60 + breakEndM;
        if (currentTime >= breakStart && currentTime < breakEnd) {
          isBreak = true;
        }
      }

      if (!isBreak) {
        const appointment = appointments.find(apt => apt.time === time);
        
        if (appointment || this.showEmptySlots) {
          slots.push({
            time,
            appointment,
            isPast: slotDate < now
          });
        }
      }

      currentTime += slotDuration;
    }

    return slots;
  }

  getSelectedDaySlots(): TimeSlot[] {
    if (!this.selectedCalendarDay) return [];
    return this.getDaySlots(this.selectedCalendarDay);
  }

  // Week view
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  getWeekDays(): WeekDay[] {
    const weekStart = this.getWeekStart(this.currentDate);
    const days: WeekDay[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      
      days.push({
        date,
        name: this.weekDayNames[i],
        appointments: this.getDayAppointments(date)
      });
    }

    return days;
  }

  // Month view
  getMonthDays(): MonthDay[] {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: MonthDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        appointmentsCount: this.getDayAppointments(date).length
      });
    }

    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        appointmentsCount: this.getDayAppointments(date).length
      });
    }

    // Next month padding (to complete 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        appointmentsCount: this.getDayAppointments(date).length
      });
    }

    return days;
  }

  getStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      'Scheduled': 'Agendada',
      'Confirmed': 'Confirmada',
      'InProgress': 'Em Andamento',
      'Completed': 'Realizada',
      'Cancelled': 'Cancelada'
    };
    return labels[status] || status;
  }

  private loadSchedules(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) return;

    this.schedulesService.getScheduleByProfessional(user.id.toString()).subscribe({
      next: (schedules) => {
        this.schedules = Array.isArray(schedules) ? schedules : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Appointments] Error loading schedules:', err);
      }
    });
  }
}
