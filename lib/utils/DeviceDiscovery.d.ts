import { DeviceCandidate, DeviceType } from '../types/DeviceTypes';
export interface DeviceSignature {
    namePatterns: string[];
    serviceUUIDs: string[];
    manufacturerData?: number[];
    minRSSI?: number;
}
export declare class DeviceDiscovery {
    private static readonly DEVICE_SIGNATURES;
    static identifyDevice(scanResult: any): DeviceType;
    private static isLikelyXiaomiDevice;
    static getDeviceCapabilities(deviceType: DeviceType): {
        supportsHeartRate: boolean;
        supportsSteps: boolean;
        supportsCalories: boolean;
        supportsSleep: boolean;
        supportsNotifications: boolean;
        supportsFind: boolean;
        batteryMonitoring: boolean;
    };
    static filterCompatibleDevices(scanResults: any[]): DeviceCandidate[];
}
