import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser, registerLocaleData } from '@angular/common';
import { Router } from '@angular/router';
import { SchedulesService, Schedule } from '@app/core/services/schedules.service';
import { AuthService } from '@app/core/services/auth.service';
import { ScheduleDaysPipe } from '@app/core/pipes/schedule-days.pipe';
import { IconComponent } from '@app/shared/components/atoms/icon/icon';
import { ButtonComponent } from '@app/shared/components/atoms/button/button';
import { RealTimeService, EntityNotification } from '@app/core/services/real-time.service';
import { AppointmentsService, Appointment, AppointmentsFilter } from '@app/core/services/appointments.service';
import { filter, take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

type ViewMode = 'config' | 'week' | 'month';

interface DayStats {
  total: number;
  scheduled: number;
  available: number;
}

interface CalendarDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
  isWorkingDay: boolean;
  isCurrentMonth: boolean;
  isFuture: boolean;
  timeSlots: TimeSlot[];
  appointmentsCount: number;
  stats: DayStats;
}

interface TimeSlot {
  time: string;
  dateTime: Date;
  appointment?: Appointment;
  isBreak: boolean;
  isPast: boolean;
}

interface MonthDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWorkingDay: boolean;
  isFuture: boolean;
  appointmentsCount: number;
  appointments: Appointment[];
  stats: DayStats;
}

@Component({
  selector: 'app-my-schedule',
  standalone: true,
  imports: [CommonModule, DatePipe, ScheduleDaysPipe, IconComponent, ButtonComponent],
  providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }],
  templateUrl: './my-schedule.html',
  styleUrl: './my-schedule.scss'
})
export class MyScheduleComponent implements OnInit, OnDestroy {
  schedules: Schedule[] = [];
  isLoading = true;
  viewMode: ViewMode = 'config';
  
  // Calendar view properties
  currentWeekStart: Date = new Date();
  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  monthDays: MonthDay[] = [];
  weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  appointments: Appointment[] = [];
  isLoadingAppointments = false;
  selectedDay: MonthDay | null = null;

  private schedulesService = inject(SchedulesService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private realTimeService = inject(RealTimeService);
  private appointmentsService = inject(AppointmentsService);
  private router = inject(Router);
  private realTimeSubscriptions: Subscription[] = [];
  private isBrowser: boolean;
  private currentUserId?: string;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Aguardar até que o usuário esteja autenticado
    this.authService.authState$
      .pipe(
        filter(state => state.isAuthenticated && state.user !== null),
        take(1)
      )
      .subscribe(() => {
        const user = this.authService.getCurrentUser();
        if (!user?.id) {
          console.error('[MySchedule] Usuário não autenticado');
          this.isLoading = false;
          return;
        }

        this.currentUserId = user.id.toString();
        console.log('[MySchedule] Carregando agenda para usuário:', user.id);
        
        this.loadSchedules();
        
        if (this.isBrowser) {
          this.setupRealTimeSubscriptions();
        }
      });
  }

  ngOnDestroy(): void {
    this.realTimeSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadSchedules(): void {
    if (!this.currentUserId) return;
    
    this.schedulesService.getScheduleByProfessional(this.currentUserId).subscribe({
      next: (schedules) => {
        this.schedules = Array.isArray(schedules) ? schedules : [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[MySchedule] Error loading schedule', err);
        this.schedules = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private setupRealTimeSubscriptions(): void {
    const scheduleEventsSub = this.realTimeService.getEntityEvents$('Schedule').subscribe(
      (notification: EntityNotification) => {
        this.handleScheduleEvent(notification);
      }
    );
    this.realTimeSubscriptions.push(scheduleEventsSub);
  }

  private handleScheduleEvent(notification: EntityNotification): void {
    // Verificar se a atualização é para o usuário atual
    if (notification.data?.professionalId?.toString() === this.currentUserId || 
        this.schedules.some(s => s.id?.toString() === notification.entityId?.toString())) {
      switch (notification.action) {
        case 'Created':
        case 'Updated':
        case 'Deleted':
          this.loadSchedules();
          break;
      }
    }
  }

  getWorkingDays(schedule: Schedule): string {
    const workingDays = schedule.daysConfig
      .filter(d => d.isWorking)
      .map(d => this.getDayLabel(d.day));
    return workingDays.join(', ');
  }

  getTimeRange(schedule: Schedule): string {
    const firstWorkingDay = schedule.daysConfig.find(d => d.isWorking);
    if (firstWorkingDay && firstWorkingDay.customized && firstWorkingDay.timeRange) {
      return `${firstWorkingDay.timeRange.startTime} - ${firstWorkingDay.timeRange.endTime}`;
    }
    return `${schedule.globalConfig.timeRange.startTime} - ${schedule.globalConfig.timeRange.endTime}`;
  }

  getConsultationDuration(schedule: Schedule): number {
    const firstWorkingDay = schedule.daysConfig.find(d => d.isWorking);
    if (firstWorkingDay && firstWorkingDay.customized && firstWorkingDay.consultationDuration) {
      return firstWorkingDay.consultationDuration;
    }
    return schedule.globalConfig.consultationDuration;
  }

  getWorkingDaysWithDetails(schedule: Schedule): any[] {
    return schedule.daysConfig
      .filter(d => d.isWorking)
      .map(d => ({
        day: this.getDayLabel(d.day),
        isCustomized: d.customized || false,
        timeRange: d.customized && d.timeRange ? d.timeRange : schedule.globalConfig.timeRange,
        breakTime: d.customized && d.breakTime ? d.breakTime : schedule.globalConfig.breakTime,
        consultationDuration: d.customized && d.consultationDuration ? d.consultationDuration : schedule.globalConfig.consultationDuration,
        intervalBetweenConsultations: d.customized && d.intervalBetweenConsultations ? d.intervalBetweenConsultations : schedule.globalConfig.intervalBetweenConsultations
      }));
  }

  hasCustomizedDays(schedule: Schedule): boolean {
    return schedule.daysConfig.some(d => d.isWorking && d.customized);
  }

  isScheduleActive(schedule: Schedule): boolean {
    return schedule.status === 'Active';
  }

  getDayLabel(day: string): string {
    const dayLabels: Record<string, string> = {
      'Monday': 'Segunda-feira',
      'Tuesday': 'Terça-feira',
      'Wednesday': 'Quarta-feira',
      'Thursday': 'Quinta-feira',
      'Friday': 'Sexta-feira',
      'Saturday': 'Sábado',
      'Sunday': 'Domingo'
    };
    return dayLabels[day] || day;
  }

  // Calendar view methods
  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.selectedDay = null;
    if (mode === 'week') {
      this.initializeWeekCalendar();
    } else if (mode === 'month') {
      this.initializeMonthCalendar();
    }
  }

  private initializeWeekCalendar(): void {
    this.setCurrentWeekToToday();
    this.loadWeekAppointments();
  }

  private initializeMonthCalendar(): void {
    this.currentMonth = new Date();
    this.currentMonth.setDate(1);
    this.loadMonthAppointments();
  }

  private setCurrentWeekToToday(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    this.currentWeekStart = new Date(today);
    this.currentWeekStart.setDate(today.getDate() - dayOfWeek);
    this.currentWeekStart.setHours(0, 0, 0, 0);
    this.generateCalendarDays();
  }

  changeWeek(direction: number): void {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (direction * 7));
    this.generateCalendarDays();
    this.loadWeekAppointments();
  }

  changeWeekMonth(direction: number): void {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setMonth(this.currentWeekStart.getMonth() + direction);
    this.generateCalendarDays();
    this.loadWeekAppointments();
  }

  goToToday(): void {
    this.setCurrentWeekToToday();
    this.loadWeekAppointments();
  }

  private generateCalendarDays(): void {
    const schedule = this.schedules[0];
    if (!schedule) return;

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workingDaysMap = this.getWorkingDaysMap(schedule);

    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const englishDayName = this.getDayNameInEnglish(dayOfWeek);
      const isWorkingDay = workingDaysMap.has(englishDayName);
      const timeSlots = isWorkingDay ? this.generateTimeSlots(date, schedule, englishDayName) : [];
      
      // Calculate stats
      const stats = this.calculateDayStats(timeSlots);

      days.push({
        date,
        dayName: this.weekDayNames[dayOfWeek],
        dayNumber: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isWorkingDay,
        isCurrentMonth: true,
        isFuture: date >= today,
        timeSlots,
        appointmentsCount: stats.scheduled,
        stats
      });
    }

    this.calendarDays = days;
    this.cdr.detectChanges();
  }

  private calculateDayStats(timeSlots: TimeSlot[]): DayStats {
    const nonBreakSlots = timeSlots.filter(s => !s.isBreak);
    const scheduled = nonBreakSlots.filter(s => s.appointment).length;
    const available = nonBreakSlots.filter(s => !s.appointment && !s.isPast).length;
    return {
      total: nonBreakSlots.length,
      scheduled,
      available
    };
  }

  private getWorkingDaysMap(schedule: Schedule): Map<string, any> {
    const map = new Map();
    schedule.daysConfig.forEach(day => {
      if (day.isWorking) {
        map.set(day.day, day);
      }
    });
    return map;
  }

  private getDayNameInEnglish(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }

  private generateTimeSlots(date: Date, schedule: Schedule, dayName: string): TimeSlot[] {
    const dayConfig = schedule.daysConfig.find(d => d.day === dayName);
    if (!dayConfig || !dayConfig.isWorking) return [];

    const config = dayConfig.customized && dayConfig.timeRange ? dayConfig : null;
    const timeRange = config?.timeRange || schedule.globalConfig.timeRange;
    const duration = config?.consultationDuration || schedule.globalConfig.consultationDuration;
    const interval = config?.intervalBetweenConsultations || schedule.globalConfig.intervalBetweenConsultations;
    const breakTime = config?.breakTime || schedule.globalConfig.breakTime;

    const slots: TimeSlot[] = [];
    const now = new Date();

    const [startHour, startMin] = timeRange.startTime.split(':').map(Number);
    const [endHour, endMin] = timeRange.endTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMin, 0, 0);

    while (currentTime < endTime) {
      const slotDateTime = new Date(currentTime);
      const timeString = currentTime.toTimeString().slice(0, 5);
      
      // Check if slot is in break time
      let isBreak = false;
      if (breakTime) {
        const [breakStartH, breakStartM] = breakTime.startTime.split(':').map(Number);
        const [breakEndH, breakEndM] = breakTime.endTime.split(':').map(Number);
        const breakStart = breakStartH * 60 + breakStartM;
        const breakEnd = breakEndH * 60 + breakEndM;
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        isBreak = currentMinutes >= breakStart && currentMinutes < breakEnd;
      }

      const isPast = slotDateTime < now;
      
      // Find appointment for this slot
      const appointment = this.appointments.find(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === slotDateTime.toDateString() && apt.time === timeString;
      });

      slots.push({
        time: timeString,
        dateTime: slotDateTime,
        appointment,
        isBreak,
        isPast
      });

      // Move to next slot
      currentTime.setMinutes(currentTime.getMinutes() + duration + interval);
    }

    return slots;
  }

  private loadWeekAppointments(): void {
    if (!this.currentUserId) return;

    this.isLoadingAppointments = true;

    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const filter: AppointmentsFilter = {
      professionalId: this.currentUserId,
      startDate: this.currentWeekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0]
    };

    this.appointmentsService.getAppointments(filter, 1, 100).subscribe({
      next: (response) => {
        this.appointments = response.data || [];
        this.isLoadingAppointments = false;
        this.generateCalendarDays();
      },
      error: (err) => {
        console.error('[MySchedule] Error loading appointments', err);
        this.appointments = [];
        this.isLoadingAppointments = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Month view methods
  changeMonth(direction: number): void {
    this.currentMonth = new Date(this.currentMonth);
    this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
    this.selectedDay = null;
    this.loadMonthAppointments();
  }

  goToCurrentMonth(): void {
    this.currentMonth = new Date();
    this.currentMonth.setDate(1);
    this.selectedDay = null;
    this.loadMonthAppointments();
  }

  private loadMonthAppointments(): void {
    if (!this.currentUserId) return;

    this.isLoadingAppointments = true;

    const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);

    const filter: AppointmentsFilter = {
      professionalId: this.currentUserId,
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0]
    };

    this.appointmentsService.getAppointments(filter, 1, 200).subscribe({
      next: (response) => {
        this.appointments = response.data || [];
        this.isLoadingAppointments = false;
        this.generateMonthDays();
      },
      error: (err) => {
        console.error('[MySchedule] Error loading month appointments', err);
        this.appointments = [];
        this.isLoadingAppointments = false;
        this.cdr.detectChanges();
      }
    });
  }

  private generateMonthDays(): void {
    const schedule = this.schedules[0];
    if (!schedule) return;

    const days: MonthDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the first week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // End on Saturday of the last week
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const workingDaysMap = this.getWorkingDaysMap(schedule);

    const current = new Date(startDate);
    while (current <= endDate) {
      const date = new Date(current);
      const dayOfWeek = date.getDay();
      const englishDayName = this.getDayNameInEnglish(dayOfWeek);
      const isWorkingDay = workingDaysMap.has(englishDayName);
      const isCurrentMonth = date.getMonth() === month;
      const isFuture = date >= today;

      // Find appointments for this day
      const dayAppointments = this.appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === date.toDateString();
      });

      // Calculate stats for this day
      const timeSlots = isWorkingDay && isCurrentMonth ? this.generateTimeSlots(date, schedule, englishDayName) : [];
      const stats = this.calculateDayStats(timeSlots);

      days.push({
        date,
        dayNumber: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        isCurrentMonth,
        isWorkingDay,
        isFuture,
        appointmentsCount: dayAppointments.length,
        appointments: dayAppointments,
        stats
      });

      current.setDate(current.getDate() + 1);
    }

    this.monthDays = days;
    this.cdr.detectChanges();
  }

  selectDay(day: MonthDay): void {
    if (!day.isCurrentMonth) return;
    this.selectedDay = this.selectedDay?.date.getTime() === day.date.getTime() ? null : day;
  }

  getMonthYearDisplay(): string {
    return this.currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  getSelectedDayTimeSlots(): TimeSlot[] {
    if (!this.selectedDay || !this.schedules[0]) return [];
    
    const schedule = this.schedules[0];
    const dayOfWeek = this.selectedDay.date.getDay();
    const englishDayName = this.getDayNameInEnglish(dayOfWeek);
    
    return this.generateTimeSlots(this.selectedDay.date, schedule, englishDayName);
  }

  getWeekRangeDisplay(): string {
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startDay = this.currentWeekStart.getDate();
    const endDay = weekEnd.getDate();
    const startMonth = this.currentWeekStart.toLocaleDateString('pt-BR', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('pt-BR', { month: 'short' });
    const year = this.currentWeekStart.getFullYear();

    if (this.currentWeekStart.getMonth() === weekEnd.getMonth()) {
      return `${startDay} - ${endDay} de ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  }

  getAppointmentStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'Scheduled': 'status-scheduled',
      'Confirmed': 'status-confirmed',
      'InProgress': 'status-in-progress',
      'Completed': 'status-completed',
      'Cancelled': 'status-cancelled',
      'NoShow': 'status-no-show'
    };
    return statusClasses[status] || '';
  }

  getAppointmentStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'Scheduled': 'Agendado',
      'Confirmed': 'Confirmado',
      'InProgress': 'Em Andamento',
      'Completed': 'Finalizado',
      'Cancelled': 'Cancelado',
      'NoShow': 'Não Compareceu'
    };
    return statusLabels[status] || status;
  }

  // Week totals
  getWeekTotalSlots(): number {
    return this.calendarDays.reduce((sum, day) => sum + day.stats.total, 0);
  }

  getWeekScheduledSlots(): number {
    return this.calendarDays.reduce((sum, day) => sum + day.stats.scheduled, 0);
  }

  getWeekAvailableSlots(): number {
    return this.calendarDays.reduce((sum, day) => sum + day.stats.available, 0);
  }

  // Navigation to appointment details
  navigateToAppointment(appointment: Appointment, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (appointment?.id) {
      this.router.navigate(['/consultas', appointment.id, 'detalhes']);
    }
  }

  onSlotClick(slot: TimeSlot, event?: Event): void {
    if (slot.appointment) {
      this.navigateToAppointment(slot.appointment, event);
    }
  }
}
