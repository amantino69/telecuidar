import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoModalComponent, InfoModalData } from '../info-modal/info-modal';

interface TechCategory {
  icon: string;
  title: string;
  items: string[];
  details: string[];
  color: 'primary' | 'blue' | 'green' | 'red';
}

@Component({
  selector: 'app-technology',
  imports: [CommonModule, InfoModalComponent],
  templateUrl: './technology.html',
  styleUrl: './technology.scss'
})
export class TechnologyComponent {
  selectedModal: InfoModalData | null = null;
  isModalOpen = false;

  categories: TechCategory[] = [
    {
      icon: '🏥',
      title: 'Integração com Datasus',
      items: [
        'Validação do Cartão Nacional de Saúde (CNS)',
        'Interoperabilidade com sistemas do SUS',
        'Cadastro unificado de pacientes',
        'Conformidade com padrões nacionais de saúde'
      ],
      details: [
        'Integração nativa com o Cadastro Nacional de Saúde (CADSUS)',
        'Validação em tempo real do Cartão Nacional de Saúde',
        'Sincronização automática com prontuário eletrônico nacional',
        'Conformidade com padrões HL7 e FHIR de interoperabilidade',
        'Geração automática de relatórios para prestação de contas',
        'Integração com RNDS - Rede Nacional de Dados em Saúde',
        'Suporte a protocolos de comunicação TISS/TUSS'
      ],
      color: 'red'
    },
    {
      icon: '💉',
      title: 'Dispositivos Biométricos',
      items: [
        'Estetoscópios digitais de alta precisão',
        'Monitores de pressão arterial conectados',
        'Oxímetros e termômetros inteligentes',
        'Dispositivos de ECG portáteis'
      ],
      details: [
        'Estetoscópios digitais com amplificação e filtragem de ruídos',
        'Monitores de pressão arterial com conexão Bluetooth/WiFi',
        'Oxímetros de pulso com transmissão contínua de dados',
        'Termômetros infravermelhos de alta precisão',
        'Dispositivos de ECG de 12 derivações portáteis',
        'Balanças inteligentes com análise de composição corporal',
        'Glicosímetros conectados para monitoramento de diabetes',
        'Dermatoscópios digitais para análise de lesões de pele'
      ],
      color: 'green'
    },
    {
      icon: '💻',
      title: 'Plataforma de Teleconsulta',
      items: [
        'Videochamada HD com baixa latência',
        'Prontuário eletrônico integrado',
        'Painel de dados vitais em tempo real',
        'Prontuário eletrônico completo'
      ],
      details: [
        'Videochamada em alta definição otimizada para conexões variáveis',
        'Criptografia de ponta a ponta em todas as comunicações',
        'Compartilhamento de tela e documentos em tempo real',
        'Prontuário eletrônico estruturado com histórico completo',
        'Painel de sinais vitais atualizado em tempo real',
        'Prescrição digital com assinatura ICP-Brasil',
        'Integração com exames laboratoriais e de imagem',
        'Gravação opcional de consultas para revisão médica'
      ],
      color: 'blue'
    },
    {
      icon: '🧠',
      title: 'Análise Inteligente por IA',
      items: [
        'Análise de séries históricas de saúde',
        'Detecção de padrões anômalos',
        'Sugestões de diagnóstico diferencial',
        'Alertas de risco automatizados'
      ],
      details: [
        'Machine Learning para análise preditiva de condições de saúde',
        'Processamento de linguagem natural em anotações médicas',
        'Detecção automática de anomalias em exames e sinais vitais',
        'Sugestões de diagnóstico diferencial baseadas em evidências',
        'Alertas inteligentes para interações medicamentosas',
        'Análise de tendências longitudinais de saúde do paciente',
        'Suporte à decisão clínica em tempo real',
        'Triagem automatizada com classificação de risco'
      ],
      color: 'primary'
    }
  ];

  openModal(category: TechCategory): void {
    this.selectedModal = {
      icon: category.icon,
      title: category.title,
      description: `Recursos avançados de ${category.title.toLowerCase()} para uma experiência de saúde completa e integrada.`,
      details: category.details,
      color: category.color
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedModal = null;
  }
}
