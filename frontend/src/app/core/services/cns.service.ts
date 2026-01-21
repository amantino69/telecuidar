import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

/**
 * Interface para dados do cidadão retornados pelo CADSUS/CNS
 */
export interface CnsCidadao {
  // Identificação Principal
  cns: string;
  cpf: string;
  nome: string;
  dataNascimento: string;
  statusCadastro: string;
  
  // Filiação
  nomeMae: string;
  nomePai: string;
  
  // Características
  sexo: string;
  racaCor: string;
  
  // Endereço
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cidade: string;
  codigoCidade: string;
  uf: string;
  paisEnderecoAtual: string;
  cep: string;
  enderecoCompleto: string;
  
  // Naturalidade
  cidadeNascimento: string;
  codigoCidadeNascimento: string;
  paisNascimento: string;
  codigoPaisNascimento: string;
  
  // Contato
  telefones: string[];
  emails: string[];
}

/**
 * Interface para status do token CNS
 */
export interface CnsTokenStatus {
  hasToken: boolean;
  isValid: boolean;
  expiresAt?: string;
  expiresIn?: string;
  expiresInMs: number;
  message?: string;
}

/**
 * Interface para resposta de renovação de token
 */
export interface CnsTokenRenewResponse {
  success: boolean;
  message: string;
  hasToken: boolean;
  isValid: boolean;
  expiresAt?: string;
  expiresIn?: string;
}

/**
 * Interface para health check do serviço CNS
 */
export interface CnsHealthStatus {
  status: 'configured' | 'not_configured';
  message: string;
}

/**
 * Serviço de integração com CADSUS/CNS
 * Consulta dados de cidadãos no Cadastro Nacional de Usuários do SUS
 */
@Injectable({
  providedIn: 'root'
})
export class CnsService {
  private readonly apiUrl = `${API_BASE_URL}/cns`;

  constructor(private http: HttpClient) {}

  /**
   * Consulta dados de um cidadão no CADSUS pelo CPF
   * @param cpf CPF do cidadão (com ou sem formatação)
   */
  consultarCpf(cpf: string): Observable<CnsCidadao> {
    const cleanCpf = cpf.replace(/\D/g, '');
    return this.http.post<CnsCidadao>(`${this.apiUrl}/consultar-cpf`, { cpf: cleanCpf });
  }

  /**
   * Obtém o status do token de autenticação
   */
  getTokenStatus(): Observable<CnsTokenStatus> {
    return this.http.get<CnsTokenStatus>(`${this.apiUrl}/token/status`);
  }

  /**
   * Força a renovação do token de autenticação
   */
  renewToken(): Observable<CnsTokenRenewResponse> {
    return this.http.post<CnsTokenRenewResponse>(`${this.apiUrl}/token/renew`, {});
  }

  /**
   * Verifica se o serviço CNS está configurado
   */
  getHealth(): Observable<CnsHealthStatus> {
    return this.http.get<CnsHealthStatus>(`${this.apiUrl}/health`);
  }

  /**
   * Formata CPF para exibição (XXX.XXX.XXX-XX)
   */
  formatCpf(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9)}`;
  }

  /**
   * Remove formatação do CPF
   */
  cleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  /**
   * Valida se o CPF tem 11 dígitos
   */
  isValidCpfFormat(cpf: string): boolean {
    return cpf.replace(/\D/g, '').length === 11;
  }
}
