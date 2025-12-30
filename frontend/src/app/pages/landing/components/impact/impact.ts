import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoModalComponent, InfoModalData } from '../info-modal/info-modal';

interface Benefit {
  icon: string;
  title: string;
  items: string[];
  details: string[];
  color: 'primary' | 'blue' | 'green' | 'red';
}

@Component({
  selector: 'app-impact',
  imports: [CommonModule, InfoModalComponent],
  templateUrl: './impact.html',
  styleUrl: './impact.scss'
})
export class ImpactComponent {
  selectedModal: InfoModalData | null = null;
  isModalOpen = false;

  benefits: Benefit[] = [
    {
      icon: '👥',
      title: 'Para os Cidadãos',
      items: [
        'Acesso a especialidades médicas sem deslocamentos longos',
        'Redução significativa no tempo de espera',
        'Atendimento de qualidade com tecnologia de ponta',
        'Histórico médico sempre acessível',
        'Economia em deslocamentos e custos'
      ],
      details: [
        'Consultas com especialistas de todo o Brasil sem sair da cidade',
        'Redução do tempo de espera de meses para dias ou semanas',
        'Atendimento humanizado com suporte tecnológico avançado',
        'Prontuário eletrônico acessível 24/7 pelo aplicativo',
        'Economia significativa em passagens, hospedagem e alimentação',
        'Menos dias perdidos de trabalho para consultas médicas',
        'Acompanhamento contínuo sem necessidade de viagens frequentes',
        'Acesso igualitário independente da localização geográfica'
      ],
      color: 'primary'
    },
    {
      icon: '🏛️',
      title: 'Para os Municípios',
      items: [
        'Otimização dos recursos de saúde pública',
        'Redução de custos operacionais',
        'Melhoria nos indicadores de saúde',
        'Facilidade na prestação de contas',
        'Atração de profissionais especialistas'
      ],
      details: [
        'Melhor aproveitamento do orçamento de saúde municipal',
        'Redução de custos com Tratamento Fora de Domicílio (TFD)',
        'Indicadores de saúde melhorados para repasses federais',
        'Relatórios automáticos para prestação de contas transparente',
        'Atração de especialistas sem custos de contratação fixa',
        'Diminuição da superlotação em UPAs e emergências',
        'Melhor gestão das filas de espera por especialidades',
        'Fortalecimento da atenção primária à saúde'
      ],
      color: 'blue'
    },
    {
      icon: '⚕️',
      title: 'Para os Profissionais',
      items: [
        'Flexibilidade para atender de qualquer localização',
        'Suporte de IA para diagnósticos mais precisos',
        'Acesso a dados completos do paciente',
        'Oportunidade de impactar mais vidas',
        'Ambiente tecnológico avançado de trabalho'
      ],
      details: [
        'Atendimento remoto com flexibilidade de horários e local',
        'Inteligência artificial auxiliando no diagnóstico diferencial',
        'Prontuário completo com histórico e exames integrados',
        'Alcance multiplicado para pacientes de todo o país',
        'Plataforma moderna com recursos de última geração',
        'Assinatura digital certificada para todos os documentos',
        'Capacitação contínua e suporte técnico especializado',
        'Valorização profissional através da telemedicina de qualidade'
      ],
      color: 'green'
    }
  ];

  openModal(benefit: Benefit): void {
    this.selectedModal = {
      icon: benefit.icon,
      title: benefit.title,
      description: `Benefícios transformadores ${benefit.title.toLowerCase()} através da nossa plataforma de telesaúde.`,
      details: benefit.details,
      color: benefit.color
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedModal = null;
  }
}
