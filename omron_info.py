import asyncio
from bleak import BleakClient, BleakScanner

# Endereço do possível Omron
ADDRESS = "00:5F:BF:9A:64:DF"

# UUIDs padrão Bluetooth para Blood Pressure
BLOOD_PRESSURE_SERVICE = "00001810-0000-1000-8000-00805f9b34fb"
BLOOD_PRESSURE_MEASUREMENT = "00002a35-0000-1000-8000-00805f9b34fb"
INTERMEDIATE_CUFF_PRESSURE = "00002a36-0000-1000-8000-00805f9b34fb"
BLOOD_PRESSURE_FEATURE = "00002a49-0000-1000-8000-00805f9b34fb"

async def main():
    print(f"[*] Escaneando dispositivo {ADDRESS}...")
    devices = await BleakScanner.discover(timeout=15.0)
    target = next((d for d in devices if d.address.upper() == ADDRESS.upper()), None)
    
    if not target:
        print(f"[!] Dispositivo não encontrado! Ligue-o e ative o Bluetooth.")
        return
    
    print(f"[+] Encontrado: {target.name}")
    print("[*] Conectando...")
    
    async with BleakClient(target, timeout=30.0) as client:
        print("[+] Conectado!\n")
        
        print("=" * 60)
        print("SERVIÇOS E CARACTERÍSTICAS DO DISPOSITIVO")
        print("=" * 60)
        
        has_bp_service = False
        
        for service in client.services:
            # Identificar serviços conhecidos
            service_name = ""
            if "1810" in service.uuid:
                service_name = " *** BLOOD PRESSURE SERVICE ***"
                has_bp_service = True
            elif "1800" in service.uuid:
                service_name = " (Generic Access)"
            elif "1801" in service.uuid:
                service_name = " (Generic Attribute)"
            elif "180a" in service.uuid:
                service_name = " (Device Information)"
            elif "180f" in service.uuid:
                service_name = " (Battery Service)"
            
            print(f"\nSERVIÇO: {service.uuid}{service_name}")
            
            for char in service.characteristics:
                props = ", ".join(char.properties)
                
                char_name = ""
                if "2a35" in char.uuid:
                    char_name = " *** BLOOD PRESSURE MEASUREMENT ***"
                elif "2a36" in char.uuid:
                    char_name = " (Intermediate Cuff Pressure)"
                elif "2a49" in char.uuid:
                    char_name = " (Blood Pressure Feature)"
                elif "2a00" in char.uuid:
                    char_name = " (Device Name)"
                elif "2a29" in char.uuid:
                    char_name = " (Manufacturer)"
                elif "2a24" in char.uuid:
                    char_name = " (Model Number)"
                
                print(f"  └─ {char.uuid}  | {props}{char_name}")
                
                # Tentar ler características legíveis
                if "read" in char.properties:
                    try:
                        value = await client.read_gatt_char(char.uuid)
                        try:
                            text = value.decode('utf-8', errors='ignore')
                            if text.isprintable() and len(text.strip()) > 0:
                                print(f"       Valor: {text.strip()}")
                        except:
                            hex_val = " ".join(f"{b:02X}" for b in value)
                            print(f"       Valor: {hex_val}")
                    except:
                        pass
        
        print("\n" + "=" * 60)
        if has_bp_service:
            print("✓ ESTE É UM APARELHO DE PRESSÃO BLUETOOTH PADRÃO!")
            print("  Podemos ler as medições!")
        else:
            print("Este dispositivo não tem o serviço padrão de pressão arterial.")

asyncio.run(main())
