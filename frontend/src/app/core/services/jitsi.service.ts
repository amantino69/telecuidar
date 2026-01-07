import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '@env/environment';

const API_BASE_URL = environment.apiUrl;

/**
 * Configuração do Jitsi retornada pelo backend
 */
export interface JitsiConfig {
  enabled: boolean;
  domain: string;
  requiresAuth: boolean;
}

/**
 * Token JWT para acesso ao Jitsi
 */
export interface JitsiToken {
  token: string;
  roomName: string;
  domain: string;
  publicDomain: string;      // Servidor público (meet.jit.si) para app mobile
  publicRoomName: string;    // Nome da sala no servidor público
  displayName: string;
  email: string;
  avatarUrl?: string;
  isModerator: boolean;
  expiresAt: number;
}

/**
 * Opções de configuração da interface do Jitsi
 */
export interface JitsiInterfaceConfig {
  SHOW_JITSI_WATERMARK: boolean;
  SHOW_WATERMARK_FOR_GUESTS: boolean;
  SHOW_BRAND_WATERMARK: boolean;
  BRAND_WATERMARK_LINK: string;
  JITSI_WATERMARK_LINK: string;
  DEFAULT_LOGO_URL: string;
  DEFAULT_WELCOME_PAGE_LOGO_URL: string;
  HIDE_DEEP_LINKING_LOGO: boolean;
  SHOW_POWERED_BY: boolean;
  SHOW_PROMOTIONAL_CLOSE_PAGE: boolean;
  DISABLE_JOIN_LEAVE_NOTIFICATIONS: boolean;
  DISABLE_PRESENCE_STATUS: boolean;
  DISABLE_FOCUS_INDICATOR: boolean;
  DISABLE_DOMINANT_SPEAKER_INDICATOR: boolean;
  DISABLE_VIDEO_BACKGROUND: boolean;
  GENERATE_ROOMNAMES_ON_WELCOME_PAGE: boolean;
  MOBILE_APP_PROMO: boolean;
  HIDE_INVITE_MORE_HEADER: boolean;
  TOOLBAR_BUTTONS: string[];
  SETTINGS_SECTIONS: string[];
  DEFAULT_BACKGROUND: string;
  DEFAULT_LOCAL_DISPLAY_NAME: string;
  DEFAULT_REMOTE_DISPLAY_NAME: string;
  LANG_DETECTION: boolean;
  filmStripOnly: boolean;
  VERTICAL_FILMSTRIP: boolean;
  TILE_VIEW_MAX_COLUMNS: number;
}

/**
 * Opções de configuração do Jitsi
 */
export interface JitsiConfigOptions {
  startWithAudioMuted: boolean;
  startWithVideoMuted: boolean;
  enableWelcomePage: boolean;
  enableClosePage: boolean;
  prejoinPageEnabled: boolean;
  disableDeepLinking: boolean;
  enableNoisyMicDetection: boolean;
  enableNoAudioDetection: boolean;
  requireDisplayName: boolean;
  defaultLanguage: string;
  disableThirdPartyRequests: boolean;
  enableLobbyChat: boolean;
  hideLobbyButton: boolean;
  autoKnockLobby: boolean;
  lobby: {
    autoKnock: boolean;
    enableChat: boolean;
  };
  toolbarButtons?: string[];
  hideConferenceSubject: boolean;
  hideConferenceTimer: boolean;
  hideParticipantsStats: boolean;
  disablePolls: boolean;
  disableReactions: boolean;
  disableProfile: boolean;
  disableRemoteMute: boolean;
  remoteVideoMenu: {
    disableKick: boolean;
    disableGrantModerator: boolean;
  };
  disableLocalVideoFlip: boolean;
  disableInviteFunctions: boolean;
  doNotStoreRoom: boolean;
  disableAddingBackgroundImages: boolean;
  notifications: string[];
  connectionIndicators: {
    disabled: boolean;
  };
}

/**
 * Estado atual da chamada
 */
export interface JitsiCallState {
  isConnected: boolean;
  isLoading: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  error: string | null;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class JitsiService {
  private apiUrl = `${API_BASE_URL}/jitsi`;
  private jitsiApi: any = null;
  private scriptLoaded = false;
  
  // Estado da chamada
  private callState = new BehaviorSubject<JitsiCallState>({
    isConnected: false,
    isLoading: false,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    participantCount: 0,
    error: null
  });
  
  public callState$ = this.callState.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {}

  /**
   * Obtém as configurações do Jitsi do backend
   */
  getConfig(): Observable<JitsiConfig> {
    return this.http.get<JitsiConfig>(`${this.apiUrl}/config`);
  }

  /**
   * Obtém um token JWT para acesso à sala
   */
  getToken(appointmentId: string): Observable<JitsiToken> {
    return this.http.get<JitsiToken>(`${this.apiUrl}/token/${appointmentId}`);
  }

  /**
   * Valida se o usuário tem acesso à sala
   */
  validateAccess(appointmentId: string): Observable<boolean> {
    return this.http.get<{ hasAccess: boolean }>(`${this.apiUrl}/validate/${appointmentId}`).pipe(
      map(response => response.hasAccess),
      catchError(() => of(false))
    );
  }

  /**
   * Carrega o script da External API do Jitsi
   */
  loadJitsiScript(domain: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        reject(new Error('Jitsi só pode ser carregado no navegador'));
        return;
      }

      if (this.scriptLoaded && window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      // Verificar se já existe
      const existingScript = document.querySelector('script[src*="external_api.js"]');
      if (existingScript) {
        if (window.JitsiMeetExternalAPI) {
          this.scriptLoaded = true;
          resolve();
        } else {
          existingScript.addEventListener('load', () => {
            this.scriptLoaded = true;
            resolve();
          });
          existingScript.addEventListener('error', () => {
            reject(new Error('Erro ao carregar script do Jitsi'));
          });
        }
        return;
      }

      const script = document.createElement('script');
      // Jitsi sempre usa HTTPS (certificado auto-assinado em dev, Let's Encrypt em prod)
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Erro ao carregar script do Jitsi'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Inicializa a videochamada em um elemento DOM
   */
  async initCall(
    containerId: string,
    token: JitsiToken,
    options?: {
      width?: string | number;
      height?: string | number;
      onParticipantJoined?: (participant: any) => void;
      onParticipantLeft?: (participant: any) => void;
      onVideoConferenceJoined?: (info: any) => void;
      onVideoConferenceLeft?: (info: any) => void;
      onReadyToClose?: () => void;
      onError?: (error: any) => void;
    }
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Jitsi só pode ser inicializado no navegador');
    }

    this.updateCallState({ isLoading: true, error: null });

    try {
      // Carregar script primeiro
      await this.loadJitsiScript(token.domain);

      // NOTA: Todas as configurações (config e interfaceConfig) estão definidas
      // no servidor Jitsi (custom-config.js e custom-interface_config.js).
      // As informações do usuário (displayName, email, avatar, moderator) já estão
      // incluídas no JWT (context.user), então não precisamos passar novamente.
      // 
      // Isso resulta em uma URL limpa: apenas roomName + jwt
      
      // Criar instância do Jitsi - mínimo de parâmetros
      // O JWT contém: room, context.user (id, name, email, avatar, moderator), features
      this.jitsiApi = new window.JitsiMeetExternalAPI(token.domain, {
        roomName: token.roomName,
        width: options?.width || '100%',
        height: options?.height || '100%',
        parentNode: document.getElementById(containerId),
        jwt: token.token || undefined
        // Não passamos configOverwrite, interfaceConfigOverwrite, userInfo ou lang
        // pois tudo já está configurado no servidor ou no JWT
      });

      // Configurar permissões do iframe para câmera e microfone.
      // A JitsiMeetExternalAPI cria o iframe de forma assíncrona, então tentamos
      // aplicar o atributo `allow` com várias tentativas até o iframe existir.
      const trySetIframeAllow = (attempts = 0) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const iframe = container.querySelector('iframe');
        if (iframe) {
          try {
            iframe.setAttribute('allow', 'camera; microphone; display-capture; autoplay; clipboard-write; fullscreen');
          } catch (e) {
            // ignore
          }
          return;
        }
        if (attempts < 10) {
          setTimeout(() => trySetIframeAllow(attempts + 1), 100);
        }
      };
      trySetIframeAllow();

      // Event listeners
      this.setupEventListeners(options);

      this.updateCallState({ isLoading: false, isConnected: true });
    } catch (error) {
      this.updateCallState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Erro ao inicializar videochamada' 
      });
      throw error;
    }
  }

  /**
   * Configura os event listeners do Jitsi
   */
  private setupEventListeners(options?: {
    onParticipantJoined?: (participant: any) => void;
    onParticipantLeft?: (participant: any) => void;
    onVideoConferenceJoined?: (info: any) => void;
    onVideoConferenceLeft?: (info: any) => void;
    onReadyToClose?: () => void;
    onError?: (error: any) => void;
  }): void {
    if (!this.jitsiApi) return;

    // Participante entrou
    this.jitsiApi.addListener('participantJoined', (participant: any) => {
      this.updateCallState({ 
        participantCount: this.callState.value.participantCount + 1 
      });
      options?.onParticipantJoined?.(participant);
    });

    // Participante saiu
    this.jitsiApi.addListener('participantLeft', (participant: any) => {
      this.updateCallState({ 
        participantCount: Math.max(0, this.callState.value.participantCount - 1) 
      });
      options?.onParticipantLeft?.(participant);
    });

    // Entrou na conferência
    this.jitsiApi.addListener('videoConferenceJoined', (info: any) => {
      this.updateCallState({ isConnected: true, participantCount: 1 });
      options?.onVideoConferenceJoined?.(info);
    });

    // Saiu da conferência
    this.jitsiApi.addListener('videoConferenceLeft', (info: any) => {
      this.updateCallState({ isConnected: false, participantCount: 0 });
      options?.onVideoConferenceLeft?.(info);
    });

    // Pronto para fechar
    this.jitsiApi.addListener('readyToClose', () => {
      options?.onReadyToClose?.();
    });

    // Erros
    this.jitsiApi.addListener('errorOccurred', (error: any) => {
      this.updateCallState({ error: error.message || 'Erro na videochamada' });
      options?.onError?.(error);
    });

    // Estado do áudio
    this.jitsiApi.addListener('audioMuteStatusChanged', (status: { muted: boolean }) => {
      this.updateCallState({ isMuted: status.muted });
    });

    // Estado do vídeo
    this.jitsiApi.addListener('videoMuteStatusChanged', (status: { muted: boolean }) => {
      this.updateCallState({ isVideoOff: status.muted });
    });

    // Compartilhamento de tela
    this.jitsiApi.addListener('screenSharingStatusChanged', (status: { on: boolean }) => {
      this.updateCallState({ isScreenSharing: status.on });
    });
  }

  /**
   * Atualiza o estado da chamada
   */
  private updateCallState(updates: Partial<JitsiCallState>): void {
    const nextState = { ...this.callState.value, ...updates };
    // Garantir que a emissão aconteça dentro do NgZone para disparar
    // a detecção de mudanças do Angular quando eventos externos (iframe)
    // atualizam o estado.
    this.ngZone.run(() => this.callState.next(nextState));
  }

  /**
   * Alterna o áudio (mute/unmute)
   */
  toggleAudio(): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleAudio');
    }
  }

  /**
   * Alterna o vídeo (liga/desliga câmera)
   */
  toggleVideo(): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleVideo');
    }
  }

  /**
   * Alterna compartilhamento de tela
   */
  toggleScreenShare(): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleShareScreen');
    }
  }

  /**
   * Alterna tela cheia
   */
  toggleFullscreen(): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleFilmStrip');
    }
  }

  /**
   * Entra em modo tile view
   */
  setTileView(enabled: boolean): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleTileView');
    }
  }

  /**
   * Muta todos os participantes (apenas moderador)
   */
  muteEveryone(): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('muteEveryone');
    }
  }

  /**
   * Abre o chat
   */
  openChat(): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleChat');
    }
  }

  /**
   * Encerra a chamada
   */
  hangup(): void {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('hangup');
    }
  }

  /**
   * Destrói a instância do Jitsi e limpa recursos
   */
  dispose(): void {
    if (this.jitsiApi) {
      this.jitsiApi.dispose();
      this.jitsiApi = null;
    }

    this.updateCallState({
      isConnected: false,
      isLoading: false,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      participantCount: 0,
      error: null
    });
  }

  /**
   * Retorna se há uma chamada ativa
   */
  isActive(): boolean {
    return this.jitsiApi !== null;
  }

  /**
   * Obtém informações dos participantes
   */
  getParticipantsInfo(): any[] {
    if (!this.jitsiApi) return [];
    return this.jitsiApi.getParticipantsInfo();
  }

  /**
   * Obtém estatísticas da chamada
   */
  getVideoQuality(): any {
    if (!this.jitsiApi) return null;
    return this.jitsiApi.getVideoQuality();
  }
}
