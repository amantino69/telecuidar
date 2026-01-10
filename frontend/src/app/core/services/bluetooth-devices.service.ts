import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject } from 'rxjs';

// Interfaces para dispositivos médicos Bluetooth
export interface BluetoothDevice {
  id: string;
  name: string;
  type: DeviceType;
  connected: boolean;
  batteryLevel?: number;
  lastReading?: Date;
}

export type DeviceType = 'oximeter' | 'thermometer' | 'scale' | 'blood_pressure' | 'stethoscope';

export interface VitalReading {
  deviceId: string;
  deviceType: DeviceType;
  timestamp: Date;
  values: VitalValues;
}

export interface VitalValues {
  // Oxímetro
  spo2?: number;           // % saturação
  pulseRate?: number;      // bpm
  perfusionIndex?: number; // %
  
  // Termômetro
  temperature?: number;    // °C
  
  // Balança
  weight?: number;         // kg
  bmi?: number;           // calculado
  
  // Pressão arterial
  systolic?: number;       // mmHg
  diastolic?: number;      // mmHg
  heartRate?: number;      // bpm
}

// UUIDs padrão para dispositivos médicos (GATT Health profiles)
const GATT_SERVICES = {
  // Health Thermometer Service
  HEALTH_THERMOMETER: '00001809-0000-1000-8000-00805f9b34fb',
  THERMOMETER_MEASUREMENT: '00002a1c-0000-1000-8000-00805f9b34fb',
  
  // Heart Rate Service
  HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  
  // Blood Pressure Service
  BLOOD_PRESSURE: '00001810-0000-1000-8000-00805f9b34fb',
  BLOOD_PRESSURE_MEASUREMENT: '00002a35-0000-1000-8000-00805f9b34fb',
  
  // Weight Scale Service (genérico)
  WEIGHT_SCALE: '0000181d-0000-1000-8000-00805f9b34fb',
  WEIGHT_MEASUREMENT: '00002a9d-0000-1000-8000-00805f9b34fb',
  
  // Body Composition Service (Xiaomi MIBFS)
  BODY_COMPOSITION: '0000181b-0000-1000-8000-00805f9b34fb',
  BODY_COMPOSITION_MEASUREMENT: '00002a9c-0000-1000-8000-00805f9b34fb',
  
  // Pulse Oximeter Service
  PULSE_OXIMETER: '00001822-0000-1000-8000-00805f9b34fb',
  PLX_SPOT_CHECK: '00002a5e-0000-1000-8000-00805f9b34fb',
  PLX_CONTINUOUS: '00002a5f-0000-1000-8000-00805f9b34fb',
  
  // Battery Service
  BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',

  // Device Information
  DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb',
};

@Injectable({
  providedIn: 'root'
})
export class BluetoothDevicesService {
  private isBrowser: boolean;
  private devices = new Map<string, BluetoothDevice>();
  private gattServers = new Map<string, BluetoothRemoteGATTServer>();
  
  // Estado reativo
  private _devices$ = new BehaviorSubject<BluetoothDevice[]>([]);
  public devices$ = this._devices$.asObservable();
  
  private _readings$ = new Subject<VitalReading>();
  public readings$ = this._readings$.asObservable();
  
  private _connectionStatus$ = new BehaviorSubject<{ deviceId: string; status: 'connecting' | 'connected' | 'disconnected' | 'error'; message?: string } | null>(null);
  public connectionStatus$ = this._connectionStatus$.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Verifica se Web Bluetooth está disponível
   */
  isBluetoothAvailable(): boolean {
    if (!this.isBrowser) return false;
    return 'bluetooth' in navigator;
  }

  /**
   * Conecta a um oxímetro de pulso
   */
  async connectOximeter(): Promise<BluetoothDevice | null> {
    return this.connectDevice('oximeter', [
      GATT_SERVICES.PULSE_OXIMETER,
      GATT_SERVICES.HEART_RATE
    ]);
  }

  /**
   * Conecta a um termômetro
   */
  async connectThermometer(): Promise<BluetoothDevice | null> {
    return this.connectDevice('thermometer', [
      GATT_SERVICES.HEALTH_THERMOMETER
    ]);
  }

  /**
   * Conecta a uma balança (suporta MIBFS/Xiaomi e balanças genéricas)
   */
  async connectScale(): Promise<BluetoothDevice | null> {
    return this.connectScaleMIBFS();
  }

  /**
   * Conecta especificamente à balança Xiaomi MIBFS (Body Composition Scale)
   */
  async connectScaleMIBFS(): Promise<BluetoothDevice | null> {
    if (!this.isBluetoothAvailable()) {
      console.error('[BluetoothDevices] Web Bluetooth não disponível');
      return null;
    }

    try {
      console.log('[BluetoothDevices] Buscando balança MIBFS...');
      
      // Solicita dispositivo - busca por nome MIBFS ou serviço Body Composition
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { name: 'MIBFS' },
          { namePrefix: 'MI' },
          { services: [GATT_SERVICES.BODY_COMPOSITION] }
        ],
        optionalServices: [
          GATT_SERVICES.BODY_COMPOSITION,
          GATT_SERVICES.WEIGHT_SCALE,
          GATT_SERVICES.BATTERY,
          GATT_SERVICES.DEVICE_INFO
        ]
      });

      if (!device) {
        console.log('[BluetoothDevices] Nenhum dispositivo selecionado');
        return null;
      }

      const deviceId = device.id;
      this._connectionStatus$.next({ deviceId, status: 'connecting' });

      console.log(`[BluetoothDevices] Conectando a ${device.name}...`);
      const server = await device.gatt.connect();
      
      this.gattServers.set(deviceId, server);

      const bleDevice: BluetoothDevice = {
        id: deviceId,
        name: device.name || 'Balança MIBFS',
        type: 'scale',
        connected: true,
        batteryLevel: await this.readBatteryLevel(server)
      };

      this.devices.set(deviceId, bleDevice);
      this._devices$.next(Array.from(this.devices.values()));
      this._connectionStatus$.next({ deviceId, status: 'connected' });

      device.addEventListener('gattserverdisconnected', () => {
        this.ngZone.run(() => {
          this.handleDisconnection(deviceId);
        });
      });

      // Inicia leitura específica para MIBFS
      await this.startMIBFSReadings(server, deviceId);

      console.log(`[BluetoothDevices] ${device.name} conectado com sucesso!`);
      return bleDevice;

    } catch (error: any) {
      console.error('[BluetoothDevices] Erro ao conectar MIBFS:', error);
      this._connectionStatus$.next({ 
        deviceId: 'unknown', 
        status: 'error', 
        message: error.message 
      });
      return null;
    }
  }

  /**
   * Conecta a um monitor de pressão
   */
  async connectBloodPressure(): Promise<BluetoothDevice | null> {
    return this.connectDevice('blood_pressure', [
      GATT_SERVICES.BLOOD_PRESSURE
    ]);
  }

  /**
   * Conecta a um dispositivo genérico
   */
  private async connectDevice(type: DeviceType, services: string[]): Promise<BluetoothDevice | null> {
    if (!this.isBluetoothAvailable()) {
      console.error('[BluetoothDevices] Web Bluetooth não disponível');
      return null;
    }

    try {
      console.log(`[BluetoothDevices] Buscando ${type}...`);
      
      // Solicita dispositivo ao usuário
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: services.map(service => ({ services: [service] })),
        optionalServices: [GATT_SERVICES.BATTERY, GATT_SERVICES.DEVICE_INFO]
      });

      if (!device) {
        console.log('[BluetoothDevices] Nenhum dispositivo selecionado');
        return null;
      }

      const deviceId = device.id;
      this._connectionStatus$.next({ deviceId, status: 'connecting' });

      // Conecta ao GATT server
      console.log(`[BluetoothDevices] Conectando a ${device.name}...`);
      const server = await device.gatt.connect();
      
      this.gattServers.set(deviceId, server);

      // Cria o registro do dispositivo
      const bleDevice: BluetoothDevice = {
        id: deviceId,
        name: device.name || `Dispositivo ${type}`,
        type,
        connected: true,
        batteryLevel: await this.readBatteryLevel(server)
      };

      this.devices.set(deviceId, bleDevice);
      this._devices$.next(Array.from(this.devices.values()));
      this._connectionStatus$.next({ deviceId, status: 'connected' });

      // Configura listeners de desconexão
      device.addEventListener('gattserverdisconnected', () => {
        this.ngZone.run(() => {
          this.handleDisconnection(deviceId);
        });
      });

      // Inicia leitura de dados
      await this.startReadings(server, type, deviceId);

      console.log(`[BluetoothDevices] ${device.name} conectado com sucesso!`);
      return bleDevice;

    } catch (error: any) {
      console.error('[BluetoothDevices] Erro ao conectar:', error);
      this._connectionStatus$.next({ 
        deviceId: 'unknown', 
        status: 'error', 
        message: error.message 
      });
      return null;
    }
  }

  /**
   * Lê nível da bateria
   */
  private async readBatteryLevel(server: BluetoothRemoteGATTServer): Promise<number | undefined> {
    try {
      const batteryService = await server.getPrimaryService(GATT_SERVICES.BATTERY);
      const batteryChar = await batteryService.getCharacteristic(GATT_SERVICES.BATTERY_LEVEL);
      const value = await batteryChar.readValue();
      return value.getUint8(0);
    } catch {
      return undefined;
    }
  }

  /**
   * Inicia leituras contínuas do dispositivo
   */
  private async startReadings(server: BluetoothRemoteGATTServer, type: DeviceType, deviceId: string): Promise<void> {
    try {
      switch (type) {
        case 'oximeter':
          await this.startOximeterReadings(server, deviceId);
          break;
        case 'thermometer':
          await this.startThermometerReadings(server, deviceId);
          break;
        case 'scale':
          await this.startScaleReadings(server, deviceId);
          break;
        case 'blood_pressure':
          await this.startBloodPressureReadings(server, deviceId);
          break;
      }
    } catch (error) {
      console.error(`[BluetoothDevices] Erro ao iniciar leituras de ${type}:`, error);
    }
  }

  /**
   * Leituras do oxímetro
   */
  private async startOximeterReadings(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    try {
      // Tenta serviço de oxímetro
      const service = await server.getPrimaryService(GATT_SERVICES.PULSE_OXIMETER);
      const char = await service.getCharacteristic(GATT_SERVICES.PLX_CONTINUOUS);
      
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
        const value = target.value!;
        
        this.ngZone.run(() => {
          // Formato padrão PLX: SpO2 (1 byte), Pulse Rate (2 bytes)
          const spo2 = value.getUint8(1);
          const pulseRate = value.getUint16(3, true);
          
          this._readings$.next({
            deviceId,
            deviceType: 'oximeter',
            timestamp: new Date(),
            values: { spo2, pulseRate }
          });
          
          this.updateDeviceLastReading(deviceId);
        });
      });
    } catch (error) {
      // Fallback: tenta Heart Rate Service
      try {
        const hrService = await server.getPrimaryService(GATT_SERVICES.HEART_RATE);
        const hrChar = await hrService.getCharacteristic(GATT_SERVICES.HEART_RATE_MEASUREMENT);
        
        await hrChar.startNotifications();
        hrChar.addEventListener('characteristicvaluechanged', (event: Event) => {
          const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
          const value = target.value!;
          
          this.ngZone.run(() => {
            const flags = value.getUint8(0);
            const is16Bit = (flags & 0x01) !== 0;
            const heartRate = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
            
            this._readings$.next({
              deviceId,
              deviceType: 'oximeter',
              timestamp: new Date(),
              values: { pulseRate: heartRate }
            });
            
            this.updateDeviceLastReading(deviceId);
          });
        });
      } catch (e) {
        console.error('[BluetoothDevices] Erro no fallback Heart Rate:', e);
      }
    }
  }

  /**
   * Leituras do termômetro
   */
  private async startThermometerReadings(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(GATT_SERVICES.HEALTH_THERMOMETER);
    const char = await service.getCharacteristic(GATT_SERVICES.THERMOMETER_MEASUREMENT);
    
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
      const value = target.value!;
      
      this.ngZone.run(() => {
        // IEEE 11073 float format
        const mantissa = value.getUint8(1) | (value.getUint8(2) << 8) | (value.getUint8(3) << 16);
        const exponent = value.getInt8(4);
        const temperature = mantissa * Math.pow(10, exponent);
        
        this._readings$.next({
          deviceId,
          deviceType: 'thermometer',
          timestamp: new Date(),
          values: { temperature: parseFloat(temperature.toFixed(1)) }
        });
        
        this.updateDeviceLastReading(deviceId);
      });
    });
  }

  /**
   * Leituras da balança
   */
  private async startScaleReadings(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(GATT_SERVICES.WEIGHT_SCALE);
    const char = await service.getCharacteristic(GATT_SERVICES.WEIGHT_MEASUREMENT);
    
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
      const value = target.value!;
      
      this.ngZone.run(() => {
        const flags = value.getUint8(0);
        const isImperial = (flags & 0x01) !== 0;
        let weight = value.getUint16(1, true);
        
        // Converte para kg se necessário
        if (isImperial) {
          weight = weight * 0.453592; // lbs to kg
        } else {
          weight = weight / 200; // Resolução padrão: 0.005 kg
        }
        
        this._readings$.next({
          deviceId,
          deviceType: 'scale',
          timestamp: new Date(),
          values: { weight: parseFloat(weight.toFixed(1)) }
        });
        
        this.updateDeviceLastReading(deviceId);
      });
    });
  }

  /**
   * Leituras específicas da balança Xiaomi MIBFS (Body Composition)
   * A MIBFS usa o serviço Body Composition (181B) ao invés do Weight Scale (181D)
   */
  private async startMIBFSReadings(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    try {
      console.log('[BluetoothDevices] Iniciando leituras MIBFS...');
      
      const service = await server.getPrimaryService(GATT_SERVICES.BODY_COMPOSITION);
      const char = await service.getCharacteristic(GATT_SERVICES.BODY_COMPOSITION_MEASUREMENT);
      
      await char.startNotifications();
      console.log('[BluetoothDevices] Notificações MIBFS ativadas');
      
      let primeiraLeituraIgnorada = false;
      const inicioConexao = Date.now();
      
      char.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
        const value = target.value!;
        
        this.ngZone.run(() => {
          const bytes = Array.from(new Uint8Array(value.buffer));
          console.log('[BluetoothDevices] MIBFS bytes recebidos:', bytes.join(', '));
          
          // Formato MIBFS: byte 1 = flags, bytes 2-3 = peso (little endian), bytes 4-5 = impedância
          const flags = value.getUint8(1);
          const estabilizado = (flags & 0x20) !== 0;
          const rawPeso = value.getUint16(2, true);
          const peso = rawPeso / 200; // Resolução: 0.005 kg
          
          let impedancia = 0;
          if (value.byteLength >= 6) {
            impedancia = value.getUint16(4, true);
          }
          
          console.log(`[BluetoothDevices] MIBFS - Peso: ${peso.toFixed(2)}kg, Impedância: ${impedancia}, Estab: ${estabilizado}`);
          
          // Ignora primeira leitura (cache da ROM)
          if (!primeiraLeituraIgnorada) {
            console.log('[BluetoothDevices] MIBFS - Ignorando cache ROM');
            primeiraLeituraIgnorada = true;
            return;
          }
          
          // Ignora leituras nos primeiros 5 segundos (lixo inicial)
          const tempoDecorrido = Date.now() - inicioConexao;
          if (tempoDecorrido < 5000) {
            console.log('[BluetoothDevices] MIBFS - Ignorando leitura inicial');
            return;
          }
          
          // Só emite se peso válido (> 2kg) e estabilizado ou impedância detectada
          if (peso > 2 && (estabilizado || impedancia > 100)) {
            console.log(`[BluetoothDevices] MIBFS - CAPTURADO: ${peso.toFixed(1)} kg`);
            
            this._readings$.next({
              deviceId,
              deviceType: 'scale',
              timestamp: new Date(),
              values: { weight: parseFloat(peso.toFixed(1)) }
            });
            
            this.updateDeviceLastReading(deviceId);
          }
        });
      });
      
      console.log('[BluetoothDevices] MIBFS - Listener registrado. SUBA NA BALANÇA!');
      
    } catch (error) {
      console.error('[BluetoothDevices] Erro ao iniciar leituras MIBFS:', error);
      // Fallback para serviço Weight Scale genérico
      console.log('[BluetoothDevices] Tentando fallback para Weight Scale genérico...');
      await this.startScaleReadings(server, deviceId);
    }
  }

  /**
   * Leituras do monitor de pressão
   */
  private async startBloodPressureReadings(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(GATT_SERVICES.BLOOD_PRESSURE);
    const char = await service.getCharacteristic(GATT_SERVICES.BLOOD_PRESSURE_MEASUREMENT);
    
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
      const value = target.value!;
      
      this.ngZone.run(() => {
        const flags = value.getUint8(0);
        const isKpa = (flags & 0x01) !== 0;
        
        let systolic = value.getUint16(1, true);
        let diastolic = value.getUint16(3, true);
        let map = value.getUint16(5, true); // Mean Arterial Pressure
        
        // Converte de kPa para mmHg se necessário
        if (isKpa) {
          systolic = systolic * 7.5006;
          diastolic = diastolic * 7.5006;
        }
        
        // Pulse rate (se presente)
        let heartRate: number | undefined;
        if ((flags & 0x04) !== 0) {
          heartRate = value.getUint16(7, true);
        }
        
        this._readings$.next({
          deviceId,
          deviceType: 'blood_pressure',
          timestamp: new Date(),
          values: { 
            systolic: Math.round(systolic), 
            diastolic: Math.round(diastolic),
            heartRate 
          }
        });
        
        this.updateDeviceLastReading(deviceId);
      });
    });
  }

  /**
   * Atualiza timestamp da última leitura
   */
  private updateDeviceLastReading(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastReading = new Date();
      this.devices.set(deviceId, device);
      this._devices$.next(Array.from(this.devices.values()));
    }
  }

  /**
   * Trata desconexão
   */
  private handleDisconnection(deviceId: string): void {
    console.log(`[BluetoothDevices] Dispositivo ${deviceId} desconectado`);
    
    const device = this.devices.get(deviceId);
    if (device) {
      device.connected = false;
      this.devices.set(deviceId, device);
      this._devices$.next(Array.from(this.devices.values()));
    }
    
    this.gattServers.delete(deviceId);
    this._connectionStatus$.next({ deviceId, status: 'disconnected' });
  }

  /**
   * Desconecta um dispositivo
   */
  disconnect(deviceId: string): void {
    const server = this.gattServers.get(deviceId);
    if (server && server.connected) {
      server.disconnect();
    }
    this.handleDisconnection(deviceId);
  }

  /**
   * Desconecta todos os dispositivos
   */
  disconnectAll(): void {
    this.gattServers.forEach((server, deviceId) => {
      this.disconnect(deviceId);
    });
  }

  /**
   * Retorna dispositivos conectados
   */
  getConnectedDevices(): BluetoothDevice[] {
    return Array.from(this.devices.values()).filter(d => d.connected);
  }

  /**
   * Solicita leitura manual de um dispositivo
   */
  async requestReading(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    const server = this.gattServers.get(deviceId);
    
    if (!device || !server || !server.connected) {
      console.warn('[BluetoothDevices] Dispositivo não conectado');
      return;
    }

    // Reinicia as leituras
    await this.startReadings(server, device.type, deviceId);
  }
}
