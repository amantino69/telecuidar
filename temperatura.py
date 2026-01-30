import asyncio
from bleak import BleakClient, BleakScanner

ADDRESS = "DC:23:4E:DA:E9:DD"

# Características do termômetro m3ja
CHAR_WRITE = "00000001-0000-1001-8001-00805f9b07d0"
CHAR_NOTIFY = "00000002-0000-1001-8001-00805f9b07d0"
CHAR_WRITE_2 = "5833ff02-9b8b-5191-6142-22a4536ef123"
CHAR_NOTIFY_2 = "5833ff03-9b8b-5191-6142-22a4536ef123"

dados_recebidos = []

def parse_temperature(data):
    """Tenta interpretar os bytes como temperatura"""
    hex_str = " ".join(f"{b:02X}" for b in data)
    print(f"  RAW: {hex_str}")
    
    if len(data) >= 2:
        # Várias tentativas de interpretação
        val_le = int.from_bytes(data[:2], 'little', signed=False)
        val_le_signed = int.from_bytes(data[:2], 'little', signed=True)
        
        print(f"  Interpretações possíveis:")
        print(f"    - {val_le / 100:.2f} °C (little-endian /100)")
        print(f"    - {val_le / 10:.1f} °C (little-endian /10)")
        print(f"    - {val_le_signed / 100:.2f} °C (signed /100)")
        
        if len(data) >= 4:
            # Alguns termômetros usam 4 bytes
            val_4b = int.from_bytes(data[:4], 'little', signed=False)
            print(f"    - {val_4b / 1000:.3f} °C (4 bytes /1000)")

def notification_handler(sender, data):
    """Processa dados recebidos via notify"""
    print(f"\n[DADOS RECEBIDOS] de {sender}")
    dados_recebidos.append(data)
    parse_temperature(data)

async def main():
    print("[*] Escaneando termômetro m3ja...")
    devices = await BleakScanner.discover(timeout=15.0)
    target = next((d for d in devices if d.address.upper() == ADDRESS.upper()), None)
    
    if not target:
        print(f"[!] Termômetro não encontrado! Certifique-se de que está ligado.")
        return
    
    print(f"[+] Encontrado: {target.name}")
    print("[*] Conectando...")
    
    try:
        async with BleakClient(target, timeout=30.0) as client:
            print("[+] Conectado!\n")
            
            # Ativar notify em ambas as características
            print("[*] Ativando recebimento de dados...")
            await client.start_notify(CHAR_NOTIFY, notification_handler)
            await client.start_notify(CHAR_NOTIFY_2, notification_handler)
            print("[+] Notify ativado\n")
            
            # Tentar diferentes comandos para solicitar temperatura
            comandos = [
                (bytes([0x01]), "Iniciar medição"),
                (bytes([0x02]), "Solicitar temperatura"),
                (bytes([0x03]), "Comando 0x03"),
                (bytes([0x10]), "Comando 0x10"),
                (bytes([0x11]), "Comando 0x11"),
                (bytes([0xA1]), "Comando 0xA1"),
                (bytes([0xA2]), "Comando 0xA2"),
            ]
            
            print("[*] Enviando comandos para solicitar temperatura...")
            for cmd, desc in comandos:
                try:
                    await client.write_gatt_char(CHAR_WRITE, cmd, response=False)
                    print(f"  -> Enviado: {desc}")
                    await asyncio.sleep(2)  # Esperar resposta
                except Exception as e:
                    print(f"  [!] Erro: {e}")
            
            print("\n[*] Aguardando dados por mais 30 segundos...")
            print("[*] FAÇA UMA MEDIÇÃO COM O TERMÔMETRO AGORA!\n")
            
            for i in range(30):
                await asyncio.sleep(1)
                if i % 10 == 9:
                    print(f"  ... {30-i-1} segundos restantes")
            
            print("\n[*] Finalizando...")
            await client.stop_notify(CHAR_NOTIFY)
            await client.stop_notify(CHAR_NOTIFY_2)
            
    except Exception as e:
        print(f"[!] Erro de conexão: {e}")
    
    print(f"\n=== RESUMO ===")
    print(f"Total de mensagens recebidas: {len(dados_recebidos)}")
    if dados_recebidos:
        print("Dados recebidos:")
        for i, d in enumerate(dados_recebidos):
            print(f"  {i+1}: {' '.join(f'{b:02X}' for b in d)}")

asyncio.run(main())
