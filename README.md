# BLE Wearables

A cross-platform React Native/Expo library for direct Bluetooth Low Energy (BLE) communication with wearable devices.This library enables privacy-focused health data collection by connecting directly to devices without vendor APIs.

## Features

- **Direct BLE Communication**: Connect to devices without vendor APIs
- **Privacy-First**: All data stays on device and under user control
- **Cross-Platform**: Works on iOS, Android, macOS, and web via Expo
- **Mi Band Support**: Currently supports Xiaomi Mi Band series (2-8)
- **Health Metrics**: Heart rate, steps, calories, battery level, and more
- **Auto-Reconnection**: Robust connection management with health checks
- **State Management**: Comprehensive device state tracking
- **Error Handling**: Detailed error reporting and recovery

## Supported Devices

### Xiaomi Mi Band Series

- Mi Band 2, 3, 4, 5, 6, 7, 8
- Smart Band 8
- Generic Mi Band devices

### Supported Metrics

- Heart Rate
- Steps
- Calories
- Battery Level
- Activity Data

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

### Peer Dependencies

```bash
npm install react-native-ble-plx react-native-crypto react-native-randombytes
```

## Setup

### Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

### iOS Permissions

Add to `ios/YourApp/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to your wearable devices</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to connect to your wearable devices</string>
```

## Quick Start

```typescript
import { BLEManager, DeviceType, DeviceEventCallbacks } from "ble-wearables";

const callbacks: DeviceEventCallbacks = {
  onHeartRate: (heartRate, deviceAddress) => {
    console.log(`Heart rate: ${heartRate} from ${deviceAddress}`);
  },
  onSteps: (steps, deviceAddress) => {
    console.log(`Steps: ${steps} from ${deviceAddress}`);
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

// Initialize BLE Manager
const bleManager = new BLEManager(callbacks);

// Wait for initialization
await bleManager.waitUntilReady();

// Scan for devices
const devices = await bleManager.startScan(15000);
console.log("Found devices:", devices);

// Connect to a device
const device = devices.find((d) => d.deviceType === DeviceType.MI_BAND_8);
if (device) {
  const connection = await bleManager.pairDevice(device.address, {
    authToken: "your-16-byte-hex-auth-token", // Required for Mi Band
  });

  // Trigger measurements
  await connection.triggerHeartRateMeasurement();
  await connection.triggerStepsMeasurement();
}
```

## API Reference

### BLEManager

Main class for managing BLE operations.

#### Constructor

```typescript
new BLEManager(callbacks?: DeviceEventCallbacks)
```

#### Methods

##### `startScan(timeoutMs?: number): Promise<DeviceCandidate[]>`

Scans for compatible wearable devices.

```typescript
const devices = await bleManager.startScan(15000);
```

##### `pairDevice(deviceAddress: string, options?: PairingOptions): Promise<DeviceConnection>`

Connects and pairs with a device.

```typescript
const connection = await bleManager.pairDevice(device.address, {
  authToken: "1234567890abcdef1234567890abcdef",
  timeout: 30000,
});
```

##### `disconnectDevice(deviceAddress: string): Promise<void>`

Disconnects from a specific device.

##### `getConnectedDevices(): DeviceConnection[]`

Returns all currently connected devices.

### DeviceConnection

Represents a connection to a specific device.

#### Methods

##### `triggerHeartRateMeasurement(): Promise<boolean>`

Initiates a heart rate measurement.

##### `triggerStepsMeasurement(): Promise<boolean>`

Requests current step count.

##### `triggerCaloriesMeasurement(): Promise<boolean>`

Requests current calorie data.

##### `getBatteryLevel(): Promise<number | null>`

Gets the current battery level (0-100).

##### `isConnected(): boolean`

Checks if the device is currently connected.

##### `disconnect(): Promise<void>`

Disconnects from the device.

### DeviceEventCallbacks

Interface for handling device events.

```typescript
interface DeviceEventCallbacks {
  onConnectionStateChange?: (connected: boolean, deviceAddress: string) => void;
  onHealthMetrics?: (metrics: HealthMetrics) => void;
  onHeartRate?: (heartRate: number, deviceAddress: string) => void;
  onSteps?: (steps: number, deviceAddress: string) => void;
  onCalories?: (calories: number, deviceAddress: string) => void;
  onError?: (error: Error, deviceAddress?: string) => void;
}
```

## Authentication

Mi Band devices require authentication using a secret key. This key is unique per device and needs to be obtained through the official Mi Fit app or extracted from the device pairing process.

```typescript
// Example 16-byte hex authentication token
const authToken = "1234567890abcdef1234567890abcdef";

const connection = await bleManager.pairDevice(device.address, {
  authToken: authToken,
});
```

## Connection Management

The library includes connection management:

- **Auto-Reconnection**: Automatically reconnects when connection is lost
- **Health Checks**: Periodic connection health monitoring
- **State Management**: Tracks device states (connecting, connected, authenticated, ready)
- **Error Recovery**: Graceful handling of connection errors

```typescript
const state = connection.getDeviceState();
console.log("Device state:", state);

if (connection.isReady()) {
  await connection.triggerHeartRateMeasurement();
}
```

### Adding New Devices

1. Create device-specific protocol implementation in `src/devices/`
2. Add device signature to `DeviceDiscovery.ts`
3. Implement the `DeviceConnection` abstract class
4. Add device constants and data parsers
