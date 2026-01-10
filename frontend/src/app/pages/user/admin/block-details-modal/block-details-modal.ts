import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '@app/core/services/modal.service';

@Component({
  selector: 'app-block-details-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-content">
      <h2>{{ data.title }}</h2>
      <div>
        <strong>Profissional:</strong> {{ data.professional.name }} ({{ data.professional.email }})<br>
        <strong>Data do Bloqueio:</strong> {{ data.blockDate.type === 'single' ? (data.blockDate.weekday + ' ' + data.blockDate.date) : (data.blockDate.start + ' até ' + data.blockDate.end) }}<br>
        <strong>Motivo:</strong> {{ data.reason }}<br>
        <strong>Status:</strong> {{ data.status }}<br>
        <strong>Data da Solicitação:</strong> {{ data.requestDate }}<br>
        <strong>Tempo de Espera:</strong> {{ data.waitTime }} dia(s)<br>
        <strong>Detalhes:</strong> {{ data.details }}
      </div>
      <div class="modal-actions">
        <button (click)="close()">Fechar</button>
      </div>
    </div>
  `,
  styleUrl: './block-details-modal.scss'
})
export class BlockDetailsModalComponent {
  constructor(@Inject('MODAL_DATA') public data: any) {}
  close() {
    // Aqui você pode emitir um evento ou usar o serviço global se necessário
  }
}
