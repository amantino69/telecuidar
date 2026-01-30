import asyncio
from bleak import BleakScanner

ADDRESS = "DC:23:4E:DA:E9:DD"

def detection_callback(device, advertisement_data):
    if device.address.upper() == ADDRESS.upper():
        print(f"\n[{device.name}] RSSI: {advertisement_data.rssi} dBm")
        
        # Dados do fabricante (manufacturer data)
        if advertisement_data.manufacturer_data:
            for company_id, data in advertisement_data.manufacturer_data.items():
                hex_data = " ".join(f"{b:02X}" for b in data)
                print(f"  Manufacturer ({company_id:04X}): {hex_data}")
        
        # Dados de serviço
        if advertisement_data.service_data:
            for uuid, data in advertisement_data.service_data.items():
                hex_data = " ".join(f"{b:02X}" for b in data)
                print(f"  Service Data ({uuid}): {hex_data}")
        
        # Nome local
        if advertisement_data.local_name:
            print(f"  Local Name: {advertisement_data.local_name}")

async def main():
    print(f"[*] Monitorando advertisements de {ADDRESS}")
    print("[*] Ligue o termômetro e faça medições!")
    print("[*] Pressione Ctrl+C para parar\n")
    
    scanner = BleakScanner(detection_callback=detection_callback)
    
    await scanner.start()
    
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        await scanner.stop()
        print("\n[*] Scan finalizado.")

asyncio.run(main())
