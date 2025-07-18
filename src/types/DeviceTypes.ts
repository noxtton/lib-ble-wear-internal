export interface DeviceCandidate {
  id: string;
  name: string;
  address: string;
  rssi?: number;
  isConnected: boolean;
  deviceType: DeviceType;
}

export enum DeviceType {
  MI_BAND = 'MI_BAND',
  MI_BAND_2 = 'MI_BAND_2',
  MI_BAND_3 = 'MI_BAND_3',
  MI_BAND_4 = 'MI_BAND_4',
  MI_BAND_5 = 'MI_BAND_5',
  MI_BAND_6 = 'MI_BAND_6',
  MI_BAND_7 = 'MI_BAND_7',
  MI_BAND_8 = 'MI_BAND_8',
  UNKNOWN = 'UNKNOWN'
}

export interface HealthMetrics {
  heartRate?: number;
  steps?: number;
  calories?: number;
  standingHours?: number;
  timestamp: Date;
  deviceAddress: string;
}

export interface DetailedActivityData {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  heartRate?: number;
  timestamp: Date;
  dataType: 'realtime' | 'historical';
}

export interface HeartRateData {
  heartRate: number;
  timestamp: Date;
  quality: 'good' | 'poor' | 'unknown';
}

export enum DeviceState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  READY = 'ready',
  ERROR = 'error'
}

export enum BLEErrorType {
  CONNECTION_FAILED = 'connection_failed',
  AUTHENTICATION_FAILED = 'authentication_failed',
  CHARACTERISTIC_NOT_FOUND = 'characteristic_not_found',
  WRITE_FAILED = 'write_failed',
  READ_FAILED = 'read_failed',
  NOTIFICATION_FAILED = 'notification_failed',
  TIMEOUT = 'timeout',
  DEVICE_NOT_SUPPORTED = 'device_not_supported',
  PERMISSIONS_DENIED = 'permissions_denied'
}

export interface DeviceSignature {
  namePatterns: string[];
  serviceUUIDs: string[];
  manufacturerData?: number[];
  minRSSI?: number;
}

export interface BLECharacteristic {
  uuid: string;
  properties: string[];
  value?: Uint8Array;
}

export interface BLEService {
  uuid: string;
  characteristics: BLECharacteristic[];
}

export interface DeviceEventCallbacks {
  onConnectionStateChange?: (connected: boolean, deviceAddress: string) => void;
  onHealthMetrics?: (metrics: HealthMetrics) => void;
  onHeartRate?: (heartRate: number, deviceAddress: string) => void;
  onSteps?: (steps: number, deviceAddress: string) => void;
  onCalories?: (calories: number, deviceAddress: string) => void;
  onStandingHours?: (hours: number, deviceAddress: string) => void;
  onError?: (error: Error, deviceAddress?: string) => void;
  onPairingStateChange?: (isPairing: boolean, deviceAddress: string) => void;
}

export interface PairingOptions {
  authToken?: string;
  timeout?: number;
  autoConnect?: boolean;
}

export interface ActivityData {
  steps?: number;
  calories?: number;
  standingHours?: number;
  distance?: number;
}