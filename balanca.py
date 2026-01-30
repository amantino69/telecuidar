import asyncio
from bleak import BleakScanner

TARGET_MAC = "F8:8F:C8:3A:B7:92"

ULTIMO_PESO = 0
CONTADOR = 0
JA_MOSTROU = False

def detection_callback(device, advertisement_data):
    global ULTIMO_PESO, CONTADOR, JA_MOSTROU

    if device.address.upper() != TARGET_MAC:
        return

    for _, data in advertisement_data.manufacturer_data.items():
        if len(data) < 6:
            continue
            
        # Peso em bytes 0-1 Big Endian, dividido por 100
        raw = (data[0] << 8) | data[1]
        peso = round(raw / 100, 2)
        
        # Se zerou, reseta
        if raw == 0:
            if JA_MOSTROU:
                print("🔄 Zerou - pronta para próxima pesagem\n")
            ULTIMO_PESO = 0
            CONTADOR = 0
            JA_MOSTROU = False
            return
        
        # Mostra em tempo real
        print(f"⚖️  {peso} kg", end="\r")
        
        # Conta estabilidade
        if raw == ULTIMO_PESO:
            CONTADOR += 1
        else:
            ULTIMO_PESO = raw
            CONTADOR = 1
            JA_MOSTROU = False
        
        # Confirma após 5 leituras iguais
        if CONTADOR >= 5 and not JA_MOSTROU:
            JA_MOSTROU = True
            print(f"\n\n✅ PESO: {peso} kg\n")

async def main():
    print("=" * 40)
    print("   BALANÇA OKOK - Modo Contínuo")
    print("=" * 40)
    print("\nCtrl+C para sair\n")
    
    scanner = BleakScanner(detection_callback)
    await scanner.start()

    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        await scanner.stop()
        print("\n👋 Fim")

asyncio.run(main())
