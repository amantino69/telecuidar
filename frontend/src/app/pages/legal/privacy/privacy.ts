import { Component, PLATFORM_ID, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeaderComponent } from '@app/shared/components/organisms/header/header';
import { FooterComponent } from '@app/shared/components/organisms/footer/footer';

@Component({
  selector: 'app-privacy',
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss'
})
export class PrivacyComponent implements OnInit, OnDestroy {
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
  
  highlights = [
    {
      icon: '🔒',
      title: 'Dados Criptografados',
      description: 'Todas as informações são protegidas com criptografia de ponta a ponta'
    },
    {
      icon: '🇧🇷',
      title: 'Conformidade LGPD',
      description: 'Em total conformidade com a Lei Geral de Proteção de Dados'
    },
    {
      icon: '🏥',
      title: 'Sigilo Médico',
      description: 'Respeito integral ao sigilo médico-paciente'
    },
    {
      icon: '👤',
      title: 'Seus Direitos',
      description: 'Controle total sobre seus dados pessoais e de saúde'
    }
  ];

  sections = [
    {
      id: 'introduction',
      title: '1. Introdução',
      icon: '📖',
      content: `
        <p>A TeleCuidar está comprometida com a proteção da privacidade e dos dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informações.</p>
        <p>Esta política está em conformidade com:</p>
        <ul>
          <li><strong>LGPD</strong> - Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</li>
          <li><strong>Marco Civil da Internet</strong> (Lei nº 12.965/2014)</li>
          <li><strong>Código de Ética Médica</strong> - Capítulo sobre Sigilo Profissional</li>
          <li><strong>Resoluções do CFM</strong> sobre Telemedicina e Prontuário Eletrônico</li>
        </ul>
        <p>Ao utilizar nossa plataforma, você concorda com as práticas descritas nesta Política de Privacidade.</p>
      `
    },
    {
      id: 'data-collected',
      title: '2. Dados que Coletamos',
      icon: '📋',
      content: `
        <p>Coletamos diferentes categorias de dados para fornecer nossos serviços:</p>
        <p><strong>Dados de Identificação:</strong></p>
        <ul>
          <li>Nome completo</li>
          <li>CPF (Cadastro de Pessoa Física)</li>
          <li>Data de nascimento</li>
          <li>Gênero</li>
          <li>E-mail e telefone</li>
          <li>Endereço residencial</li>
          <li>Foto de perfil (opcional)</li>
        </ul>
        <p><strong>Dados Sensíveis de Saúde:</strong></p>
        <ul>
          <li>Histórico médico e prontuário eletrônico</li>
          <li>Alergias e condições pré-existentes</li>
          <li>Medicamentos em uso</li>
          <li>Resultados de exames e diagnósticos</li>
          <li>Prescrições e atestados médicos</li>
          <li>Número do Cartão Nacional de Saúde (CNS)</li>
          <li>Dados biométricos (peso, altura, pressão arterial, etc.)</li>
        </ul>
        <p><strong>Dados Técnicos:</strong></p>
        <ul>
          <li>Endereço IP e geolocalização aproximada</li>
          <li>Tipo de dispositivo e navegador</li>
          <li>Sistema operacional</li>
          <li>Logs de acesso e navegação na plataforma</li>
        </ul>
        <p><strong>Para Profissionais de Saúde:</strong></p>
        <ul>
          <li>Número do registro profissional (CRM, CRO, CRP, etc.)</li>
          <li>Especialidades e qualificações</li>
          <li>Certificado digital ICP-Brasil (dados públicos)</li>
        </ul>
      `
    },
    {
      id: 'data-usage',
      title: '3. Como Utilizamos seus Dados',
      icon: '⚙️',
      content: `
        <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
        <p><strong>Prestação de Serviços:</strong></p>
        <ul>
          <li>Realizar agendamentos e teleconsultas</li>
          <li>Manter e atualizar seu prontuário eletrônico</li>
          <li>Emitir prescrições e atestados médicos</li>
          <li>Enviar notificações sobre consultas</li>
          <li>Consultar dados no Sistema Nacional de Saúde (CADSUS)</li>
        </ul>
        <p><strong>Comunicação:</strong></p>
        <ul>
          <li>Enviar lembretes de consultas agendadas</li>
          <li>Notificar sobre atualizações da plataforma</li>
          <li>Responder solicitações de suporte</li>
          <li>Enviar comunicados importantes sobre sua saúde</li>
        </ul>
        <p><strong>Melhoria dos Serviços:</strong></p>
        <ul>
          <li>Analisar padrões de uso para aprimorar a plataforma</li>
          <li>Desenvolver novas funcionalidades</li>
          <li>Realizar pesquisas de satisfação</li>
        </ul>
        <p><strong>Obrigações Legais:</strong></p>
        <ul>
          <li>Cumprir determinações de autoridades competentes</li>
          <li>Atender requisitos regulatórios do setor de saúde</li>
          <li>Manter registros para fins de auditoria</li>
        </ul>
      `
    },
    {
      id: 'legal-basis',
      title: '4. Base Legal do Tratamento',
      icon: '⚖️',
      content: `
        <p>O tratamento de seus dados pessoais é fundamentado nas seguintes bases legais da LGPD:</p>
        <ul>
          <li><strong>Consentimento (Art. 7º, I):</strong> Para coleta e uso de dados pessoais gerais</li>
          <li><strong>Execução de Contrato (Art. 7º, V):</strong> Para prestação dos serviços de telemedicina</li>
          <li><strong>Obrigação Legal (Art. 7º, II):</strong> Para cumprimento de normas do CFM e vigilância sanitária</li>
          <li><strong>Tutela da Saúde (Art. 11, II, f):</strong> Para tratamento de dados sensíveis de saúde</li>
          <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> Para melhoria dos serviços e segurança da plataforma</li>
        </ul>
        <p>Para dados sensíveis de saúde, aplicamos proteções adicionais conforme exigido pelo Art. 11 da LGPD.</p>
      `
    },
    {
      id: 'data-sharing',
      title: '5. Compartilhamento de Dados',
      icon: '🤝',
      content: `
        <p>Seus dados podem ser compartilhados nas seguintes situações:</p>
        <p><strong>Com Profissionais de Saúde:</strong></p>
        <ul>
          <li>Médicos e profissionais que realizarão seu atendimento</li>
          <li>Acesso restrito ao necessário para a consulta</li>
          <li>Vinculados ao sigilo profissional</li>
        </ul>
        <p><strong>Com Órgãos Públicos:</strong></p>
        <ul>
          <li>DATASUS/Ministério da Saúde (integração CNS)</li>
          <li>Quando exigido por lei ou ordem judicial</li>
          <li>Vigilância epidemiológica (dados anonimizados)</li>
        </ul>
        <p><strong>Com Prestadores de Serviço:</strong></p>
        <ul>
          <li>Serviços de hospedagem e infraestrutura (Microsoft Azure)</li>
          <li>Serviços de e-mail transacional</li>
          <li>Certificadoras digitais ICP-Brasil</li>
        </ul>
        <p><strong>Nunca compartilhamos seus dados:</strong></p>
        <ul>
          <li>Para fins de marketing de terceiros</li>
          <li>Com empresas de planos de saúde (sem seu consentimento expresso)</li>
          <li>Para comercialização de qualquer natureza</li>
        </ul>
      `
    },
    {
      id: 'data-storage',
      title: '6. Armazenamento e Segurança',
      icon: '🔐',
      content: `
        <p>Implementamos medidas técnicas e organizacionais robustas para proteger seus dados:</p>
        <p><strong>Segurança Técnica:</strong></p>
        <ul>
          <li>Criptografia AES-256 para dados em repouso</li>
          <li>TLS 1.3 para dados em trânsito</li>
          <li>Autenticação multifator (2FA) disponível</li>
          <li>Firewalls e sistemas de detecção de intrusão</li>
          <li>Backups automáticos e redundância de dados</li>
        </ul>
        <p><strong>Infraestrutura:</strong></p>
        <ul>
          <li>Servidores em data centers com certificação ISO 27001</li>
          <li>Hospedagem em território brasileiro quando possível</li>
          <li>Monitoramento 24/7 de segurança</li>
        </ul>
        <p><strong>Controles de Acesso:</strong></p>
        <ul>
          <li>Acesso baseado em função (RBAC)</li>
          <li>Logs de auditoria de todos os acessos</li>
          <li>Revisão periódica de permissões</li>
          <li>Treinamento de equipe em proteção de dados</li>
        </ul>
      `
    },
    {
      id: 'retention',
      title: '7. Período de Retenção',
      icon: '📅',
      content: `
        <p>Mantemos seus dados pelos seguintes períodos:</p>
        <ul>
          <li><strong>Prontuário médico:</strong> Mínimo de 20 anos após o último atendimento, conforme Resolução CFM nº 1.821/2007</li>
          <li><strong>Dados cadastrais:</strong> Enquanto a conta estiver ativa + 5 anos após encerramento</li>
          <li><strong>Logs de acesso:</strong> 6 meses, conforme Marco Civil da Internet</li>
          <li><strong>Comunicações:</strong> 5 anos após o envio</li>
        </ul>
        <p>Após os períodos indicados, os dados serão:</p>
        <ul>
          <li>Anonimizados para fins estatísticos, ou</li>
          <li>Excluídos de forma segura</li>
        </ul>
      `
    },
    {
      id: 'your-rights',
      title: '8. Seus Direitos (LGPD)',
      icon: '✊',
      content: `
        <p>Você possui os seguintes direitos garantidos pela LGPD:</p>
        <ul>
          <li><strong>Confirmação:</strong> Saber se tratamos seus dados pessoais</li>
          <li><strong>Acesso:</strong> Obter cópia de todos os seus dados</li>
          <li><strong>Correção:</strong> Solicitar atualização de dados incompletos ou incorretos</li>
          <li><strong>Anonimização:</strong> Solicitar anonimização de dados desnecessários</li>
          <li><strong>Portabilidade:</strong> Transferir seus dados para outro serviço</li>
          <li><strong>Eliminação:</strong> Solicitar exclusão de dados (respeitando obrigações legais)</li>
          <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
          <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
          <li><strong>Oposição:</strong> Se opor a tratamento que viole a LGPD</li>
        </ul>
        <p><strong>Como exercer seus direitos:</strong></p>
        <ul>
          <li>Através das configurações do seu perfil na plataforma</li>
          <li>Enviando e-mail para: <a href="mailto:privacidade@telecuidar.com.br">privacidade@telecuidar.com.br</a></li>
          <li>Responderemos em até 15 dias úteis</li>
        </ul>
        <p><strong>Importante:</strong> Alguns dados de saúde não podem ser excluídos devido a obrigações legais de guarda de prontuário médico.</p>
      `
    },
    {
      id: 'cookies',
      title: '9. Cookies e Tecnologias Similares',
      icon: '🍪',
      content: `
        <p>Utilizamos cookies e tecnologias similares para:</p>
        <ul>
          <li><strong>Cookies Essenciais:</strong> Necessários para funcionamento da plataforma (autenticação, sessão)</li>
          <li><strong>Cookies de Preferências:</strong> Lembrar suas configurações (tema, idioma)</li>
          <li><strong>Cookies Analíticos:</strong> Entender como você usa a plataforma (anonimizados)</li>
        </ul>
        <p><strong>Não utilizamos:</strong></p>
        <ul>
          <li>Cookies de publicidade ou rastreamento</li>
          <li>Cookies de terceiros para marketing</li>
        </ul>
        <p>Você pode gerenciar cookies através das configurações do seu navegador.</p>
      `
    },
    {
      id: 'children',
      title: '10. Dados de Menores',
      icon: '👶',
      content: `
        <p>Para usuários menores de 18 anos:</p>
        <ul>
          <li>O cadastro deve ser realizado pelo responsável legal</li>
          <li>O responsável gerencia e tem acesso aos dados do menor</li>
          <li>Teleconsultas de menores devem ter acompanhamento do responsável</li>
          <li>O consentimento do responsável é obrigatório para qualquer tratamento</li>
        </ul>
        <p>Tratamos dados de menores com cuidado especial, conforme Art. 14 da LGPD.</p>
      `
    },
    {
      id: 'international',
      title: '11. Transferência Internacional',
      icon: '🌍',
      content: `
        <p>Seus dados podem ser processados em servidores localizados fora do Brasil para:</p>
        <ul>
          <li>Serviços de infraestrutura em nuvem (com proteções adequadas)</li>
          <li>Serviços de e-mail transacional</li>
        </ul>
        <p>Quando houver transferência internacional, garantimos:</p>
        <ul>
          <li>Países com nível adequado de proteção, ou</li>
          <li>Cláusulas contratuais padrão aprovadas pela ANPD, ou</li>
          <li>Seu consentimento específico e informado</li>
        </ul>
      `
    },
    {
      id: 'dpo',
      title: '12. Encarregado de Dados (DPO)',
      icon: '👨‍💼',
      content: `
        <p>Nosso Encarregado de Proteção de Dados está disponível para:</p>
        <ul>
          <li>Receber reclamações e solicitações sobre dados pessoais</li>
          <li>Orientar sobre práticas de proteção de dados</li>
          <li>Intermediar comunicação com a ANPD</li>
        </ul>
        <p><strong>Contato do DPO:</strong></p>
        <ul>
          <li>E-mail: <a href="mailto:dpo@telecuidar.com.br">dpo@telecuidar.com.br</a></li>
          <li>Endereço: Belo Horizonte, MG - Brasil</li>
        </ul>
      `
    },
    {
      id: 'updates',
      title: '13. Atualizações desta Política',
      icon: '🔄',
      content: `
        <p>Esta Política de Privacidade pode ser atualizada periodicamente. Quando isso ocorrer:</p>
        <ul>
          <li>Notificaremos você por e-mail sobre mudanças significativas</li>
          <li>Exibiremos aviso na plataforma</li>
          <li>Atualizaremos a data de "última atualização" no topo desta página</li>
        </ul>
        <p>Recomendamos revisar esta política regularmente.</p>
      `
    },
    {
      id: 'contact',
      title: '14. Contato',
      icon: '📞',
      content: `
        <p>Para dúvidas, solicitações ou reclamações sobre esta Política de Privacidade:</p>
        <ul>
          <li><strong>E-mail geral:</strong> <a href="mailto:contato@telecuidar.com.br">contato@telecuidar.com.br</a></li>
          <li><strong>Privacidade e dados:</strong> <a href="mailto:privacidade@telecuidar.com.br">privacidade@telecuidar.com.br</a></li>
          <li><strong>DPO:</strong> <a href="mailto:dpo@telecuidar.com.br">dpo@telecuidar.com.br</a></li>
          <li><strong>Telefone:</strong> +55 (31) 90000-0000</li>
        </ul>
        <p><strong>Autoridade Nacional de Proteção de Dados (ANPD):</strong></p>
        <p>Caso não fique satisfeito com nossa resposta, você pode apresentar reclamação à ANPD através do site <a href="https://www.gov.br/anpd" target="_blank">www.gov.br/anpd</a>.</p>
      `
    }
  ];
}
