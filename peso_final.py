import asyncio
from bleak import BleakScanner, BleakClient

TARGET_MAC = "F8:8F:C8:3A:B7:92"
CHAR_UUID = "00002a9d-0000-1000-8000-00805f9b34fb"

ULTIMO_PESO = None
CONTADOR_ESTAVEL = 0
MIN_REPETICOES = 5
PESO_CAPTURADO = False

def notification_handler(_, data: bytearray):
    global ULTIMO_PESO, CONTADOR_ESTAVEL, PESO_CAPTURADO

    if PESO_CAPTURADO or len(data) < 6:
        return

    status = data[5]
    if status != 0x01:
        CONTADOR_ESTAVEL = 0
        return

    raw = int.from_bytes(data[2:4], byteorder="big")
    peso = round(raw * 0.01548, 2)

    if peso == ULTIMO_PESO:
        CONTADOR_ESTAVEL += 1
    else:
        ULTIMO_PESO = peso
        CONTADOR_ESTAVEL = 1

    if CONTADOR_ESTAVEL >= MIN_REPETICOES:
        PESO_CAPTURADO = True
        print(f"\n✅ PESO FINAL CONFIRMADO: {peso} kg\n")

async def main():
    print("🔍 Aguardando balança anunciar (suba nela)...\n")

    device = None

    while device is None:
        devices = await BleakScanner.discover(timeout=5)
        for d in devices:
            if d.address.upper() == TARGET_MAC:
                device = d
                break

    print("🎯 Balança encontrada, conectando...\n")

    async with BleakClient(device) as client:
        await client.start_notify(CHAR_UUID, notification_handler)

        while not PESO_CAPTURADO:
            await asyncio.sleep(0.2)

        await client.stop_notify(CHAR_UUID)

asyncio.run(main())
