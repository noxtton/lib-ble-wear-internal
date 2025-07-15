import { Device } from 'react-native-ble-plx';
import { DeviceEventCallbacks, HealthMetrics } from '../types/DeviceTypes';
export declare abstract class DeviceConnection {
    protected device: Device;
    protected callbacks: DeviceEventCallbacks;
    protected authToken?: string;
    protected isInitialized: boolean;
    protected connectionState: boolean;
    constructor(device: Device, callbacks: DeviceEventCallbacks, authToken?: string);
    abstract initialize(): Promise<void>;
    abstract triggerHeartRateMeasurement(): Promise<boolean>;
    abstract triggerStepsMeasurement(): Promise<boolean>;
    abstract triggerCaloriesMeasurement(): Promise<boolean>;
    abstract triggerStandingHoursMeasurement(): Promise<boolean>;
    isConnected(): boolean;
    getDeviceAddress(): string;
    getDeviceName(): string;
    disconnect(): Promise<void>;
    protected emitHealthMetrics(metrics: Partial<HealthMetrics>): void;
}
