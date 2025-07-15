export * from '../core/BLEManager';
export * from '../core/DeviceConnection';
export * from '../devices/xiaomi/MiBandDevice';
export * from '../devices/xiaomi/MiBandProtocol';
export * from '../types/DeviceTypes';
export * from '../utils/BinaryUtils';
export { BLEManager } from '../core/BLEManager';
export { MiBandDevice } from '../devices/xiaomi/MiBandDevice';
export interface DeviceCandidate {
    id: string;
    name: string;
    address: string;
    rssi?: number;
    isConnected: boolean;
    deviceType: DeviceType;
}
export declare enum DeviceType {
    MI_BAND = "MI_BAND",
    MI_BAND_2 = "MI_BAND_2",
    MI_BAND_3 = "MI_BAND_3",
    MI_BAND_4 = "MI_BAND_4",
    MI_BAND_5 = "MI_BAND_5",
    MI_BAND_6 = "MI_BAND_6",
    MI_BAND_7 = "MI_BAND_7",
    UNKNOWN = "UNKNOWN"
}
export interface HealthMetrics {
    heartRate?: number;
    steps?: number;
    calories?: number;
    standingHours?: number;
    timestamp: Date;
    deviceAddress: string;
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
