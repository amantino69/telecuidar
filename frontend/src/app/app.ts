import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalComponent } from '@shared/components/atoms/modal/modal';
import { TitleService } from '@core/services/title.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('TeleCuidar');
  private titleService = inject(TitleService);
}
