import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bluetooth-raw-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Teste Bluetooth - Balança e OMRON</h1>
      
      <div class="card">
        <h2>Balança Xiaomi</h2>
        <button (click)="testarBalanca()" class="btn">Conectar Balança</button>
        @if (peso) {
          <div class="resultado">{{ peso }} kg</div>
        }
      </div>

      <div class="card">
        <h2>OMRON Pressão</h2>
        <button (click)="testarOmron()" class="btn">Conectar OMRON</button>
        @if (pressao) {
          <div class="resultado">{{ pressao }} mmHg</div>
        }
      </div>

      <div class="logs">
        @for (log of logs; track $index) {
          <div>{{ log }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 20px; background: #667eea; min-height: 100vh; }
    .card { background: white; padding: 20px; margin: 20px 0; border-radius: 12px; }
    .btn { padding: 15px 30px; background: #764ba2; color: white; border: none; 
           border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
    .resultado { font-size: 32px; font-weight: bold; margin: 20px 0; color: #10b981; }
    .logs { background: #1f2937; color: white; padding: 20px; border-radius: 12px;
            font-family: monospace; max-height: 500px; overflow-y: auto; }
  `]
})
export class BluetoothRawTestComponent {
  peso: number | null = null;
  pressao: string | null = null;
  logs: string[] = [];

  log(msg: string) {
    const tempo = new Date().toLocaleTimeString();
    this.logs.unshift(`[${tempo}] ${msg}`);
    console.log(msg);
  }

  async testarBalanca() {
    this.log('Iniciando teste balança...');
    
    try {
      const dispositivo = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'MIBFS' }],
        optionalServices: ['0000181b-0000-1000-8000-00805f9b34fb']
      });

      this.log(`Conectado: ${dispositivo.name}`);
      
      const servidor = await dispositivo.gatt!.connect();
      const servico = await servidor.getPrimaryService('0000181b-0000-1000-8000-00805f9b34fb');
      const caracteristica = await servico.getCharacteristic('00002a9c-0000-1000-8000-00805f9b34fb');
      
      await caracteristica.startNotifications();
      this.log('Notificacoes ativadas - listener registrado');
      this.log('AGUARDE 15 SEGUNDOS - NAO SUBA NA BALANCA!');
      
      const inicioTempo = Date.now();
      let primeiraLeituraIgnorada = false;
      let contagemLeituras = 0;

      const handleData = (evento: any) => {
        contagemLeituras++;
        this.log(`*** EVENTO DISPARADO - Leitura #${contagemLeituras} ***`);
        const valor = evento.target.value as DataView;
        const tempoDecorrido = Date.now() - inicioTempo;
        
        const bytes = Array.from(new Uint8Array(valor.buffer));
        this.log(`Bytes recebidos: ${bytes.join(', ')}`);
        
        const flags = valor.getUint8(1);
        const estabilizado = (flags & 0x20) !== 0;
        const rawPeso = valor.getUint16(2, true);
        const peso = rawPeso / 200;
        
        let impedancia = 0;
        if (valor.byteLength >= 6) {
          impedancia = valor.getUint16(4, true);
        }
        
        this.log(`Peso: ${peso.toFixed(2)} kg, Impedancia: ${impedancia}, Estab: ${estabilizado}`);
        
        // IGNORA primeira leitura (cache ROM)
        if (!primeiraLeituraIgnorada) {
          this.log('IGNORADO - cache da ROM');
          primeiraLeituraIgnorada = true;
          return;
        }
        
        // IGNORA se menos de 15 segundos
        if (tempoDecorrido < 15000) {
          const falta = Math.ceil((15000 - tempoDecorrido) / 1000);
          this.log(`IGNORADO - faltam ${falta}s`);
          return;
        }
        
        // Avisa se impedância baixa (pode estar vazia)
        if (impedancia < 100) {
          this.log('AVISO: Impedancia baixa - balanca vazia?');
        }
        
        if (estabilizado && impedancia > 100) {
          this.log(`CAPTURADO: ${peso.toFixed(2)} kg`);
          this.peso = parseFloat(peso.toFixed(2));
        }
      };

      caracteristica.addEventListener('characteristicvaluechanged', handleData);
      this.log('Listener anexado - aguardando dados da balanca...');

      // Timeout de 20s e libera uso
      setTimeout(() => {
        this.log('PRONTO - SUBA NA BALANCA AGORA (descalco)!');
      }, 15000);

      // Debug: verificar se recebeu algum dado em 30s
      setTimeout(() => {
        if (contagemLeituras === 0) {
          this.log('AVISO: Nenhum dado recebido em 30s!');
          this.log('A balanca pode precisar que voce suba nela para enviar dados');
          this.log('Ou: desconecte/reconecte a balanca');
        }
      }, 30000);

    } catch (erro: any) {
      this.log(`ERRO: ${erro.message}`);
    }
  }

  async testarOmron() {
    this.log('Iniciando teste OMRON...');
    
    try {
      const dispositivo = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0x1810] }]
      });

      this.log(`Conectado: ${dispositivo.name}`);
      
      const servidor = await dispositivo.gatt!.connect();
      const servico = await servidor.getPrimaryService(0x1810);
      const caracteristica = await servico.getCharacteristic(0x2a35);
      
      await caracteristica.startNotifications();
      this.log('Notificacoes ativadas para OMRON');
      this.log('INICIE A MEDICAO NO APARELHO AGORA!');
      
      let contador = 0;
      
      const handleOmronData = (evento: any) => {
        contador++;
        this.log(`*** OMRON EVENTO #${contador} ***`);
        const valor = evento.target.value as DataView;
        
        const bytes = Array.from(new Uint8Array(valor.buffer));
        this.log(`Dados recebidos (#${contador}): ${bytes.join(', ')}`);
        this.log(`Hex: ${bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
        
        const flags = valor.getUint8(0);
        const temTimestamp = (flags & 0x02) !== 0;
        const temPulso = (flags & 0x04) !== 0;
        const isKpa = (flags & 0x01) !== 0;
        
        let sistolica = valor.getUint16(1, true);
        let diastolica = valor.getUint16(3, true);
        
        if (isKpa) {
          sistolica = Math.round(sistolica * 7.5006);
          diastolica = Math.round(diastolica * 7.5006);
        }
        
        let pulso = 0;
        if (temPulso) {
          const offsetPulso = temTimestamp ? 14 : 7;
          if (valor.byteLength > offsetPulso + 1) {
            pulso = valor.getUint16(offsetPulso, true);
          }
        }
        
        this.log(`Sistolica: ${sistolica}, Diastolica: ${diastolica}, Pulso: ${pulso}`);
        this.pressao = `${sistolica}/${diastolica}`;
        
        if (pulso > 0) {
          this.pressao += ` (${pulso} bpm)`;
        }
      };
      
      caracteristica.addEventListener('characteristicvaluechanged', handleOmronData);
      this.log('Listener OMRON anexado');
      
      // Timeout
      setTimeout(() => {
        if (contador === 0) {
          this.log('TIMEOUT: Nenhum dado recebido em 60s');
          this.log('Tente: 1) Desligar/ligar aparelho 2) Fazer medicao apos conectar');
        }
      }, 60000);

    } catch (erro: any) {
      this.log(`ERRO: ${erro.message}`);
    }
  }
}
