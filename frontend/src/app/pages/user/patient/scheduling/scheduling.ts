import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { SearchInputComponent } from '@shared/components/atoms/search-input/search-input';
import { SpecialtiesService, Specialty } from '@core/services/specialties.service';
import { SchedulesService } from '@core/services/schedules.service';
import { UsersService, User } from '@core/services/users.service';

type Step = 'specialty' | 'date' | 'time' | 'professional-selection' | 'confirmation';

interface DayAvailability {
  date: Date;
  slots: number;
  professionalsCount: number;
  available: boolean;
}

interface TimeSlot {
  time: string;
  professionals: User[];
}

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    IconComponent,
    SearchInputComponent
  ],
  templateUrl: './scheduling.html',
  styleUrls: ['./scheduling.scss']
})
export class SchedulingComponent implements OnInit {
  currentStep: Step = 'specialty';
  
  steps: { id: Step, label: string }[] = [
    { id: 'specialty', label: 'Especialidade' },
    { id: 'date', label: 'Data' },
    { id: 'time', label: 'Horário' },
    { id: 'professional-selection', label: 'Profissional' },
    { id: 'confirmation', label: 'Confirmação' }
  ];

  // Step 1: Specialties
  specialties: Specialty[] = [];
  filteredSpecialties: Specialty[] = [];
  selectedSpecialty: Specialty | null = null;
  searchQuery: string = '';

  // Step 2: Date Selection
  currentMonth: Date = new Date();
  calendarDays: DayAvailability[] = [];
  selectedDate: Date | null = null;

  // Step 3: Time & Professional
  availableSlots: TimeSlot[] = [];
  selectedSlot: TimeSlot | null = null;
  selectedProfessional: User | null = null;
  
  // Step 4: Confirmation
  observation: string = '';
  loading: boolean = false;

  constructor(
    private specialtiesService: SpecialtiesService,
    private schedulesService: SchedulesService,
    private usersService: UsersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSpecialties();
  }

  getStepIndex(stepId: Step): number {
    return this.steps.findIndex(s => s.id === stepId);
  }

  // --- Step 1: Specialties ---
  loadSpecialties() {
    this.specialtiesService.getSpecialties({ status: 'active' }).subscribe(response => {
      this.specialties = response.data;
      this.filteredSpecialties = response.data;
    });
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.filteredSpecialties = this.specialties.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  selectSpecialty(specialty: Specialty) {
    this.selectedSpecialty = specialty;
    this.currentStep = 'date';
    this.generateCalendar();
  }

  // --- Step 2: Date ---
  generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    this.calendarDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isAvailable = Math.random() > 0.3 && date >= new Date();
      this.calendarDays.push({
        date: date,
        slots: isAvailable ? Math.floor(Math.random() * 5) + 1 : 0,
        professionalsCount: isAvailable ? Math.floor(Math.random() * 2) + 1 : 0,
        available: isAvailable
      });
    }
  }

  changeMonth(delta: number) {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + delta, 1);
    this.generateCalendar();
  }

  selectDate(day: DayAvailability) {
    if (!day.available) return;
    this.selectedDate = day.date;
    this.loadTimeSlots();
    this.currentStep = 'time';
  }

  // --- Step 3: Time & Professional ---
  loadTimeSlots() {
    const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    
    // Create mock professionals
    const mockPro1: User = {
      id: '2',
      name: 'Dr. Maria Santos',
      email: 'maria.santos@email.com',
      role: 'professional',
      cpf: '234.567.890-11',
      phone: '(11) 98765-4322',
      status: 'active',
      createdAt: '2024-02-20T14:30:00',
      specialtyId: this.selectedSpecialty?.id || '1',
      avatar: 'assets/avatars/maria.jpg' // Mock
    };

    const mockPro2: User = {
      id: '5',
      name: 'Dr. Carlos Ferreira',
      email: 'carlos.ferreira@email.com',
      role: 'professional',
      cpf: '567.890.123-44',
      phone: '(11) 98765-4325',
      status: 'active',
      createdAt: '2024-05-12T11:20:00',
      specialtyId: this.selectedSpecialty?.id || '1'
    };

    this.availableSlots = times.map(time => {
        // Randomly assign 1 or 2 professionals to simulate choice
        const professionals = Math.random() > 0.5 ? [mockPro1] : [mockPro1, mockPro2];
        return {
            time,
            professionals
        };
    });
  }

  selectSlot(slot: TimeSlot) {
    this.selectedSlot = slot;
    if (slot.professionals.length === 1) {
      this.selectedProfessional = slot.professionals[0];
      this.currentStep = 'confirmation';
    } else {
      this.currentStep = 'professional-selection';
    }
  }

  selectProfessional(professional: User) {
    this.selectedProfessional = professional;
    this.currentStep = 'confirmation';
  }

  // --- Step 4: Confirmation ---
  confirmScheduling() {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.router.navigate(['/patient/scheduling/success'], { 
        state: { 
          appointment: {
            specialty: this.selectedSpecialty,
            date: this.selectedDate,
            time: this.selectedSlot?.time,
            professional: this.selectedProfessional,
            observation: this.observation
          }
        }
      });
    }, 1500);
  }

  goToStep(step: Step) {
    const stepOrder: Step[] = ['specialty', 'date', 'time', 'professional-selection', 'confirmation'];
    const currentIndex = stepOrder.indexOf(this.currentStep);
    const targetIndex = stepOrder.indexOf(step);

    // Can only navigate backwards or to the immediate next step if data is selected
    if (targetIndex !== -1 && targetIndex < currentIndex) {
      this.currentStep = step;
      this.resetSelectionsFrom(step);
    }
  }

  resetSelectionsFrom(step: Step) {
    if (step === 'specialty') {
      this.selectedSpecialty = null;
      this.selectedDate = null;
      this.selectedSlot = null;
      this.selectedProfessional = null;
    } else if (step === 'date') {
      this.selectedDate = null;
      this.selectedSlot = null;
      this.selectedProfessional = null;
    } else if (step === 'time') {
      this.selectedSlot = null;
      this.selectedProfessional = null;
    } else if (step === 'professional-selection') {
      this.selectedProfessional = null;
    }
  }

  goBack() {
    if (this.currentStep === 'confirmation') {
        // If we came from professional selection (because >1 pro), go back there.
        // If we came from time slot (because 1 pro), go back to time slot.
        if (this.selectedSlot && this.selectedSlot.professionals.length > 1) {
            this.currentStep = 'professional-selection';
        } else {
            this.currentStep = 'time';
            this.selectedProfessional = null;
        }
    } else if (this.currentStep === 'professional-selection') {
        this.currentStep = 'time';
        this.selectedProfessional = null;
        this.selectedSlot = null;
    } else if (this.currentStep === 'time') {
        this.currentStep = 'date';
        this.selectedDate = null;
        this.selectedSlot = null;
    } else if (this.currentStep === 'date') {
        this.currentStep = 'specialty';
        this.selectedSpecialty = null;
    }
  }
}
