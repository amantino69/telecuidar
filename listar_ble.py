import asyncio
from bleak import BleakClient, BleakScanner

ADDRESS = "DC:23:4E:DA:E9:DD"

async def scan_devices():
    print("[*] Escaneando dispositivos BLE por 30 segundos...")
    print("[*] Ligue o termômetro agora!")
    devices = await BleakScanner.discover(timeout=30.0)
    print(f"\n[+] Encontrados {len(devices)} dispositivos:\n")
    for d in devices:
        print(f"  {d.address}  |  {d.name or 'Sem nome'}")
    return devices

async def main():
    # Primeiro, escanear dispositivos
    devices = await scan_devices()
    
    # Verificar se o dispositivo alvo está na lista
    target_device = None
    for d in devices:
        if d.address.upper() == ADDRESS.upper():
            target_device = d
            break
    
    if not target_device:
        print(f"\n[!] Dispositivo {ADDRESS} NÃO encontrado no scan.")
        print("[!] Verifique se está ligado e em modo de pareamento.")
        return
    
    
    print(f"\n[*] Conectando ao dispositivo {target_device.name} ({target_device.address})...")
    print("[*] Aguarde até 30 segundos para a conexão...")
    
    async with BleakClient(target_device, timeout=30.0) as client:
        print("[+] Conectado com sucesso\n")

        for service in client.services:
            print(f"SERVICE  UUID: {service.uuid}")
            for char in service.characteristics:
                props = ",".join(char.properties)
                print(f"  └─ CHAR UUID: {char.uuid}  | PROPS: {props}")
            print()

asyncio.run(main())