import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoModalComponent, InfoModalData } from '../info-modal/info-modal';

interface Challenge {
  icon: string;
  title: string;
  description: string;
  details: string[];
}

@Component({
  selector: 'app-why-we-exist',
  imports: [CommonModule, InfoModalComponent],
  templateUrl: './why-we-exist.html',
  styleUrl: './why-we-exist.scss'
})
export class WhyWeExistComponent {
  selectedModal: InfoModalData | null = null;
  isModalOpen = false;

  challenges: Challenge[] = [
    {
      icon: '🗺️',
      title: 'Dimensões Continentais',
      description: 'O Brasil possui dimensões continentais que dificultam o acesso à saúde especializada em regiões remotas, onde a retenção de profissionais é desafiadora.',
      details: [
        'Mais de 8,5 milhões de km² de território nacional',
        'Milhares de municípios com acesso limitado a especialistas',
        'Longas distâncias entre centros de referência médica',
        'Infraestrutura de transporte precária em áreas remotas',
        'Dificuldade de retenção de profissionais em regiões isoladas'
      ]
    },
    {
      icon: '⏰',
      title: 'Longas Filas de Espera',
      description: 'A população SUS dependente enfrenta longas filas para atendimento especializado, comprometendo a qualidade do cuidado de saúde.',
      details: [
        'Tempo médio de espera de meses para consultas especializadas',
        'Agravamento de condições de saúde durante a espera',
        'Superlotação nas unidades de emergência',
        'Diagnósticos tardios impactando o prognóstico',
        'Custos elevados com tratamentos de urgência evitáveis'
      ]
    },
    {
      icon: '👨‍⚕️',
      title: 'Escassez de Especialistas',
      description: 'Dificuldades econômicas, de segurança e acesso limitam a presença de especialistas em diversas regiões do país.',
      details: [
        'Concentração de médicos em grandes centros urbanos',
        'Falta de incentivos para atuação em áreas remotas',
        'Carência de infraestrutura adequada para atendimento',
        'Dificuldade de atualização profissional em locais isolados',
        'Sobrecarga dos poucos especialistas disponíveis'
      ]
    }
  ];

  solutionBannerData: InfoModalData = {
    icon: '🚀',
    title: 'Nossa Resposta Tecnológica',
    description: 'O TeleCuidar surge como uma solução inovadora que aproveita o amadurecimento das tecnologias de IA, IoT e Big Data para criar uma ponte entre o conhecimento médico especializado e as comunidades que mais precisam de cuidados de qualidade.',
    details: [
      'Inteligência Artificial para análise de dados clínicos e suporte diagnóstico',
      'Internet das Coisas (IoT) para monitoramento remoto de sinais vitais',
      'Big Data para identificação de padrões e prevenção de doenças',
      'Telemedicina híbrida combinando atendimento presencial e remoto',
      'Plataforma integrada com sistemas nacionais de saúde (Datasus)',
      'Infraestrutura tecnológica nos Consultórios Digitais para suporte local'
    ],
    color: 'primary'
  };

  openModal(challenge: Challenge): void {
    this.selectedModal = {
      icon: challenge.icon,
      title: challenge.title,
      description: challenge.description,
      details: challenge.details,
      color: 'primary'
    };
    this.isModalOpen = true;
  }

  openSolutionModal(): void {
    this.selectedModal = this.solutionBannerData;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedModal = null;
  }
}
