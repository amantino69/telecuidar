import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface AttachmentMessage {
  id: string;
  senderRole: 'patient' | 'professional';
  senderName: string;
  timestamp: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string; // Base64 or Blob URL
}

@Injectable({
  providedIn: 'root'
})
export class AttachmentsChatService implements OnDestroy {
  private storageKeyPrefix = 'telecuidar_attachments_chat_';
  private chatSubjects: Map<string, BehaviorSubject<AttachmentMessage[]>> = new Map();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  private getSubject(appointmentId: string): BehaviorSubject<AttachmentMessage[]> {
    if (!this.chatSubjects.has(appointmentId)) {
      const initialData = this.loadFromStorage(appointmentId);
      this.chatSubjects.set(appointmentId, new BehaviorSubject<AttachmentMessage[]>(initialData));
    }
    return this.chatSubjects.get(appointmentId)!;
  }

  getMessages(appointmentId: string): Observable<AttachmentMessage[]> {
    return this.getSubject(appointmentId).asObservable();
  }

  addMessage(appointmentId: string, message: AttachmentMessage): void {
    const currentMessages = this.getSubject(appointmentId).value;
    const newMessages = [...currentMessages, message];
    
    this.saveToStorage(appointmentId, newMessages);
    this.getSubject(appointmentId).next(newMessages);
  }

  private loadFromStorage(appointmentId: string): AttachmentMessage[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    
    const key = `${this.storageKeyPrefix}${appointmentId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  private saveToStorage(appointmentId: string, messages: AttachmentMessage[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const key = `${this.storageKeyPrefix}${appointmentId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  }

  private handleStorageEvent(event: StorageEvent) {
    if (event.key && event.key.startsWith(this.storageKeyPrefix)) {
      const appointmentId = event.key.replace(this.storageKeyPrefix, '');
      const newMessages = event.newValue ? JSON.parse(event.newValue) : [];
      
      if (this.chatSubjects.has(appointmentId)) {
        this.chatSubjects.get(appointmentId)!.next(newMessages);
      }
    }
  }
}
