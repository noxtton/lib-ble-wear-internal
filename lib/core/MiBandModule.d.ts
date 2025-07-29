import { DeviceCandidate } from '../types/DeviceTypes';
interface MiBandEvents {
    'PairingStarted': {
        deviceAddress: string;
    };
    'PairingSuccess': {
        deviceAddress: string;
    };
    'PairingError': {
        error: string;
        deviceAddress?: string;
    };
    'GattConnectionState': {
        status: 'connected' | 'disconnected';
        deviceAddress: string;
    };
    'HeartRateUpdate': {
        heartRate: number;
        deviceAddress: string;
    };
    'onXiaomiHeartRateData': {
        heartRate: number;
    };
    'onXiaomiStepsData': {
        steps: number;
    };
    'onXiaomiCaloriesData': {
        calories: number;
    };
    'onXiaomiStandingHoursData': {
        standingHours: number;
    };
}
export declare class MiBandModule {
    private static instance;
    private bleManager;
    private eventEmitter?;
    private connectedDevices;
    private currentPairingDevice?;
    private eventListeners;
    private constructor();
    static getInstance(): MiBandModule;
    getBondedDevices(): Promise<DeviceCandidate[]>;
    startPairing(deviceAddress: string, authToken?: string): Promise<string>;
    stopPairing(): Promise<string>;
    triggerXiaomiHrMeasure(deviceAddress?: string): Promise<string>;
    triggerXiaomiStepsMeasure(deviceAddress?: string): Promise<string>;
    triggerXiaomiCaloriesMeasure(deviceAddress?: string): Promise<string>;
    triggerXiaomiStandingHoursMeasure(deviceAddress?: string): Promise<string>;
    scanForDevices(timeoutMs?: number, includeBonded?: boolean): Promise<DeviceCandidate[]>;
    stopScan(): void;
    addListener<K extends keyof MiBandEvents>(eventName: K, listener: (event: MiBandEvents[K]) => void): () => void;
    removeAllListeners<K extends keyof MiBandEvents>(eventName?: K): void;
    private emitEvent;
    private handleConnectionStateChange;
    private handleError;
    private handleHeartRate;
    private handleSteps;
    private handleCalories;
    getConnectedDevices(): string[];
    isDeviceConnected(deviceAddress: string): boolean;
    disconnectDevice(deviceAddress: string): Promise<void>;
    getBatteryLevel(deviceAddress?: string): Promise<number | null>;
    destroy(): Promise<void>;
}
export declare const MiBand: MiBandModule;
export interface MiBandNativeModule {
    startPairing(deviceAddress: string, authToken?: string): Promise<string>;
    stopPairing(): Promise<string>;
    getBondedDevices(): Promise<DeviceCandidate[]>;
    triggerXiaomiHrMeasure(): Promise<string>;
    triggerXiaomiStepsMeasure(): Promise<string>;
    triggerXiaomiCaloriesMeasure(): Promise<string>;
    triggerXiaomiStandingHoursMeasure(): Promise<string>;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}
export {};
