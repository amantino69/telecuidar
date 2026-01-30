import asyncio
from bleak import BleakScanner

TARGET_MAC = "F8:8F:C8:3A:B7:92"

def detection_callback(device, advertisement_data):
    if device.address.upper() == TARGET_MAC:
        print("\n🎯 Balança detectada!")
        print("MAC:", device.address)
        print("RSSI:", advertisement_data.rssi)
        print("Local name:", advertisement_data.local_name)
        print("Service UUIDs:", advertisement_data.service_uuids)
        print("Manufacturer data:", advertisement_data.manufacturer_data)
        print("Service data:", advertisement_data.service_data)
        print("TX power:", advertisement_data.tx_power)

async def main():
    print("Escutando advertising BLE...")
    scanner = BleakScanner(detection_callback)
    await scanner.start()
    await asyncio.sleep(10)
    await scanner.stop()

asyncio.run(main())
