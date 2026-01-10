import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { CnsService, CnsCidadao, CnsTokenStatus } from '@core/services/cns.service';
import { Appointment } from '@core/services/appointments.service';
import { UsersService } from '@core/services/users.service';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-cns-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './cns-tab.html',
  styleUrls: ['./cns-tab.scss']
})
export class CnsTabComponent implements OnInit, OnDestroy {
  @Input() appointmentId: string | null = null;
  @Input() appointment: Appointment | null = null;

  // Estado do formulário
  cpf = '';
  loading = false;
  error: string | null = null;
  
  // Dados do cidadão
  cidadao: CnsCidadao | null = null;
  
  // Status do token
  tokenStatus: CnsTokenStatus | null = null;
  tokenLoading = false;
  
  // Status do serviço
  serviceConfigured = true;
  
  private destroy$ = new Subject<void>();

  constructor(
    private cnsService: CnsService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Verificar se o serviço está configurado
    this.checkServiceHealth();
    
    // Carregar status do token ao iniciar
    this.checkTokenStatus();
    
    // Verificar status do token a cada 60 segundos
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkTokenStatus());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Verifica se o serviço CNS está configurado
   */
  checkServiceHealth() {
    this.cnsService.getHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (health) => {
          this.serviceConfigured = health.status === 'configured';
          this.cdr.detectChanges();
        },
        error: () => {
          this.serviceConfigured = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Formata CPF durante digitação
   */
  formatCpfInput(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';
    
    for (let i = 0; i < cleaned.length && i < 11; i++) {
      if (i === 3 || i === 6) formatted += '.';
      if (i === 9) formatted += '-';
      formatted += cleaned[i];
    }
    
    return formatted;
  }

  /**
   * Handler para input do CPF
   */
  onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.cpf = this.formatCpfInput(input.value);
    input.value = this.cpf;
    this.error = null;
  }

  /**
   * Verifica se o CPF é válido para consulta
   */
  get isValidCpf(): boolean {
    return this.cnsService.isValidCpfFormat(this.cpf);
  }

  /**
   * Consulta o CPF no CADSUS
   */
  consultarCpf() {
    if (!this.isValidCpf) {
      this.error = 'Digite um CPF válido com 11 dígitos';
      return;
    }

    this.loading = true;
    this.error = null;
    this.cidadao = null;

    this.cnsService.consultarCpf(this.cpf)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.cidadao = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erro ao consultar CNS:', err);
          this.error = err.error?.message || err.error?.error || 'Erro ao consultar CADSUS. Verifique se o serviço está configurado.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Verifica status do token
   */
  checkTokenStatus() {
    this.cnsService.getTokenStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.tokenStatus = status;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erro ao verificar status do token:', err);
        }
      });
  }

  /**
   * Força renovação do token
   */
  renewToken() {
    this.tokenLoading = true;
    
    this.cnsService.renewToken()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tokenStatus = {
            hasToken: response.hasToken,
            isValid: response.isValid,
            expiresAt: response.expiresAt,
            expiresIn: response.expiresIn,
            expiresInMs: 0
          };
          this.tokenLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erro ao renovar token:', err);
          this.tokenLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Limpa os dados da consulta
   */
  limparDados() {
    this.cidadao = null;
    this.error = null;
  }

  /**
   * Retorna classe CSS para status do cadastro
   */
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'ativo':
        return 'status-active';
      case 'inativo':
        return 'status-inactive';
      case 'pendente':
        return 'status-pending';
      default:
        return '';
    }
  }
}
