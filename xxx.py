import asyncio
from bleak import BleakClient, BleakScanner

# ===== DADOS DO SEU TERMÔMETRO =====
ADDRESS = "DC:23:4E:DA:E9:DD"
# Características com NOTIFY disponíveis:
CHAR_NOTIFY_1 = "00000002-0000-1001-8001-00805f9b07d0"  # Serviço 0000fd50
CHAR_NOTIFY_2 = "5833ff03-9b8b-5191-6142-22a4536ef123"  # Serviço 5833ff01
# Características com WRITE disponíveis:
CHAR_WRITE_1 = "00000001-0000-1001-8001-00805f9b07d0"   # Serviço 0000fd50
CHAR_WRITE_2 = "5833ff02-9b8b-5191-6142-22a4536ef123"   # Serviço 5833ff01

def notification_handler(sender, data):
    hex_data = " ".join(f"{b:02X}" for b in data)
    print(f"[NOTIFY] RAW BYTES: {hex_data}")

    # Tentativa comum de conversão (ajustaremos depois)
    if len(data) >= 2:
        value = int.from_bytes(data[:2], byteorder="little")
        print(f"[INFO] Valor bruto: {value}")
        print(f"[INFO] Possível temperatura: {value / 100:.2f} °C")

async def send_command(client, char_uuid, command, description):
    """Tenta enviar um comando para uma característica"""
    try:
        await client.write_gatt_char(char_uuid, command)
        print(f"[+] Enviado {description} para {char_uuid[-8:]}")
        return True
    except Exception as e:
        print(f"[!] Falha ao enviar {description}: {e}")
        return False

async def connect_and_listen(target):
    """Conecta ao dispositivo e escuta por notificações"""
    try:
        client = BleakClient(target, timeout=20.0)
        await client.connect()
        print("[+] Conectado!")
        
        await client.start_notify(CHAR_NOTIFY_1, notification_handler)
        await client.start_notify(CHAR_NOTIFY_2, notification_handler)
        
        # Enviar comando START
        await send_command(client, CHAR_WRITE_1, bytes([0x01]), "START")
        
        # Aguardar enquanto conectado
        while client.is_connected:
            await asyncio.sleep(0.5)
            
        print("[!] Dispositivo desconectou")
        return True
    except Exception as e:
        print(f"[!] Erro: {e}")
        return False

async def main():
    print("[*] Escaneando dispositivo...")
    devices = await BleakScanner.discover(timeout=15.0)
    target = next((d for d in devices if d.address.upper() == ADDRESS.upper()), None)
    
    if not target:
        print(f"[!] Dispositivo {ADDRESS} não encontrado. Ligue o termômetro!")
        return
    
    print(f"[+] Encontrado: {target.name}")
    print("[*] Aguardando conexões por 2 minutos...")
    print("[*] Faça medições com o termômetro!\n")
    
    start_time = asyncio.get_event_loop().time()
    timeout = 120  # 2 minutos
    
    while (asyncio.get_event_loop().time() - start_time) < timeout:
        print("[*] Tentando conectar...")
        
        # Re-escanear para pegar o dispositivo atualizado
        devices = await BleakScanner.discover(timeout=5.0)
        target = next((d for d in devices if d.address.upper() == ADDRESS.upper()), None)
        
        if target:
            await connect_and_listen(target)
        else:
            print("[!] Dispositivo não encontrado no scan. Ligue-o novamente.")
        
        await asyncio.sleep(2)
    
    print("\n[*] Tempo esgotado. Finalizando.")

asyncio.run(main())
