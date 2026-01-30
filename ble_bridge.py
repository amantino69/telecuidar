"""
BLE Bridge - Ponte entre dispositivos Bluetooth e TeleCuidar
Captura dados de balança, oxímetro, etc. e envia via HTTP para o backend
"""
import asyncio
import aiohttp
from bleak import BleakScanner, BleakClient
from datetime import datetime

# === CONFIGURAÇÃO ===
BACKEND_URL = "http://localhost:5239/api/biometrics/ble-reading"
APPOINTMENT_ID = None  # Será definido via argumento ou input

# Dispositivos conhecidos
DEVICES = {
    "F8:8F:C8:3A:B7:92": {"type": "scale", "name": "Balança OKOK"},
    # Adicione outros dispositivos aqui
}

# Estado
estado = {
    "peso": {"valor": 0, "contador": 0, "confirmado": False},
}

async def enviar_leitura(tipo: str, valores: dict):
    """Envia leitura para o backend TeleCuidar"""
    if not APPOINTMENT_ID:
        print(f"⚠️  Sem appointment_id - leitura não enviada")
        return
        
    payload = {
        "appointmentId": APPOINTMENT_ID,
        "deviceType": tipo,
        "timestamp": datetime.now().isoformat(),
        "values": valores
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(BACKEND_URL, json=payload) as resp:
                if resp.status == 200:
                    print(f"✅ Enviado para TeleCuidar: {valores}")
                else:
                    print(f"❌ Erro ao enviar: {resp.status}")
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")

def processar_balanca(data: bytes):
    """Processa dados da balança OKOK"""
    global estado
    
    if len(data) < 2:
        return
    
    raw = (data[0] << 8) | data[1]
    peso = round(raw / 100, 2)
    
    # Se zerou, reseta
    if raw == 0:
        if estado["peso"]["confirmado"]:
            print("🔄 Balança zerada\n")
        estado["peso"] = {"valor": 0, "contador": 0, "confirmado": False}
        return None
    
    # Mostra em tempo real
    print(f"⚖️  {peso} kg", end="\r")
    
    # Conta estabilidade
    if raw == estado["peso"]["valor"]:
        estado["peso"]["contador"] += 1
    else:
        estado["peso"]["valor"] = raw
        estado["peso"]["contador"] = 1
        estado["peso"]["confirmado"] = False
    
    # Confirma após 5 leituras iguais
    if estado["peso"]["contador"] >= 5 and not estado["peso"]["confirmado"]:
        estado["peso"]["confirmado"] = True
        print(f"\n\n✅ PESO: {peso} kg\n")
        return {"weight": peso}
    
    return None

def detection_callback(device, advertisement_data):
    """Callback para dispositivos detectados via advertisement"""
    mac = device.address.upper()
    
    if mac not in DEVICES:
        return
    
    device_info = DEVICES[mac]
    
    for _, data in advertisement_data.manufacturer_data.items():
        if device_info["type"] == "scale":
            resultado = processar_balanca(data)
            if resultado:
                asyncio.create_task(enviar_leitura("scale", resultado))

async def main():
    global APPOINTMENT_ID
    
    print("=" * 50)
    print("   BLE BRIDGE - TeleCuidar")
    print("=" * 50)
    print("\nDispositivos configurados:")
    for mac, info in DEVICES.items():
        print(f"  • {info['name']} ({mac})")
    print()
    
    # Pede ID da consulta (opcional)
    APPOINTMENT_ID = input("ID da consulta (Enter para pular): ").strip() or None
    
    if APPOINTMENT_ID:
        print(f"\n📡 Conectado à consulta: {APPOINTMENT_ID}")
    else:
        print("\n⚠️  Modo offline - dados não serão enviados")
    
    print("\nAguardando leituras... (Ctrl+C para sair)\n")
    
    scanner = BleakScanner(detection_callback)
    await scanner.start()
    
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\n\n👋 Encerrando...")
    finally:
        await scanner.stop()

if __name__ == "__main__":
    asyncio.run(main())
