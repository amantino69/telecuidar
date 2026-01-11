import type { IconName } from '@shared/components/atoms/icon/icon';

export interface TabConfig {
  id: string;
  label: string;
  icon: IconName;
  roles: ('PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT')[];
  /** Se a tab deve aparecer na teleconsulta (modo de atendimento) */
  showInTeleconsultation: boolean;
  /** Se a tab deve aparecer nos detalhes da consulta (modo de visualização) */
  showInDetails: boolean;
  /** Ordem de exibição */
  order: number;
  /** Grupo ao qual a tab pertence (para organização em categorias) */
  group?: 'exame-fisico' | 'documentos' | 'standalone';
}

/**
 * Interface para grupos de tabs (categorias)
 */
export interface TabGroup {
  id: 'exame-fisico' | 'documentos' | 'standalone';
  label: string;
  icon: IconName;
  tabs: TabConfig[];
}

/**
 * Configuração centralizada de todas as tabs disponíveis.
 * 
 * IMPORTANTE - PADRÃO DE CONFIGURAÇÃO:
 * =====================================
 * 
 * 1. ADIÇÃO DE NOVAS TABS:
 *    - Para adicionar uma nova tab, basta adicioná-la a este array TELECONSULTATION_TABS
 *    - Configure `showInTeleconsultation: true` se deve aparecer na videochamada
 *    - Configure `showInDetails: true` se deve aparecer na tela de detalhes
 *    - A tab será automaticamente incluída em ambas as telas conforme configuração
 * 
 * 2. MODO READONLY AUTOMÁTICO:
 *    - Todas as tabs na tela de detalhes (/consultas/:id/detalhes) são AUTOMATICAMENTE
 *      configuradas como somente leitura através da propriedade `isDetailsView`
 *    - NÃO é necessário adicionar readonly manualmente em cada tab
 *    - O componente pai (AppointmentDetailsComponent) gerencia isso globalmente
 * 
 * 3. CNS É A ÚNICA EXCEÇÃO:
 *    - CNS tem `showInDetails: false` porque é específica do atendimento ao vivo
 *    - Todas as outras tabs seguem o padrão: aparecem em ambas as telas
 * 
 * 4. COMO FUNCIONA:
 *    - getTeleconsultationTabs(): retorna tabs para teleconsulta (showInTeleconsultation: true)
 *    - getDetailsTabs(): retorna tabs para detalhes (showInDetails: true)
 *    - Novas tabs são automaticamente incluídas baseado nessas flags
 */
export const TELECONSULTATION_TABS: TabConfig[] = [
  {
    id: 'basic',
    label: 'Informações Básicas',
    icon: 'file',
    roles: ['PATIENT', 'PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: false, // Não mostra na teleconsulta, apenas nos detalhes
    showInDetails: true,
    order: 0,
    group: 'standalone'
  },
  {
    id: 'patient-data',
    label: 'Dados do Paciente',
    icon: 'user',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 1,
    group: 'exame-fisico'
  },
  {
    id: 'pre-consultation',
    label: 'Dados da Pré Consulta',
    icon: 'file',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: false, // Temporariamente desativado
    showInDetails: false, // Temporariamente desativado
    order: 2,
    group: 'standalone'
  },
  {
    id: 'anamnesis',
    label: 'Anamnese',
    icon: 'book',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 2,
    group: 'exame-fisico'
  },
  {
    id: 'specialty',
    label: 'Campos da Especialidade',
    icon: 'stethoscope',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 3,
    group: 'exame-fisico'
  },
  {
    id: 'medical-devices',
    label: 'Sinais Vitais',
    icon: 'activity',
    roles: ['PATIENT', 'PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: true,
    showInDetails: false,
    order: 0,
    group: 'exame-fisico'
  },
  {
    id: 'auscultation',
    label: 'Ausculta',
    icon: 'mic',
    roles: ['PATIENT', 'PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: true,
    showInDetails: false,
    order: 1,
    group: 'exame-fisico'
  },
  {
    id: 'exam-camera',
    label: 'Câmera de Exame',
    icon: 'video',
    roles: ['PATIENT', 'PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: true,
    showInDetails: false,
    order: 2,
    group: 'exame-fisico'
  },
  {
    id: 'phonocardiogram',
    label: 'Fonocardiograma',
    icon: 'activity',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: false, // REMOVIDO conforme solicitação
    showInDetails: true,
    order: 5,
    group: 'standalone'
  },
  {
    id: 'biometrics',
    label: 'Biométricos',
    icon: 'heart',
    roles: ['PATIENT', 'PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: false, // REMOVIDO conforme solicitação
    showInDetails: true,
    order: 6,
    group: 'standalone'
  },
  {
    id: 'attachments',
    label: 'Chat Anexos',
    icon: 'image',
    roles: ['PATIENT', 'PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 5,
    group: 'exame-fisico'
  },
  {
    id: 'receita',
    label: 'Receituário',
    icon: 'file',
    roles: ['PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 1,
    group: 'documentos'
  },
  {
    id: 'atestado',
    label: 'Atestado',
    icon: 'file',
    roles: ['PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 2,
    group: 'documentos'
  },
  {
    id: 'return',
    label: 'Agendar Retorno',
    icon: 'calendar',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 3,
    group: 'documentos'
  },
  {
    id: 'referral',
    label: 'Encaminhamento',
    icon: 'arrow-right',
    roles: ['PROFESSIONAL', 'ADMIN', 'ASSISTANT'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 4,
    group: 'documentos'
  },
  {
    id: 'ai',
    label: 'Análise Diagnóstica',
    icon: 'activity',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 90,
    group: 'standalone'
  },
  {
    id: 'cns',
    label: 'Consulta CADSUS',
    icon: 'user',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: true,
    showInDetails: false,
    order: 91,
    group: 'standalone'
  },
  {
    id: 'conclusion',
    label: 'Finalizar Consulta',
    icon: 'check-circle',
    roles: ['PROFESSIONAL', 'ADMIN'],
    showInTeleconsultation: true,
    showInDetails: true,
    order: 99,
    group: 'standalone'
  }
];

/**
 * Retorna as tabs disponíveis para a teleconsulta, filtradas por role
 */
export function getTeleconsultationTabs(role: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT'): TabConfig[] {
  // ASSISTANT agora tem suas próprias permissões definidas no array roles
  return TELECONSULTATION_TABS
    .filter(tab => tab.showInTeleconsultation && tab.roles.includes(role))
    .sort((a, b) => a.order - b.order);
}

/**
 * Retorna os grupos de tabs organizados para a teleconsulta
 */
export function getTeleconsultationTabGroups(role: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT'): TabGroup[] {
  const tabs = getTeleconsultationTabs(role);
  
  const groups: TabGroup[] = [
    {
      id: 'exame-fisico',
      label: 'Avaliação Clínica',
      icon: 'stethoscope',
      tabs: tabs.filter(t => t.group === 'exame-fisico').sort((a, b) => a.order - b.order)
    },
    {
      id: 'documentos',
      label: 'Prescrições e Documentos',
      icon: 'file',
      tabs: tabs.filter(t => t.group === 'documentos').sort((a, b) => a.order - b.order)
    },
    {
      id: 'standalone',
      label: 'Ferramentas',
      icon: 'settings',
      tabs: tabs.filter(t => t.group === 'standalone').sort((a, b) => a.order - b.order)
    }
  ];
  
  // Remove grupos vazios
  return groups.filter(g => g.tabs.length > 0);
}

/**
 * Retorna as tabs disponíveis para a página de detalhes, filtradas por role
 */
export function getDetailsTabs(role: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN' | 'ASSISTANT'): TabConfig[] {
  // ASSISTANT agora tem suas próprias permissões definidas no array roles
  return TELECONSULTATION_TABS
    .filter(tab => tab.showInDetails && tab.roles.includes(role))
    .sort((a, b) => a.order - b.order);
}

/**
 * Retorna todas as tabs disponíveis para a página de detalhes (sem filtro de role)
 */
export function getAllDetailsTabs(): TabConfig[] {
  return TELECONSULTATION_TABS
    .filter(tab => tab.showInDetails)
    .sort((a, b) => a.order - b.order);
}

/**
 * Mapeamento de id da tab para o nome usado na teleconsulta
 */
export const TAB_ID_TO_LEGACY_NAME: Record<string, string> = {
  'medical-devices': 'Sinais Vitais',
  'auscultation': 'Ausculta',
  'exam-camera': 'Câmera de Exame',
  'patient-data': 'Dados do Paciente',
  'pre-consultation': 'Dados da Pré Consulta',
  'anamnesis': 'Anamnese',
  'specialty': 'Campos da Especialidade',
  'biometrics': 'Biométricos',
  'attachments': 'Chat Anexos',
  'receita': 'Receituário',
  'atestado': 'Atestado',
  'ai': 'Análise Diagnóstica',
  'cns': 'Consulta CADSUS',
  'return': 'Agendar Retorno',
  'referral': 'Encaminhamento',
  'conclusion': 'Finalizar Consulta'
};

/**
 * Mapeamento inverso: nome legacy para id
 */
export const LEGACY_NAME_TO_TAB_ID: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_ID_TO_LEGACY_NAME).map(([id, name]) => [name, id])
);
