import { Injectable, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { ModalService } from './modal.service';
import { JitsiService } from './jitsi.service';

@Injectable({
  providedIn: 'root'
})
export class DictationService {
  private recognition: any;
  private isListening = false;
  private activeElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private lastInterim = '';
  private ignoreResultsUntilIndex = -1; // Ignore results with index <= this value
  private lastResultIndex = -1; // Track the latest result index
  private isBrowser: boolean;
  
  public isDictationActive$ = new BehaviorSubject<boolean>(false);
  public isListening$ = new BehaviorSubject<boolean>(false);
  public isInitializing$ = new BehaviorSubject<boolean>(false); // Estado de inicialização
  public lastTranscript$ = new BehaviorSubject<string>(''); // Para feedback visual

  constructor(
    private zone: NgZone, 
    private modalService: ModalService,
    private jitsiService: JitsiService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.initRecognition();
    }
  }

  private initRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('[Dictation] SpeechRecognition não suportado neste navegador');
      return;
    }

    console.log('[Dictation] Inicializando reconhecimento de voz...');
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'pt-BR';

    this.recognition.onstart = () => {
      console.log('[Dictation] Reconhecimento iniciado');
    };

    this.recognition.onresult = (event: any) => {
      this.zone.run(() => {
        // Track the latest result index (used when focusing a new field)
        this.lastResultIndex = event.results.length - 1;
        this.handleResult(event);
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('[Dictation] Erro:', event.error);
      this.zone.run(() => {
        // Erros que devem parar o ditado
        if (event.error === 'not-allowed') {
          this.modalService.alert({
            title: 'Microfone Bloqueado',
            message: 'Por favor, permita o acesso ao microfone nas configurações do navegador.',
            variant: 'warning'
          }).subscribe();
          this.stopListening();
        } else if (event.error === 'audio-capture') {
          this.modalService.alert({
            title: 'Microfone Indisponível',
            message: 'Não foi possível acessar o microfone. Verifique se ele está conectado.',
            variant: 'warning'
          }).subscribe();
          this.stopListening();
        }
        // Erros transientes (no-speech, network, aborted) - apenas loga, o onend vai reiniciar
        // Não faz nada aqui para permitir reinício automático
      });
    };

    this.recognition.onend = () => {
      console.log('[Dictation] Reconhecimento terminou, isDictationActive:', this.isDictationActive$.value);
      this.zone.run(() => {
        // Reinicia automaticamente se o modo ditado ainda está ativo
        if (this.isDictationActive$.value) {
          console.log('[Dictation] Reiniciando reconhecimento automaticamente...');
          setTimeout(() => {
            try {
              if (this.isDictationActive$.value) {
                this.recognition.start();
                this.isListening = true;
                this.isListening$.next(true);
              }
            } catch (e) {
              console.error('[Dictation] Erro ao reiniciar:', e);
            }
          }, 100); // Pequeno delay para evitar conflitos
        } else {
          this.isListening = false;
          this.isListening$.next(false);
        }
      });
    };
    
    // Setup global focus listener to track active input
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        this.activeElement = target;
        this.lastInterim = '';
        // Ignore all results captured before this field was focused
        this.ignoreResultsUntilIndex = this.lastResultIndex;
        console.log('[Dictation] Campo focado:', target.id || target.name || 'sem id');
      }
    });

    // Setup global blur listener to stop writing when field loses focus
    document.addEventListener('focusout', (e) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        // Only clear if it's the currently active element
        if (this.activeElement === target) {
          console.log('[Dictation] Campo perdeu foco');
          this.activeElement = null;
          this.lastInterim = '';
        }
      }
    });
    
    console.log('[Dictation] Inicialização completa');
  }

  toggleDictation() {
    // Previne cliques múltiplos durante inicialização
    if (this.isInitializing$.value) {
      console.log('[Dictation] Já está inicializando, ignorando clique');
      return;
    }
    
    if (this.isDictationActive$.value) {
      this.stopDictation();
    } else {
      this.startDictation();
    }
  }

  async startDictation() {
    if (!this.isBrowser) {
      console.warn('[Dictation] Não disponível no servidor');
      return;
    }
    
    if (!this.recognition) {
      this.modalService.alert({
        title: 'Recurso Indisponível',
        message: 'Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.',
        variant: 'warning'
      }).subscribe();
      return;
    }
    
    // Indica que está inicializando (feedback visual imediato)
    this.isInitializing$.next(true);
    console.log('[Dictation] Solicitando acesso ao microfone...');
    
    // Solicita acesso explícito ao microfone primeiro
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Dictation] Microfone liberado com sucesso');
      
      // Lista dispositivos para diagnóstico
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      console.log('[Dictation] Microfones disponíveis:', audioInputs.map(d => d.label || 'Sem nome'));
      
      // Verifica se tem áudio ativo
      const audioTrack = stream.getAudioTracks()[0];
      console.log('[Dictation] Usando microfone:', audioTrack.label);
      
      // Para o stream de teste (o SpeechRecognition vai criar o próprio)
      stream.getTracks().forEach(t => t.stop());
      
    } catch (err) {
      console.error('[Dictation] Erro ao acessar microfone:', err);
      this.isInitializing$.next(false); // Desativa estado de inicialização em caso de erro
      this.modalService.alert({
        title: 'Microfone Inacessível',
        message: 'Não foi possível acessar o microfone. Verifique as permissões do navegador.',
        variant: 'warning'
      }).subscribe();
      return;
    }
    
    console.log('[Dictation] Ativando modo ditado...');
    this.isDictationActive$.next(true);
    this.isInitializing$.next(false); // Desativa estado de inicialização após sucesso
    
    // Muta o microfone do Jitsi para o paciente não ouvir o médico ditando
    this.jitsiService.setLocalAudioMuted(true);
    
    this.startListening();
  }

  stopDictation() {
    this.isDictationActive$.next(false);
    this.isInitializing$.next(false); // Garante que inicialização está desativada
    this.stopListening();
    this.activeElement = null;
    this.lastInterim = '';
    
    // Desmuta o microfone do Jitsi quando parar de ditar
    this.jitsiService.setLocalAudioMuted(false);
  }

  private startListening() {
    if (!this.isListening && this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
        this.isListening$.next(true);
      } catch (e) {
        console.error('Error starting speech recognition', e);
      }
    }
  }

  private stopListening() {
    if (this.isListening && this.recognition) {
      this.isListening = false;
      this.isListening$.next(false);
      this.recognition.stop();
    }
  }

  private handleResult(event: any) {
    if (!this.activeElement) {
      console.log('[Dictation] Nenhum campo com foco - texto ignorado');
      return;
    }

    let newFinals = '';
    let newInterim = '';

    // Only process results with index > ignoreResultsUntilIndex
    const startIndex = Math.max(event.resultIndex, this.ignoreResultsUntilIndex + 1);
    
    for (let i = startIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        if (newFinals && !newFinals.endsWith(' ') && !transcript.startsWith(' ')) {
          newFinals += ' ';
        }
        newFinals += transcript;
      } else {
        newInterim += transcript;
      }
    }

    // Log para diagnóstico
    if (newFinals || newInterim) {
      console.log('[Dictation] Texto capturado - Final:', newFinals, '| Interim:', newInterim);
      this.lastTranscript$.next(newFinals || newInterim);
    }

    let currentValue = this.activeElement.value;
    
    // 1. Remove previous interim text if it exists at the end
    if (this.lastInterim && currentValue.endsWith(this.lastInterim)) {
      currentValue = currentValue.slice(0, -this.lastInterim.length);
    }
    
    // 2. Prepare text to add (Finals + Interim)
    let trackedInterim = '';
    
    // Add finals
    if (newFinals) {
       const prefix = (currentValue && !currentValue.endsWith(' ')) ? ' ' : '';
       currentValue += prefix + newFinals;
    }
    
    // Add interim
    if (newInterim) {
       const prefix = (currentValue && !currentValue.endsWith(' ')) ? ' ' : '';
       trackedInterim = prefix + newInterim;
       currentValue += trackedInterim;
    }
    
    this.activeElement.value = currentValue;
    this.lastInterim = trackedInterim;
    
    // Dispatch input event to trigger Angular/Reactive Forms updates
    this.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    this.activeElement.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
