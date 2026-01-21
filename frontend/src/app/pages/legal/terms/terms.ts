import { Component, PLATFORM_ID, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeaderComponent } from '@app/shared/components/organisms/header/header';
import { FooterComponent } from '@app/shared/components/organisms/footer/footer';

@Component({
  selector: 'app-terms',
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './terms.html',
  styleUrl: './terms.scss'
})
export class TermsComponent implements OnInit, OnDestroy {
  lastUpdated = '28 de Dezembro de 2025';
  private lastScrollY = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupHeaderScroll();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.handleScroll);
    }
  }

  private setupHeaderScroll(): void {
    window.addEventListener('scroll', this.handleScroll);
  }

  private handleScroll = (): void => {
    const currentScrollY = window.scrollY;
    const header = document.querySelector('.header');
    
    if (!header) return;

    if (currentScrollY < this.lastScrollY || currentScrollY < 100) {
      header.classList.remove('header--hidden');
    } else if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
      header.classList.add('header--hidden');
    }

    this.lastScrollY = currentScrollY;
  };

  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    if (isPlatformBrowser(this.platformId)) {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 100;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
  }
  
  sections = [
    {
      id: 'acceptance',
      title: '1. Aceitação dos Termos',
      icon: '✅',
      content: `
        <p>Ao acessar e utilizar a plataforma TeleCuidar, você concorda com estes Termos de Uso e nossa Política de Privacidade. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.</p>
        <p>Estes termos constituem um acordo legal entre você e a TeleCuidar, regulando o acesso e uso de nossa plataforma de telemedicina.</p>
      `
    },
    {
      id: 'services',
      title: '2. Descrição dos Serviços',
      icon: '🏥',
      content: `
        <p>A TeleCuidar oferece uma plataforma de telemedicina que permite:</p>
        <ul>
          <li><strong>Teleconsultas:</strong> Consultas médicas realizadas remotamente através de videochamadas seguras</li>
          <li><strong>Agendamento online:</strong> Sistema de agendamento de consultas com profissionais de saúde</li>
          <li><strong>Prontuário eletrônico:</strong> Armazenamento seguro de informações de saúde do paciente</li>
          <li><strong>Prescrição digital:</strong> Emissão de receitas médicas com assinatura digital válida</li>
          <li><strong>Atestados médicos:</strong> Emissão de atestados com certificação digital ICP-Brasil</li>
          <li><strong>Integração com o SUS:</strong> Consulta de dados no Cartão Nacional de Saúde (CNS)</li>
        </ul>
        <p>Os serviços são destinados exclusivamente para uso em território brasileiro e estão em conformidade com as regulamentações do Conselho Federal de Medicina (CFM).</p>
      `
    },
    {
      id: 'eligibility',
      title: '3. Elegibilidade e Cadastro',
      icon: '👤',
      content: `
        <p>Para utilizar a plataforma TeleCuidar, você deve:</p>
        <ul>
          <li>Ter pelo menos 18 anos de idade ou ser acompanhado por responsável legal</li>
          <li>Fornecer informações verdadeiras, precisas e completas durante o cadastro</li>
          <li>Manter a confidencialidade de suas credenciais de acesso</li>
          <li>Possuir CPF válido e ativo na Receita Federal</li>
        </ul>
        <p><strong>Para profissionais de saúde:</strong></p>
        <ul>
          <li>Possuir registro ativo no conselho profissional correspondente (CRM, CRO, CRP, etc.)</li>
          <li>Estar habilitado para exercício da telemedicina conforme regulamentação vigente</li>
          <li>Possuir certificado digital válido para assinatura de documentos (quando aplicável)</li>
        </ul>
      `
    },
    {
      id: 'responsibilities',
      title: '4. Responsabilidades do Usuário',
      icon: '📋',
      content: `
        <p>Ao utilizar a plataforma, você se compromete a:</p>
        <ul>
          <li>Fornecer informações de saúde verdadeiras e completas aos profissionais</li>
          <li>Não utilizar a plataforma para fins ilegais ou não autorizados</li>
          <li>Não compartilhar suas credenciais de acesso com terceiros</li>
          <li>Garantir ambiente adequado e privativo para realização de teleconsultas</li>
          <li>Manter seus dados cadastrais atualizados</li>
          <li>Comparecer pontualmente às consultas agendadas</li>
          <li>Informar sobre condições pré-existentes e medicamentos em uso</li>
        </ul>
        <p><strong>É expressamente proibido:</strong></p>
        <ul>
          <li>Utilizar identidade falsa ou de terceiros</li>
          <li>Gravar consultas sem autorização expressa de todos os participantes</li>
          <li>Transmitir conteúdo ofensivo, discriminatório ou ilegal</li>
          <li>Tentar acessar áreas restritas ou dados de outros usuários</li>
        </ul>
      `
    },
    {
      id: 'medical-disclaimer',
      title: '5. Aviso Médico Importante',
      icon: '⚠️',
      content: `
        <p><strong>ATENÇÃO:</strong> A telemedicina possui limitações inerentes ao atendimento remoto.</p>
        <p>A TeleCuidar não substitui o atendimento presencial em casos de:</p>
        <ul>
          <li>Emergências médicas (infarto, AVC, acidentes, etc.)</li>
          <li>Situações que requeiram exame físico detalhado</li>
          <li>Procedimentos invasivos ou cirurgias</li>
          <li>Quadros agudos que necessitem de intervenção imediata</li>
        </ul>
        <p><strong>Em caso de emergência, procure imediatamente o serviço de emergência mais próximo ou ligue 192 (SAMU).</strong></p>
        <p>Os profissionais de saúde da plataforma podem, a qualquer momento, indicar a necessidade de atendimento presencial, e esta recomendação deve ser seguida pelo paciente.</p>
      `
    },
    {
      id: 'prescriptions',
      title: '6. Prescrições e Documentos Digitais',
      icon: '📄',
      content: `
        <p>A TeleCuidar permite a emissão de documentos digitais válidos juridicamente:</p>
        <ul>
          <li><strong>Receitas médicas:</strong> Assinadas digitalmente com certificado ICP-Brasil, válidas em todo território nacional</li>
          <li><strong>Atestados médicos:</strong> Emitidos conforme regulamentação do CFM</li>
          <li><strong>Declarações de comparecimento:</strong> Para fins trabalhistas e escolares</li>
        </ul>
        <p>Os documentos emitidos possuem validade legal conforme a Medida Provisória nº 2.200-2/2001 e regulamentações do CFM sobre telemedicina.</p>
        <p><strong>Importante:</strong> Medicamentos controlados podem ter restrições específicas quanto à prescrição por telemedicina, conforme regulamentação da ANVISA e conselhos profissionais.</p>
      `
    },
    {
      id: 'payment',
      title: '7. Pagamentos e Cancelamentos',
      icon: '💳',
      content: `
        <p><strong>Atendimento pelo SUS:</strong> Os serviços oferecidos através de parcerias com o Sistema Único de Saúde (SUS) são gratuitos para o paciente.</p>
        <p><strong>Política de Cancelamento:</strong></p>
        <ul>
          <li>Consultas podem ser canceladas ou reagendadas com até 24 horas de antecedência</li>
          <li>Faltas não justificadas podem resultar em restrições temporárias de agendamento</li>
          <li>O profissional pode cancelar a consulta em casos de força maior</li>
        </ul>
        <p>Reservamo-nos o direito de modificar nossa política de cancelamento mediante aviso prévio aos usuários.</p>
      `
    },
    {
      id: 'intellectual-property',
      title: '8. Propriedade Intelectual',
      icon: '©️',
      content: `
        <p>Todo o conteúdo da plataforma TeleCuidar, incluindo mas não limitado a:</p>
        <ul>
          <li>Código-fonte e software</li>
          <li>Design, interface e elementos visuais</li>
          <li>Logotipos, marcas e identidade visual</li>
          <li>Textos, imagens e conteúdo educacional</li>
        </ul>
        <p>São de propriedade exclusiva da TeleCuidar ou licenciados por terceiros, protegidos pelas leis brasileiras de propriedade intelectual.</p>
        <p>É proibida a reprodução, distribuição, modificação ou uso comercial sem autorização prévia por escrito.</p>
      `
    },
    {
      id: 'liability',
      title: '9. Limitação de Responsabilidade',
      icon: '⚖️',
      content: `
        <p>A TeleCuidar se responsabiliza por:</p>
        <ul>
          <li>Manter a plataforma operacional e segura</li>
          <li>Proteger os dados dos usuários conforme a LGPD</li>
          <li>Verificar as credenciais dos profissionais de saúde cadastrados</li>
        </ul>
        <p><strong>A TeleCuidar não se responsabiliza por:</strong></p>
        <ul>
          <li>Condutas profissionais individuais dos médicos e profissionais de saúde</li>
          <li>Falhas de conexão de internet do usuário</li>
          <li>Informações falsas ou incompletas fornecidas pelo paciente</li>
          <li>Danos decorrentes do não cumprimento das orientações médicas</li>
          <li>Interrupções de serviço por motivos de força maior</li>
        </ul>
      `
    },
    {
      id: 'termination',
      title: '10. Suspensão e Encerramento',
      icon: '🚫',
      content: `
        <p>A TeleCuidar reserva-se o direito de suspender ou encerrar o acesso de usuários que:</p>
        <ul>
          <li>Violarem estes Termos de Uso</li>
          <li>Fornecerem informações falsas</li>
          <li>Utilizarem a plataforma de forma fraudulenta</li>
          <li>Causarem danos à plataforma ou outros usuários</li>
        </ul>
        <p>O usuário pode solicitar o encerramento de sua conta a qualquer momento, mantendo-se o direito de acesso aos seus dados conforme a LGPD.</p>
      `
    },
    {
      id: 'modifications',
      title: '11. Modificações dos Termos',
      icon: '📝',
      content: `
        <p>Estes Termos de Uso podem ser atualizados periodicamente. Notificaremos os usuários sobre alterações significativas através de:</p>
        <ul>
          <li>E-mail cadastrado</li>
          <li>Notificação na plataforma</li>
          <li>Publicação na página de Termos de Uso</li>
        </ul>
        <p>O uso continuado da plataforma após as modificações constitui aceitação dos novos termos.</p>
      `
    },
    {
      id: 'contact',
      title: '12. Foro e Legislação Aplicável',
      icon: '🏛️',
      content: `
        <p>Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.</p>
        <p>Fica eleito o foro da Comarca de Belo Horizonte, Estado de Minas Gerais, como competente para dirimir quaisquer questões oriundas deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
        <p><strong>Contato para dúvidas:</strong></p>
        <ul>
          <li>E-mail: <a href="mailto:contato@telecuidar.com.br">contato@telecuidar.com.br</a></li>
          <li>Telefone: +55 (31) 90000-0000</li>
        </ul>
      `
    }
  ];
}
