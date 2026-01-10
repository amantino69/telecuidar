import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureCardComponent } from '@app/shared/components/molecules/feature-card/feature-card';
import { IconName } from '@app/shared/components/atoms/icon/icon';
import { InfoModalComponent, InfoModalData } from '../info-modal/info-modal';

interface Feature {
  icon: IconName;
  title: string;
  description: string;
  color: 'primary' | 'red' | 'green' | 'blue';
  details: string[];
}

@Component({
  selector: 'app-features',
  imports: [CommonModule, FeatureCardComponent, InfoModalComponent],
  templateUrl: './features.html',
  styleUrl: './features.scss'
})
export class FeaturesComponent {
  selectedModal: InfoModalData | null = null;
  isModalOpen = false;

  patientFeatures: Feature[] = [
    {
      icon: 'stethoscope',
      title: 'Telemedicina Híbrida',
      description: 'Atendimento remoto em ambiente tecnológico e acolhedor, com assistência de profissionais qualificados durante toda a consulta.',
      color: 'blue',
      details: [
        'Consultas por vídeo em alta definição com baixa latência',
        'Ambiente híbrido: presencial no Consultório Digital + especialista remoto',
        'Profissional de saúde local auxiliando o paciente durante toda consulta',
        'Transmissão de exames e imagens em tempo real',
        'Agendamento flexível conforme disponibilidade do paciente',
        'Suporte técnico contínuo para garantir qualidade da conexão'
      ]
    },
    {
      icon: 'heart',
      title: 'IA e IoT Integrados',
      description: 'Transmissão de dados biométricos via dispositivos IoT, análise inteligente e suporte à hipótese diagnóstica.',
      color: 'primary',
      details: [
        'Dispositivos IoT de última geração para coleta de dados vitais',
        'Transmissão segura e criptografada de informações biométricas',
        'Análise em tempo real por algoritmos de inteligência artificial',
        'Sugestões de diagnóstico diferencial baseadas em evidências',
        'Alertas automáticos para valores críticos',
        'Histórico completo de medições para acompanhamento longitudinal'
      ]
    },
    {
      icon: 'file',
      title: 'App Pessoal de Saúde',
      description: 'Histórico médico completo, agendamentos e acompanhamento na palma da sua mão.',
      color: 'green',
      details: [
        'Prontuário eletrônico acessível pelo paciente a qualquer momento',
        'Agendamento de consultas diretamente pelo aplicativo',
        'Lembretes de medicamentos e consultas agendadas',
        'Visualização de resultados de exames e prescrições',
        'Comunicação direta com equipe de saúde',
        'Controle total sobre compartilhamento de dados pessoais'
      ]
    }
  ];

  professionalFeatures: Feature[] = [
    {
      icon: 'shield',
      title: 'Aderência à LGPD',
      description: 'Proteção de dados pessoais garantida, criptografia de ponta e assinatura digital certificada.',
      color: 'red',
      details: [
        'Conformidade total com a Lei Geral de Proteção de Dados',
        'Criptografia de ponta a ponta em todas as comunicações',
        'Assinatura digital ICP-Brasil para documentos médicos',
        'Controle de acesso granular baseado em perfis',
        'Auditoria completa de todos os acessos e modificações',
        'Backup seguro e redundante de dados sensíveis'
      ]
    },
    {
      icon: 'clock',
      title: 'Sem Filas',
      description: 'Agendamento inteligente que reduz drasticamente o tempo de espera para consultas.',
      color: 'blue',
      details: [
        'Sistema de agendamento otimizado por inteligência artificial',
        'Distribuição equilibrada de consultas ao longo do dia',
        'Notificações automáticas sobre horários disponíveis',
        'Reagendamento simplificado em caso de imprevistos',
        'Redução do tempo de espera de meses para dias',
        'Priorização automática de casos urgentes'
      ]
    },
    {
      icon: 'users',
      title: 'Acesso Universal',
      description: 'Atendimento especializado para áreas remotas, quebrando barreiras geográficas.',
      color: 'green',
      details: [
        'Cobertura de especialidades em regiões sem médicos locais',
        'Consultórios Digitais em municípios de difícil acesso',
        'Conexão estável mesmo em áreas com internet limitada',
        'Atendimento em português brasileiro por especialistas nacionais',
        'Eliminação da necessidade de longas viagens para consultas',
        'Democratização do acesso à saúde de qualidade'
      ]
    }
  ];

  advancedFeatures: Feature[] = [];

  private featureIcons: Record<string, string> = {
    'Telemedicina Híbrida': '🏥',
    'IA e IoT Integrados': '🤖',
    'App Pessoal de Saúde': '📱',
    'Aderência à LGPD': '🔒',
    'Sem Filas': '⚡',
    'Acesso Universal': '🌍'
  };

  openModal(feature: Feature): void {
    this.selectedModal = {
      icon: this.featureIcons[feature.title] || '✨',
      title: feature.title,
      description: feature.description,
      details: feature.details,
      color: feature.color
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedModal = null;
  }
}
