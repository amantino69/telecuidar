import asyncio
from bleak import BleakScanner

TARGET_MAC = "F8:8F:C8:3A:B7:92"

def detection_callback(device, advertisement_data):
    if device.address.upper() != TARGET_MAC:
        return

    for _, data in advertisement_data.manufacturer_data.items():
        if len(data) >= 4 and data[0] == 0x24:
            raw_weight = (data[2] << 8) | data[3]
            weight_kg = raw_weight / 100.0

            if raw_weight > 0:
                print(f"⚖️ Peso detectado: {weight_kg:.2f} kg")

async def main():
    print("Suba na balança para capturar o peso...")
    scanner = BleakScanner(detection_callback)
    await scanner.start()
    await asyncio.sleep(15)
    await scanner.stop()

asyncio.run(main())
