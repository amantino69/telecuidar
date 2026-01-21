import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoModalComponent, InfoModalData } from '../info-modal/info-modal';

@Component({
  selector: 'app-vision',
  standalone: true,
  imports: [CommonModule, InfoModalComponent],
  templateUrl: './vision.html',
  styleUrl: './vision.scss'
})
export class VisionComponent {
  isModalOpen = false;
  
  visionModalData: InfoModalData = {
    icon: '🌟',
    title: 'Nossa Visão de Futuro',
    description: 'Acreditamos em um Brasil onde a tecnologia não substitui o cuidado humano, mas o potencializa. Onde cada cidadão, independente de onde more, tenha acesso a cuidados de saúde de qualidade.',
    details: [
      'Saúde pública de qualidade acessível em todos os municípios brasileiros',
      'Tecnologia a serviço da humanização do atendimento médico',
      'Eliminação das barreiras geográficas para acesso a especialistas',
      'Inteligência artificial auxiliando médicos em diagnósticos mais precisos',
      'Prontuário eletrônico nacional integrado e acessível ao paciente',
      'Prevenção de doenças através de monitoramento contínuo e análise preditiva',
      'Formação de uma rede colaborativa de profissionais de saúde',
      'Inovação constante para atender às necessidades da população',
      'Impacto mensurável na qualidade de vida dos cidadãos brasileiros'
    ],
    color: 'primary'
  };

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }
}
