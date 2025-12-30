import { Component, PLATFORM_ID, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeaderComponent } from '@app/shared/components/organisms/header/header';
import { FooterComponent } from '@app/shared/components/organisms/footer/footer';

@Component({
  selector: 'app-lgpd',
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './lgpd.html',
  styleUrl: './lgpd.scss'
})
export class LgpdComponent implements OnInit, OnDestroy {
  lastUpdated = '30 de Dezembro de 2025';
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
      icon: '🇧🇷',
      title: 'Lei 13.709/2018',
      description: 'Conformidade total com a Lei Geral de Proteção de Dados Pessoais'
    },
    {
      icon: '🔐',
      title: 'Dados Seguros',
      description: 'Criptografia de ponta a ponta em todas as informações sensíveis'
    },
    {
      icon: '👤',
      title: 'Seus Direitos',
      description: 'Garantimos todos os direitos previstos na LGPD aos titulares'
    },
    {
      icon: '📋',
      title: 'Transparência',
      description: 'Processos claros e documentados de tratamento de dados'
    }
  ];

  sections = [
    {
      id: 'what-is-lgpd',
      title: '1. O que é a LGPD?',
      icon: '📖',
      content: `
        <p>A <strong>Lei Geral de Proteção de Dados Pessoais (LGPD)</strong> - Lei nº 13.709/2018 - é a legislação brasileira que regula o tratamento de dados pessoais por pessoas físicas ou jurídicas, de direito público ou privado.</p>
        <p>A LGPD tem como objetivos:</p>
        <ul>
          <li><strong>Proteger os direitos fundamentais</strong> de liberdade e de privacidade</li>
          <li><strong>Livre desenvolvimento da personalidade</strong> da pessoa natural</li>
          <li><strong>Padronizar regulamentos</strong> e práticas para promover a proteção de dados pessoais</li>
          <li><strong>Gerar desenvolvimento econômico</strong> e tecnológico através da inovação</li>
        </ul>
        <p>A TeleCuidar está plenamente comprometida com o cumprimento de todas as disposições da LGPD.</p>
      `
    },
    {
      id: 'data-controller',
      title: '2. Controlador e Operador',
      icon: '🏢',
      content: `
        <p>Para fins da LGPD, a TeleCuidar atua como:</p>
        <p><strong>Controlador de Dados:</strong></p>
        <ul>
          <li>Pessoa jurídica responsável pelas decisões referentes ao tratamento de dados pessoais</li>
          <li>Define as finalidades e meios de processamento dos dados</li>
          <li>Responsável pela conformidade com a LGPD</li>
        </ul>
        <p><strong>Dados do Controlador:</strong></p>
        <ul>
          <li><strong>Razão Social:</strong> TeleCuidar Tecnologia em Saúde LTDA</li>
          <li><strong>CNPJ:</strong> XX.XXX.XXX/0001-XX</li>
          <li><strong>Endereço:</strong> Belo Horizonte, MG - Brasil</li>
          <li><strong>Contato:</strong> privacidade@telecuidar.com.br</li>
        </ul>
      `
    },
    {
      id: 'dpo',
      title: '3. Encarregado de Dados (DPO)',
      icon: '👔',
      content: `
        <p>Conforme exigido pela LGPD, a TeleCuidar designou um <strong>Encarregado pelo Tratamento de Dados Pessoais (DPO)</strong>:</p>
        <ul>
          <li><strong>Canal de Comunicação:</strong> dpo@telecuidar.com.br</li>
        </ul>
        <p><strong>Responsabilidades do DPO:</strong></p>
        <ul>
          <li>Aceitar reclamações e comunicações dos titulares, prestar esclarecimentos e adotar providências</li>
          <li>Receber comunicações da Autoridade Nacional de Proteção de Dados (ANPD) e adotar providências</li>
          <li>Orientar os funcionários e contratados sobre as práticas de proteção de dados</li>
          <li>Executar as demais atribuições determinadas pelo controlador ou estabelecidas em normas complementares</li>
        </ul>
      `
    },
    {
      id: 'legal-bases',
      title: '4. Bases Legais do Tratamento',
      icon: '⚖️',
      content: `
        <p>A TeleCuidar trata dados pessoais com fundamento nas seguintes bases legais previstas no Art. 7º e Art. 11 da LGPD:</p>
        <table class="lgpd-table">
          <thead>
            <tr>
              <th>Base Legal</th>
              <th>Artigo</th>
              <th>Aplicação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Consentimento</strong></td>
              <td>Art. 7º, I</td>
              <td>Coleta de dados pessoais durante o cadastro</td>
            </tr>
            <tr>
              <td><strong>Execução de Contrato</strong></td>
              <td>Art. 7º, V</td>
              <td>Prestação dos serviços de telemedicina</td>
            </tr>
            <tr>
              <td><strong>Obrigação Legal</strong></td>
              <td>Art. 7º, II</td>
              <td>Cumprimento de normas do CFM e vigilância sanitária</td>
            </tr>
            <tr>
              <td><strong>Tutela da Saúde</strong></td>
              <td>Art. 11, II, f</td>
              <td>Tratamento de dados sensíveis de saúde</td>
            </tr>
            <tr>
              <td><strong>Legítimo Interesse</strong></td>
              <td>Art. 7º, IX</td>
              <td>Melhoria dos serviços e segurança da plataforma</td>
            </tr>
          </tbody>
        </table>
      `
    },
    {
      id: 'rights',
      title: '5. Direitos dos Titulares',
      icon: '✋',
      content: `
        <p>A LGPD garante aos titulares de dados pessoais os seguintes direitos, que a TeleCuidar respeita integralmente:</p>
        <ul>
          <li><strong>Confirmação e Acesso (Art. 18, I e II):</strong> Confirmar a existência e acessar seus dados pessoais</li>
          <li><strong>Correção (Art. 18, III):</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
          <li><strong>Anonimização, Bloqueio ou Eliminação (Art. 18, IV):</strong> Para dados desnecessários ou excessivos</li>
          <li><strong>Portabilidade (Art. 18, V):</strong> Transferir seus dados para outro fornecedor</li>
          <li><strong>Eliminação (Art. 18, VI):</strong> Excluir dados tratados com base no consentimento</li>
          <li><strong>Informação sobre Compartilhamento (Art. 18, VII):</strong> Saber com quem seus dados são compartilhados</li>
          <li><strong>Revogação do Consentimento (Art. 18, IX):</strong> Retirar o consentimento a qualquer momento</li>
        </ul>
        <p class="highlight-box">Para exercer seus direitos, entre em contato: <a href="mailto:privacidade@telecuidar.com.br">privacidade@telecuidar.com.br</a></p>
      `
    },
    {
      id: 'security',
      title: '6. Medidas de Segurança',
      icon: '🛡️',
      content: `
        <p>A TeleCuidar implementa medidas técnicas e administrativas robustas para proteger os dados pessoais:</p>
        <p><strong>Medidas Técnicas:</strong></p>
        <ul>
          <li>Criptografia AES-256 para dados em repouso</li>
          <li>Criptografia TLS 1.3 para dados em trânsito</li>
          <li>Autenticação multifator (MFA)</li>
          <li>Controle de acesso baseado em funções (RBAC)</li>
          <li>Logs de auditoria completos</li>
          <li>Backups criptografados e redundantes</li>
          <li>Firewall e sistemas de detecção de intrusão</li>
        </ul>
        <p><strong>Medidas Administrativas:</strong></p>
        <ul>
          <li>Política de Segurança da Informação</li>
          <li>Treinamentos regulares em proteção de dados</li>
          <li>Gestão de incidentes de segurança</li>
          <li>Avaliações periódicas de vulnerabilidades</li>
          <li>Acordos de confidencialidade com colaboradores</li>
        </ul>
      `
    },
    {
      id: 'health-data',
      title: '7. Dados Sensíveis de Saúde',
      icon: '🏥',
      content: `
        <p>A TeleCuidar trata dados sensíveis de saúde com proteção especial, conforme Art. 11 da LGPD:</p>
        <p><strong>Categorias de Dados Sensíveis:</strong></p>
        <ul>
          <li>Prontuário eletrônico e histórico médico</li>
          <li>Diagnósticos e prescrições</li>
          <li>Resultados de exames</li>
          <li>Dados biométricos de saúde (pressão, temperatura, etc.)</li>
          <li>Alergias e condições pré-existentes</li>
        </ul>
        <p><strong>Proteções Adicionais:</strong></p>
        <ul>
          <li>Acesso restrito apenas a profissionais de saúde autorizados</li>
          <li>Sigilo médico garantido conforme Código de Ética Médica</li>
          <li>Criptografia adicional para dados de saúde</li>
          <li>Retenção conforme prazos legais do CFM (mínimo 20 anos)</li>
        </ul>
      `
    },
    {
      id: 'retention',
      title: '8. Retenção e Eliminação',
      icon: '⏱️',
      content: `
        <p>Os dados pessoais são retidos pelo tempo necessário para cumprir as finalidades para as quais foram coletados:</p>
        <table class="lgpd-table">
          <thead>
            <tr>
              <th>Tipo de Dado</th>
              <th>Período de Retenção</th>
              <th>Base Legal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Prontuário Médico</td>
              <td>Mínimo 20 anos</td>
              <td>Resolução CFM 1.821/2007</td>
            </tr>
            <tr>
              <td>Dados de Cadastro</td>
              <td>Enquanto houver relação ativa</td>
              <td>Execução de contrato</td>
            </tr>
            <tr>
              <td>Logs de Acesso</td>
              <td>6 meses</td>
              <td>Marco Civil da Internet</td>
            </tr>
            <tr>
              <td>Dados Fiscais</td>
              <td>5 anos</td>
              <td>Legislação tributária</td>
            </tr>
          </tbody>
        </table>
        <p>Após o término do período de retenção, os dados são eliminados de forma segura ou anonimizados.</p>
      `
    },
    {
      id: 'incident',
      title: '9. Incidentes de Segurança',
      icon: '🚨',
      content: `
        <p>A TeleCuidar possui um plano de resposta a incidentes de segurança conforme Art. 48 da LGPD:</p>
        <p><strong>Em caso de incidente que possa acarretar risco ou dano relevante:</strong></p>
        <ul>
          <li>Comunicação à ANPD em prazo razoável</li>
          <li>Comunicação aos titulares afetados</li>
          <li>Descrição da natureza dos dados afetados</li>
          <li>Informações sobre as medidas adotadas para reverter ou mitigar os efeitos</li>
        </ul>
        <p><strong>Medidas Preventivas:</strong></p>
        <ul>
          <li>Monitoramento 24/7 de sistemas</li>
          <li>Testes de penetração regulares</li>
          <li>Equipe de resposta a incidentes treinada</li>
          <li>Backups com recuperação rápida</li>
        </ul>
      `
    },
    {
      id: 'anpd',
      title: '10. ANPD e Reclamações',
      icon: '🏛️',
      content: `
        <p>A <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> é o órgão responsável por zelar pela proteção de dados pessoais no Brasil.</p>
        <p><strong>Contato com a TeleCuidar:</strong></p>
        <p>Antes de recorrer à ANPD, recomendamos entrar em contato conosco para resolver qualquer questão:</p>
        <ul>
          <li><strong>E-mail:</strong> privacidade@telecuidar.com.br</li>
          <li><strong>DPO:</strong> dpo@telecuidar.com.br</li>
        </ul>
        <p><strong>Reclamação à ANPD:</strong></p>
        <p>Caso não obtenha resposta satisfatória, você pode registrar uma reclamação junto à ANPD:</p>
        <ul>
          <li><strong>Site:</strong> <a href="https://www.gov.br/anpd" target="_blank" rel="noopener">www.gov.br/anpd</a></li>
          <li><strong>Canal de Atendimento:</strong> Peticionamento Eletrônico da ANPD</li>
        </ul>
      `
    }
  ];

  principles = [
    { name: 'Finalidade', description: 'Tratamento para propósitos legítimos e específicos', icon: '🎯' },
    { name: 'Adequação', description: 'Compatibilidade com as finalidades informadas', icon: '✓' },
    { name: 'Necessidade', description: 'Limitação ao mínimo necessário', icon: '📊' },
    { name: 'Livre Acesso', description: 'Consulta facilitada sobre o tratamento', icon: '🔓' },
    { name: 'Qualidade', description: 'Dados exatos, claros e atualizados', icon: '⭐' },
    { name: 'Transparência', description: 'Informações claras e acessíveis', icon: '👁️' },
    { name: 'Segurança', description: 'Proteção contra acessos não autorizados', icon: '🔐' },
    { name: 'Prevenção', description: 'Medidas para evitar danos', icon: '🛡️' },
    { name: 'Não Discriminação', description: 'Impossibilidade de tratamento discriminatório', icon: '⚖️' },
    { name: 'Responsabilização', description: 'Demonstração de conformidade', icon: '📋' }
  ];
}
