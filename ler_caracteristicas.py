import asyncio
from bleak import BleakClient, BleakScanner

ADDRESS = "DC:23:4E:DA:E9:DD"

# UUIDs padrão do Generic Access Profile
DEVICE_NAME_UUID = "00002a00-0000-1000-8000-00805f9b34fb"
APPEARANCE_UUID = "00002a01-0000-1000-8000-00805f9b34fb"
CONN_PARAMS_UUID = "00002a04-0000-1000-8000-00805f9b34fb"

async def main():
    print("[*] Escaneando dispositivo...")
    devices = await BleakScanner.discover(timeout=15.0)
    target = next((d for d in devices if d.address.upper() == ADDRESS.upper()), None)
    
    if not target:
        print(f"[!] Dispositivo {ADDRESS} não encontrado!")
        return
    
    print(f"[+] Encontrado: {target.name}")
    print("[*] Conectando...")
    
    async with BleakClient(target, timeout=30.0) as client:
        print("[+] Conectado!\n")
        
        # Listar todos os serviços e tentar ler todas as características com 'read'
        for service in client.services:
            print(f"\n=== SERVIÇO: {service.uuid} ===")
            
            for char in service.characteristics:
                props = char.properties
                print(f"\nCaracterística: {char.uuid}")
                print(f"  Propriedades: {', '.join(props)}")
                
                if "read" in props:
                    try:
                        value = await client.read_gatt_char(char.uuid)
                        hex_val = " ".join(f"{b:02X}" for b in value)
                        
                        # Tentar decodificar como texto
                        try:
                            text_val = value.decode('utf-8', errors='ignore')
                            if text_val.isprintable() and len(text_val) > 0:
                                print(f"  Valor (texto): {text_val}")
                        except:
                            pass
                        
                        print(f"  Valor (hex): {hex_val}")
                        
                        # Tentar interpretar como número (temperatura?)
                        if len(value) >= 2:
                            val_le = int.from_bytes(value[:2], 'little')
                            val_be = int.from_bytes(value[:2], 'big')
                            print(f"  Como número (little-endian): {val_le} ({val_le/100:.2f}°C?)")
                            print(f"  Como número (big-endian): {val_be} ({val_be/100:.2f}°C?)")
                            
                    except Exception as e:
                        print(f"  [Erro ao ler]: {e}")

asyncio.run(main())
