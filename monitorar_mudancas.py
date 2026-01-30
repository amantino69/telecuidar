import asyncio
from bleak import BleakScanner

ADDRESS = "DC:23:4E:DA:E9:DD"

# Guardar dados anteriores para detectar mudanças
ultimo_service_data = None
ultimo_manufacturer_data = None

def detection_callback(device, advertisement_data):
    global ultimo_service_data, ultimo_manufacturer_data
    
    if device.address.upper() != ADDRESS.upper():
        return
    
    mudou = False
    
    # Verificar Service Data
    if advertisement_data.service_data:
        for uuid, data in advertisement_data.service_data.items():
            hex_data = " ".join(f"{b:02X}" for b in data)
            if hex_data != ultimo_service_data:
                if ultimo_service_data is not None:
                    print(f"\n!!! SERVICE DATA MUDOU !!!")
                    print(f"  Anterior: {ultimo_service_data}")
                    print(f"  Novo:     {hex_data}")
                    mudou = True
                ultimo_service_data = hex_data
    
    # Verificar Manufacturer Data
    if advertisement_data.manufacturer_data:
        for company_id, data in advertisement_data.manufacturer_data.items():
            hex_data = " ".join(f"{b:02X}" for b in data)
            if hex_data != ultimo_manufacturer_data:
                if ultimo_manufacturer_data is not None:
                    print(f"\n!!! MANUFACTURER DATA MUDOU !!!")
                    print(f"  Anterior: {ultimo_manufacturer_data}")
                    print(f"  Novo:     {hex_data}")
                    mudou = True
                ultimo_manufacturer_data = hex_data
    
    if mudou:
        print("\n  ^ POSSÍVEL TEMPERATURA ACIMA ^")
        # Tentar decodificar
        if advertisement_data.service_data:
            for uuid, data in advertisement_data.service_data.items():
                if len(data) >= 6:
                    # Bytes 4-5 ou 5-6 podem ser temperatura em alguns protocolos
                    for i in range(len(data) - 1):
                        val = int.from_bytes(data[i:i+2], 'little')
                        temp = val / 100
                        if 30.0 <= temp <= 45.0:  # Faixa de temperatura corporal
                            print(f"  POSSÍVEL TEMP nos bytes {i}-{i+1}: {temp:.2f}°C")
    else:
        print(".", end="", flush=True)

async def main():
    print(f"[*] Monitorando termômetro {ADDRESS}")
    print("[*] Faça uma medição AGORA e observe se os dados mudam!")
    print("[*] Pontos '.' indicam pacotes recebidos sem mudança")
    print("[*] Pressione Ctrl+C para parar\n")
    
    scanner = BleakScanner(detection_callback=detection_callback)
    await scanner.start()
    
    try:
        for i in range(120):  # 2 minutos
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        await scanner.stop()
    
    print("\n\n[*] Monitoramento finalizado")
    print(f"Último Service Data: {ultimo_service_data}")
    print(f"Último Manufacturer Data: {ultimo_manufacturer_data}")

asyncio.run(main())
