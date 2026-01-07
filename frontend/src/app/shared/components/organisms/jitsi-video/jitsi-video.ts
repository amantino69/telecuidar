import { 
  Component, 
  OnInit, 
  OnDestroy, 
  Input, 
  Output, 
  EventEmitter, 
  ElementRef, 
  ViewChild,
  Inject,
  PLATFORM_ID,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { JitsiService, JitsiToken, JitsiCallState } from '@core/services/jitsi.service';
import { ThemeService } from '@core/services/theme.service';
import { DeviceDetectorService } from '@core/services/device-detector.service';
import { IconComponent } from '@shared/components/atoms/icon/icon';
import { ButtonComponent } from '@shared/components/atoms/button/button';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-jitsi-video',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  templateUrl: './jitsi-video.html',
  styleUrls: ['./jitsi-video.scss']
})
export class JitsiVideoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('jitsiContainer', { static: true }) jitsiContainer!: ElementRef;
  
  @Input() appointmentId!: string;
  @Input() showControls = true;
  @Input() width: string | number = '100%';
  @Input() height: string | number = '100%';
  
  @Output() participantJoined = new EventEmitter<any>();
  @Output() participantLeft = new EventEmitter<any>();
  @Output() conferenceJoined = new EventEmitter<any>();
  @Output() conferenceLeft = new EventEmitter<any>();
  @Output() callEnded = new EventEmitter<void>();
  @Output() errorOccurred = new EventEmitter<string>();

  // Estados
  isLoading = true;
  isConnected = false;
  isMuted = false;
  isVideoOff = false;
  isScreenSharing = false;
  participantCount = 0;
  errorMessage: string | null = null;
  token: JitsiToken | null = null;
  isModerator = false;
  
  // Tema
  isDarkTheme = false;
  
  // Deep link para app móvel
  isAndroid = false;
  isIOS = false;
  showMobileAppPrompt = false;
  jitsiDeepLink: string | null = null;
  userDeclinedMobileApp = false;

  private subscriptions: Subscription[] = [];
  private containerId = 'jitsi-meet-container';
  private isBrowser: boolean;

  constructor(
    private jitsiService: JitsiService,
    private themeService: ThemeService,
    private deviceDetector: DeviceDetectorService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.isAndroid = this.deviceDetector.isAndroid();
      this.isIOS = this.deviceDetector.isIOS();
    }
  }

  ngOnInit(): void {
    // Observar mudanças de tema
    if (this.isBrowser) {
      this.subscriptions.push(
        this.themeService.isDarkTheme$.subscribe(isDark => {
          this.isDarkTheme = isDark;
        })
      );
    }

    // Observar estado da chamada
    this.subscriptions.push(
      this.jitsiService.callState$.subscribe(state => {
        this.updateState(state);
      })
    );
  }

  ngAfterViewInit(): void {
    if (this.isBrowser && this.appointmentId) {
      // Executar a inicialização assincronamente para evitar
      // ExpressionChangedAfterItHasBeenCheckedError quando o
      // estado interno é atualizado durante o ciclo de vida do Angular.
      setTimeout(() => {
        this.initializeCall();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.jitsiService.dispose();
  }

  private updateState(state: JitsiCallState): void {
    this.isLoading = state.isLoading;
    this.isConnected = state.isConnected;
    this.isMuted = state.isMuted;
    this.isVideoOff = state.isVideoOff;
    this.isScreenSharing = state.isScreenSharing;
    this.participantCount = state.participantCount;
    
    if (state.error && state.error !== this.errorMessage) {
      this.errorMessage = state.error;
      this.errorOccurred.emit(state.error || 'Erro desconhecido');
    }
    // Forçar detecção para garantir que o template reflita mudanças
    try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
  }

  async initializeCall(): Promise<void> {
    if (!this.isBrowser) return;

    this.isLoading = true;
    this.errorMessage = null;

    try {
      // Obter token do backend
      this.token = await this.jitsiService.getToken(this.appointmentId).toPromise() || null;
      
      if (!this.token) {
        throw new Error('Não foi possível obter autorização para a videochamada');
      }

      this.isModerator = this.token.isModerator;

      // Em dispositivos Android/iOS, mostrar opção de abrir no app
      // O app permite compartilhamento de tela + split-screen com o sistema
      if ((this.isAndroid || this.isIOS) && !this.userDeclinedMobileApp) {
        this.generateDeepLink();
        this.showMobileAppPrompt = true;
        this.isLoading = false;
        try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
        return;
      }

      // Inicializar chamada no navegador
      await this.jitsiService.initCall(this.containerId, this.token, {
        width: this.width,
        height: this.height,
        onParticipantJoined: (p) => this.participantJoined.emit(p),
        onParticipantLeft: (p) => this.participantLeft.emit(p),
        onVideoConferenceJoined: (info) => this.conferenceJoined.emit(info),
        onVideoConferenceLeft: (info) => {
          this.conferenceLeft.emit(info);
        },
        onReadyToClose: () => {
          this.callEnded.emit();
        },
        onError: (error) => {
          this.errorMessage = error?.message || 'Erro na videochamada';
          this.errorOccurred.emit(this.errorMessage || 'Erro desconhecido');
        }
      });

      this.isLoading = false;
      try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar videochamada';
      this.errorOccurred.emit(this.errorMessage || 'Erro desconhecido');
      try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
    }
  }

  // Controles
  toggleMute(): void {
    this.jitsiService.toggleAudio();
  }

  toggleVideo(): void {
    this.jitsiService.toggleVideo();
  }

  toggleScreenShare(): void {
    this.jitsiService.toggleScreenShare();
  }

  openChat(): void {
    this.jitsiService.openChat();
  }

  muteAll(): void {
    if (this.isModerator) {
      this.jitsiService.muteEveryone();
    }
  }

  hangup(): void {
    this.jitsiService.hangup();
    this.callEnded.emit();
  }

  retry(): void {
    this.errorMessage = null;
    this.initializeCall();
  }

  // ===== DEEP LINK PARA APP MÓVEL =====

  /**
   * Retorna a URL completa da sala com JWT para exibição
   */
  getFullRoomUrl(): string {
    if (!this.token) return '';
    
    let url = `https://${this.token.domain}/${this.token.roomName}`;
    if (this.token.token) {
      url += `?jwt=${this.token.token}`;
    }
    return url;
  }

  /**
   * Gera o deep link para abrir no app Jitsi Meet
   * Usamos uma página intermediária que tenta abrir o app automaticamente
   */
  private generateDeepLink(): void {
    if (!this.token) return;

    // URL da página intermediária que abre o app
    // Esta página tenta abrir o app e oferece fallback
    const openAppUrl = `https://${this.token.domain}/open-app?room=${this.token.roomName}`;
    
    // Adicionar JWT se existir
    if (this.token.token) {
      this.jitsiDeepLink = `${openAppUrl}&jwt=${this.token.token}`;
    } else {
      this.jitsiDeepLink = openAppUrl;
    }
  }

  /**
   * Abre o app Jitsi Meet através da página intermediária
   * Esta página lida com a lógica de abrir o app ou fallback para web
   */
  openInMobileApp(): void {
    if (!this.token) return;

    const domain = this.token.domain;
    const roomName = this.token.roomName;
    const jwt = this.token.token;
    
    console.log('[JitsiVideo] Abrindo sala:', roomName);
    console.log('[JitsiVideo] Domínio:', domain);
    console.log('[JitsiVideo] JWT presente:', !!jwt);
    
    // Usar deep link direto do Jitsi Meet
    // O app Jitsi Meet aceita URLs no formato: org.jitsi.meet://server/room?jwt=TOKEN
    let deepLink = `org.jitsi.meet://${domain}/${roomName}`;
    if (jwt) {
      deepLink += `?jwt=${jwt}`;
    }
    
    console.log('[JitsiVideo] Deep link:', deepLink);
    
    // Abrir o deep link
    window.location.href = deepLink;
  }

  /**
   * Usuário escolheu continuar no navegador em vez do app
   */
  continueInBrowser(): void {
    this.showMobileAppPrompt = false;
    this.userDeclinedMobileApp = true;
    this.initializeCall(); // Reinicia a chamada no modo web
  }

  /**
   * Copia o nome da sala pública (para meet.jit.si) para a área de transferência
   */
  copyPublicRoomName(): void {
    if (!this.token) return;
    
    const roomName = this.token.publicRoomName || `telecuidar-${this.token.roomName}`;
    
    navigator.clipboard.writeText(roomName).then(() => {
      console.log('[JitsiVideo] Nome da sala copiado:', roomName);
      alert(`✅ Nome da sala copiado!\n\n📋 ${roomName}\n\nAgora:\n1. Abra o App Jitsi Meet\n2. Cole "${roomName}" no campo de texto\n3. Toque em "Entrar"`);
    }).catch(err => {
      console.error('[JitsiVideo] Erro ao copiar:', err);
      prompt('Copie o nome da sala:', roomName);
    });
  }

  /**
   * Copia a URL completa da sala (com JWT) para a área de transferência
   * Usado para servidor self-hosted
   */
  copyRoomUrl(): void {
    if (!this.token) return;
    
    // URL completa com JWT para autenticação
    const roomUrl = this.getFullRoomUrl();
    
    navigator.clipboard.writeText(roomUrl).then(() => {
      console.log('[JitsiVideo] URL da sala copiada (com JWT)');
      alert('✅ URL copiada!\n\nAgora:\n1. Abra o App Jitsi Meet\n2. Na TELA INICIAL, cole a URL no campo de texto\n3. Toque no botão azul "Entrar"');
    }).catch(err => {
      console.error('[JitsiVideo] Erro ao copiar:', err);
      // Fallback: mostrar a URL para copiar manualmente
      prompt('Copie a URL abaixo:', roomUrl);
    });
  }

  /**
   * Abre a loja de apps para baixar o Jitsi Meet
   */
  downloadMobileApp(): void {
    if (this.isAndroid) {
      window.open('https://play.google.com/store/apps/details?id=org.jitsi.meet', '_blank');
    } else if (this.isIOS) {
      window.open('https://apps.apple.com/app/jitsi-meet/id1165655521', '_blank');
    }
  }
}
