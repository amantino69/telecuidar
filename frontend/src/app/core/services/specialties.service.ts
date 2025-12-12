import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export type SpecialtyStatus = 'active' | 'inactive';

export interface CustomField {
  name: string;
  type: 'text' | 'number' | 'checkbox' | 'radio' | 'date' | 'select' | 'textarea';
  options?: string[]; // For radio and select
  required?: boolean;
  description?: string;
  defaultValue?: any;
  order?: number;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  status: SpecialtyStatus;
  createdAt: string;
  customFields?: CustomField[];
}

export interface SpecialtiesFilter {
  search?: string;
  status?: SpecialtyStatus | 'all';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SpecialtiesSortOptions {
  field: keyof Specialty;
  direction: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class SpecialtiesService {
  private mockSpecialties: Specialty[] = [
    {
      id: '1',
      name: 'Cardiologia',
      description: 'Especialidade médica que se dedica ao diagnóstico e tratamento das doenças do coração',
      status: 'active',
      createdAt: '2024-01-15T10:00:00'
    },
    {
      id: '2',
      name: 'Dermatologia',
      description: 'Especialidade médica que trata das doenças da pele, mucosas, cabelos e unhas',
      status: 'active',
      createdAt: '2024-02-20T14:30:00'
    },
    {
      id: '3',
      name: 'Pediatria',
      description: 'Especialidade médica dedicada à assistência à criança e ao adolescente',
      status: 'active',
      createdAt: '2024-03-10T09:15:00'
    },
    {
      id: '4',
      name: 'Ortopedia',
      description: 'Especialidade médica que cuida do sistema locomotor',
      status: 'active',
      createdAt: '2024-04-05T16:45:00'
    },
    {
      id: '5',
      name: 'Psiquiatria',
      description: 'Especialidade médica que lida com a prevenção, diagnóstico e tratamento de transtornos mentais',
      status: 'inactive',
      createdAt: '2024-05-12T11:20:00'
    },
    {
      id: '6',
      name: 'Ginecologia',
      description: 'Especialidade médica que trata da saúde do aparelho reprodutor feminino',
      status: 'active',
      createdAt: '2024-06-18T13:00:00'
    },
    {
      id: '7',
      name: 'Oftalmologia',
      description: 'Especialidade médica que estuda e trata as doenças relacionadas aos olhos',
      status: 'active',
      createdAt: '2024-07-22T15:30:00'
    },
    {
      id: '8',
      name: 'Neurologia',
      description: 'Especialidade médica que trata dos distúrbios do sistema nervoso',
      status: 'active',
      createdAt: '2024-08-08T10:45:00'
    }
  ];

  getSpecialties(
    filter: SpecialtiesFilter = {},
    sort: SpecialtiesSortOptions = { field: 'name', direction: 'asc' },
    page: number = 1,
    pageSize: number = 10
  ): Observable<PaginatedResponse<Specialty>> {
    return of(this.mockSpecialties).pipe(
      delay(500),
      map(specialties => {
        let filtered = [...specialties];

        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          filtered = filtered.filter(specialty =>
            specialty.name.toLowerCase().includes(searchLower) ||
            specialty.description.toLowerCase().includes(searchLower) ||
            specialty.id.includes(searchLower)
          );
        }

        if (filter.status && filter.status !== 'all') {
          filtered = filtered.filter(specialty => specialty.status === filter.status);
        }

        const sorted = filtered.sort((a, b) => {
          const aValue = a[sort.field];
          const bValue = b[sort.field];

          if (aValue === undefined || bValue === undefined) return 0;
          
          if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
          return 0;
        });

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = sorted.slice(startIndex, endIndex);

        return {
          data: paginatedData,
          total: sorted.length,
          page,
          pageSize,
          totalPages: Math.ceil(sorted.length / pageSize)
        };
      })
    );
  }

  getSpecialtyById(id: string): Observable<Specialty | undefined> {
    return of(this.mockSpecialties.find(specialty => specialty.id === id)).pipe(delay(300));
  }

  createSpecialty(specialty: Omit<Specialty, 'id' | 'createdAt'>): Observable<Specialty> {
    const newSpecialty: Specialty = {
      ...specialty,
      id: (this.mockSpecialties.length + 1).toString(),
      createdAt: new Date().toISOString()
    };
    
    this.mockSpecialties = [newSpecialty, ...this.mockSpecialties];
    return of(newSpecialty).pipe(delay(500));
  }

  updateSpecialty(id: string, updates: Partial<Specialty>): Observable<Specialty> {
    const index = this.mockSpecialties.findIndex(s => s.id === id);
    if (index !== -1) {
      this.mockSpecialties[index] = { ...this.mockSpecialties[index], ...updates };
      return of(this.mockSpecialties[index]).pipe(delay(500));
    }
    throw new Error('Especialidade não encontrada');
  }

  deleteSpecialty(id: string): Observable<void> {
    this.mockSpecialties = this.mockSpecialties.filter(s => s.id !== id);
    return of(void 0).pipe(delay(500));
  }

  toggleSpecialtyStatus(id: string): Observable<Specialty> {
    const specialty = this.mockSpecialties.find(s => s.id === id);
    if (specialty) {
      specialty.status = specialty.status === 'active' ? 'inactive' : 'active';
      return of(specialty).pipe(delay(500));
    }
    throw new Error('Especialidade não encontrada');
  }
}
