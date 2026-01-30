import asyncio
from bleak import BleakClient, BleakScanner
import struct

# Endereço do Omron HEM-7156T
ADDRESS = "00:5F:BF:9A:64:DF"

# UUIDs do Blood Pressure Service
BP_MEASUREMENT_UUID = "00002a35-0000-1000-8000-00805f9b34fb"

def parse_blood_pressure(data):
    """
    Decodifica dados de Blood Pressure Measurement conforme especificação Bluetooth
    https://www.bluetooth.com/specifications/specs/gatt-specification-supplement/
    """
    if len(data) < 7:
        print(f"  Dados incompletos: {data.hex()}")
        return None
    
    flags = data[0]
    
    # Bit 0: Unidade (0 = mmHg, 1 = kPa)
    unit_kpa = flags & 0x01
    unit = "kPa" if unit_kpa else "mmHg"
    
    # Bit 1: Timestamp presente
    has_timestamp = (flags >> 1) & 0x01
    
    # Bit 2: Pulse Rate presente
    has_pulse = (flags >> 2) & 0x01
    
    # Bit 3: User ID presente
    has_user_id = (flags >> 3) & 0x01
    
    # Bit 4: Measurement Status presente
    has_status = (flags >> 4) & 0x01
    
    # Valores de pressão são SFLOAT (IEEE 11073 16-bit)
    # Bytes 1-2: Sistólica
    # Bytes 3-4: Diastólica  
    # Bytes 5-6: Mean Arterial Pressure
    
    def sfloat_to_float(raw):
        """Converte SFLOAT para float"""
        mantissa = raw & 0x0FFF
        if mantissa >= 0x0800:
            mantissa = mantissa - 0x1000  # Sinal negativo
        exponent = (raw >> 12) & 0x0F
        if exponent >= 0x08:
            exponent = exponent - 0x10  # Sinal negativo
        return mantissa * (10 ** exponent)
    
    systolic_raw = struct.unpack('<H', data[1:3])[0]
    diastolic_raw = struct.unpack('<H', data[3:5])[0]
    map_raw = struct.unpack('<H', data[5:7])[0]
    
    systolic = sfloat_to_float(systolic_raw)
    diastolic = sfloat_to_float(diastolic_raw)
    mean_ap = sfloat_to_float(map_raw)
    
    print(f"\n  ╔══════════════════════════════════════╗")
    print(f"  ║     MEDIÇÃO DE PRESSÃO ARTERIAL       ║")
    print(f"  ╠══════════════════════════════════════╣")
    print(f"  ║  Sistólica:   {systolic:6.0f} {unit:5}          ║")
    print(f"  ║  Diastólica:  {diastolic:6.0f} {unit:5}          ║")
    print(f"  ║  MAP:         {mean_ap:6.0f} {unit:5}          ║")
    
    offset = 7
    
    # Timestamp (7 bytes se presente)
    if has_timestamp and len(data) >= offset + 7:
        year = struct.unpack('<H', data[offset:offset+2])[0]
        month = data[offset+2]
        day = data[offset+3]
        hour = data[offset+4]
        minute = data[offset+5]
        second = data[offset+6]
        print(f"  ║  Data/Hora:   {day:02d}/{month:02d}/{year} {hour:02d}:{minute:02d}:{second:02d}  ║")
        offset += 7
    
    # Pulse Rate (2 bytes se presente)
    if has_pulse and len(data) >= offset + 2:
        pulse_raw = struct.unpack('<H', data[offset:offset+2])[0]
        pulse = sfloat_to_float(pulse_raw)
        print(f"  ║  Pulso:       {pulse:6.0f} bpm            ║")
        offset += 2
    
    print(f"  ╚══════════════════════════════════════╝\n")
    
    return {
        'systolic': systolic,
        'diastolic': diastolic,
        'map': mean_ap,
        'unit': unit
    }

def bp_notification_handler(sender, data):
    """Callback para receber dados de pressão arterial"""
    print(f"\n[DADOS RECEBIDOS] {len(data)} bytes")
    print(f"  RAW: {data.hex()}")
    parse_blood_pressure(data)

async def main():
    print("=" * 50)
    print("    MONITOR DE PRESSÃO ARTERIAL OMRON")
    print("=" * 50)
    
    print(f"\n[*] Escaneando {ADDRESS}...")
    devices = await BleakScanner.discover(timeout=15.0)
    target = next((d for d in devices if d.address.upper() == ADDRESS.upper()), None)
    
    if not target:
        print(f"[!] Omron não encontrado! Ligue-o e ative Bluetooth.")
        return
    
    print(f"[+] Encontrado: {target.name}")
    print("[*] Conectando...")
    
    try:
        async with BleakClient(target, timeout=30.0) as client:
            print("[+] Conectado!")
            
            # Ativar indicações para Blood Pressure Measurement
            print("[*] Ativando recebimento de medições...\n")
            await client.start_notify(BP_MEASUREMENT_UUID, bp_notification_handler)
            
            print("=" * 50)
            print("  INSTRUÇÕES:")
            print("  1. Faça uma medição de pressão no aparelho")
            print("  2. Após a medição, pressione o botão Bluetooth")
            print("     para enviar os dados")
            print("  Aguardando por 2 minutos...")
            print("=" * 50)
            
            # Aguardar mantendo conexão ativa
            for i in range(120):
                if not client.is_connected:
                    print("\n[!] Conexão perdida!")
                    break
                await asyncio.sleep(1)
            
            print("\n[*] Finalizando...")
            if client.is_connected:
                try:
                    await client.stop_notify(BP_MEASUREMENT_UUID)
                except:
                    pass
    except Exception as e:
        print(f"[!] Erro: {e}")

asyncio.run(main())
