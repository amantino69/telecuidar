import asyncio
from bleak import BleakScanner

TARGET_MAC = "F8:8F:C8:3A:B7:92"

def detection_callback(device, advertisement_data):
    if device.address.upper() != TARGET_MAC:
        return

    for _, data in advertisement_data.manufacturer_data.items():
        if len(data) >= 6 and data[0] == 0x24:
            hex_bytes = " ".join(f"{b:02X}" for b in data)
            raw_be = (data[2] << 8) | data[3]
            raw_le = (data[3] << 8) | data[2]

            print("\n📦 Pacote BLE")
            print("HEX:", hex_bytes)
            print("raw_be:", raw_be)
            print("raw_le:", raw_le)
            print("byte[4] (escala?):", data[4])
            print("byte[5] (status?):", data[5])

async def main():
    print("Suba na balança e fique parado...")
    scanner = BleakScanner(detection_callback)
    await scanner.start()
    await asyncio.sleep(15)
    await scanner.stop()

asyncio.run(main())
