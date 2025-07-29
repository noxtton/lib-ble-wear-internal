# BLE Wearables

A cross-platform React Native/Expo library for direct Bluetooth Low Energy (BLE) communication with wearable devices. This library enables privacy-focused health data collection by connecting directly to devices without vendor APIs, featuring enhanced bonded device detection and seamless cross-platform compatibility.

## Features

- **Direct BLE Communication**: Connect to devices without vendor APIs
- **Privacy-First**: All data stays on device and under user control
- **Cross-Platform**: Works on iOS, Android, macOS, and web via Expo
- **Enhanced Bonded Device Detection**: Multiple detection methods for already paired devices
- **Mi Band Support**: Full support for Xiaomi Mi Band series (2-8) with GadgetBridge protocol
- **Health Metrics**: Heart rate, steps, calories, standing hours, battery level, and more
- **Auto-Reconnection**: Robust connection management with health checks
- **State Management**: Comprehensive device state tracking
- **Error Handling**: Detailed error reporting and recovery
- **Device Caching**: Smart caching of previously connected devices
- **AES Authentication**: Secure authentication for Mi Band devices
- **Kotlin API Compatibility**: Matches native Android implementation for easy migration

## Supported Devices

### Xiaomi Mi Band Series

- Mi Band 2, 3, 4, 5, 6, 7, 8
- Smart Band 8
- Generic Mi Band devices (auto-detected)

### Supported Metrics

- **Heart Rate** - Real-time and on-demand measurements
- **Steps** - Daily step count and real-time updates
- **Calories** - Burned calories tracking
- **Standing Hours** - Active hours monitoring
- **Battery Level** - Device battery status
- **Activity Data** - Comprehensive fitness metrics

## Installation

### For Development/Testing

Clone or download the library and install it locally:

```bash
# Clone the repository
git clone <git@github.com:noxtton/lib-ble-wear-internal.git>
cd ble-wearables

# Install dependencies
npm install

# Build the library
npm run build

# In your project, install from local path
npm install /path/to/ble-wearables
```

### Dependencies

```bash
npm install react-native-ble-plx crypto-js @react-native-async-storage/async-storage
```

## Setup

### Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />

<!-- New Bluetooth permissions for Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

<!-- Location permission for BLE scanning -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### iOS Permissions

Add to `ios/YourApp/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth to connect to your fitness devices</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app needs Bluetooth to connect to your fitness devices</string>
```

## Quick Start

```typescript
import { MiBand } from "ble-wearables";

// Set up event listeners
const unsubscribeHeartRate = MiBand.addListener(
  "onXiaomiHeartRateData",
  (event) => {
    console.log(`Heart rate: ${event.heartRate} bpm`);
  }
);

const unsubscribeSteps = MiBand.addListener("onXiaomiStepsData", (event) => {
  console.log(`Steps: ${event.steps}`);
});

const unsubscribePairing = MiBand.addListener("PairingSuccess", (event) => {
  console.log(`Device ${event.deviceAddress} paired successfully!`);
});

// Get bonded devices (already paired)
const bondedDevices = await MiBand.getBondedDevices();
console.log("Bonded devices:", bondedDevices);

const allDevices = await MiBand.scanForDevices(15000, true);
console.log("All compatible devices:", allDevices);

// Connect to a device
const device = allDevices.find((d) => d.name.includes("Mi Band"));
if (device) {
  await MiBand.startPairing(device.address, "your-16-byte-hex-auth-token");

  // Trigger measurements
  await MiBand.triggerXiaomiHrMeasure();
  await MiBand.triggerXiaomiStepsMeasure();
  await MiBand.triggerXiaomiCaloriesMeasure();
  await MiBand.triggerXiaomiStandingHoursMeasure();
}

unsubscribeHeartRate();
unsubscribeSteps();
unsubscribePairing();
```

## API Reference

### MiBand (Singleton)

Main singleton class for Mi Band operations that matches the Kotlin API.

#### Device Management

##### `getBondedDevices(): Promise<DeviceCandidate[]>`

Gets all bonded (previously paired) compatible devices using multiple detection methods.

```typescript
const bondedDevices = await MiBand.getBondedDevices();
bondedDevices.forEach((device) => {
  console.log(`Found bonded device: ${device.name} (${device.address})`);
});
```

##### `scanForDevices(timeoutMs?: number, includeBonded?: boolean): Promise<DeviceCandidate[]>`

Scans for compatible devices, optionally including bonded devices.

```typescript
const devices = await MiBand.scanForDevices(15000, true);

const newDevices = await MiBand.scanForDevices(10000, false);
```

##### `stopScan(): void`

Stops any active device scanning.

#### Connection Management

##### `startPairing(deviceAddress: string, authToken?: string): Promise<string>`

Initiates pairing with a device. Returns a success message.

```typescript
try {
  const result = await MiBand.startPairing(
    "AA:BB:CC:DD:EE:FF",
    "1234567890abcdef1234567890abcdef"
  );
  console.log(result);
} catch (error) {
  console.error("Pairing failed:", error);
}
```

##### `stopPairing(): Promise<string>`

Stops pairing and disconnects current device.

```typescript
await MiBand.stopPairing();
```

#### Health Measurements

##### `triggerXiaomiHrMeasure(deviceAddress?: string): Promise<string>`

Triggers heart rate measurement.

##### `triggerXiaomiStepsMeasure(deviceAddress?: string): Promise<string>`

Triggers steps measurement.

##### `triggerXiaomiCaloriesMeasure(deviceAddress?: string): Promise<string>`

Triggers calories measurement.

##### `triggerXiaomiStandingHoursMeasure(deviceAddress?: string): Promise<string>`

Triggers standing hours measurement.

```typescript
await MiBand.triggerXiaomiHrMeasure();
await MiBand.triggerXiaomiStepsMeasure();
await MiBand.triggerXiaomiCaloriesMeasure();
await MiBand.triggerXiaomiStandingHoursMeasure();
```

#### Utility Methods

##### `getBatteryLevel(deviceAddress?: string): Promise<number | null>`

Gets battery level (0-100) of connected device.

##### `isDeviceConnected(deviceAddress: string): boolean`

Checks if a specific device is connected.

##### `getConnectedDevices(): string[]`

Returns array of connected device addresses.

#### Event Handling

##### `addListener<K>(eventName: K, listener: Function): () => void`

Adds event listener. Returns unsubscribe function.

##### `removeAllListeners(eventName?: string): void`

Removes all listeners for an event, or all events if no name specified.

### Event Types

The library emits events that match the Kotlin implementation:

```typescript
interface MiBandEvents {
  PairingSuccess: { deviceAddress: string };
  PairingError: { error: string; deviceAddress?: string };
  GattConnectionState: {
    status: "connected" | "disconnected";
    deviceAddress: string;
  };

  onXiaomiHeartRateData: { heartRate: number };
  onXiaomiStepsData: { steps: number };
  onXiaomiCaloriesData: { calories: number };
  onXiaomiStandingHoursData: { standingHours: number };

  HeartRateUpdate: { heartRate: number; deviceAddress: string };
}
```

### Legacy BLEManager API

For advanced use cases, you can still use the lower-level BLEManager:

```typescript
import { BLEManager, DeviceEventCallbacks } from "ble-wearables";

const callbacks: DeviceEventCallbacks = {
  onHeartRate: (heartRate, deviceAddress) => {
    console.log(`Heart rate: ${heartRate} from ${deviceAddress}`);
  },
  onConnectionStateChange: (connected, deviceAddress) => {
    console.log(
      `Device ${deviceAddress} ${connected ? "connected" : "disconnected"}`
    );
  },
  onError: (error, deviceAddress) => {
    console.error(`Error from ${deviceAddress}:`, error);
  },
};

const bleManager = new BLEManager(callbacks);
await bleManager.waitUntilReady();

const devices = await bleManager.startScan(15000);
const connection = await bleManager.pairDevice(device.address, { authToken });
```

## Device Types

```typescript
enum DeviceType {
  MI_BAND = "MI_BAND",
  MI_BAND_2 = "MI_BAND_2",
  MI_BAND_3 = "MI_BAND_3",
  MI_BAND_4 = "MI_BAND_4",
  MI_BAND_5 = "MI_BAND_5",
  MI_BAND_6 = "MI_BAND_6",
  MI_BAND_7 = "MI_BAND_7",
  MI_BAND_8 = "MI_BAND_8",
  UNKNOWN = "UNKNOWN",
}
```

## Authentication

Mi Band devices require authentication using a secret key. This key is unique per device and must be obtained through:

1. **Official Mi Fit app** - Extract from app data
2. **Pairing process** - Obtained during initial device setup
3. **GadgetBridge** - Open source alternative that can provide keys

```typescript
// Example 16-byte hex authentication token (32 hex characters)
const authToken = "1234567890abcdef1234567890abcdef";

// The library uses AES-128-ECB encryption for secure authentication
await MiBand.startPairing(device.address, authToken);
```

## Enhanced Bonded Device Detection

The library uses multiple methods to detect bonded devices:

1. **Direct BLE Query** - `bleManager.devices([])`
2. **Service-Specific Scanning** - Scanning for known Mi Band services
3. **Device Cache** - Cached previously connected devices
4. **Connection Testing** - Quick connection attempts to verify reachability

This ensures maximum compatibility across Android and iOS platforms.

## Error Handling

```typescript
import { BLEError, BLEErrorType } from "ble-wearables";

try {
  await MiBand.startPairing(deviceAddress, authToken);
} catch (error) {
  if (error instanceof BLEError) {
    switch (error.type) {
      case BLEErrorType.CONNECTION_FAILED:
        console.error("Failed to connect to device");
        break;
      case BLEErrorType.AUTHENTICATION_FAILED:
        console.error("Invalid auth token");
        break;
      case BLEErrorType.PERMISSIONS_DENIED:
        console.error("Bluetooth permissions required");
        break;
      default:
        console.error("Unknown BLE error:", error.message);
    }
  }
}
```

## Troubleshooting

### Bonded Device Issues

If bonded devices aren't being detected:

1. **Check Permissions**: Ensure all Bluetooth permissions are granted
2. **Clear Cache**: `await DeviceCache.clearCache()`
3. **Manual Pairing**: Use device settings to pair first
4. **Platform Differences**: iOS has limitations on bonded device access

### Connection Issues

```typescript
// Check device state
const isConnected = MiBand.isDeviceConnected(deviceAddress);

// Get connected devices
const connectedDevices = MiBand.getConnectedDevices();

// Force reconnection
await MiBand.stopPairing();
await MiBand.startPairing(deviceAddress, authToken);
```

### Authentication Issues

```typescript
// Validate auth token format
if (!/^[0-9a-fA-F]{32}$/.test(authToken)) {
  console.error("Invalid auth token format");
}

// Check if device supports authentication
const deviceCapabilities = DeviceDiscovery.getDeviceCapabilities(
  DeviceType.MI_BAND_8
);
if (!deviceCapabilities.supportsAuth) {
  console.log("Device does not require authentication");
}
```
