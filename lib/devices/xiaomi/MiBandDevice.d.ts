import { Device } from 'react-native-ble-plx';
import { DeviceConnection } from '../../core/DeviceConnection';
import { DeviceEventCallbacks, DeviceState } from '../../types/DeviceTypes';
export declare class MiBandDevice extends DeviceConnection {
    private protocol;
    private authentication;
    private characteristics;
    private stateManager;
    private connectionManager;
    private isAuthenticated;
    constructor(device: Device, callbacks: DeviceEventCallbacks, authToken?: string);
    initialize(): Promise<void>;
    private discoverCharacteristics;
    private setupNotifications;
    private authenticate;
    private writeCharacteristic;
    triggerHeartRateMeasurement(): Promise<boolean>;
    triggerStepsMeasurement(): Promise<boolean>;
    triggerCaloriesMeasurement(): Promise<boolean>;
    triggerStandingHoursMeasurement(): Promise<boolean>;
    getBatteryLevel(): Promise<number | null>;
    private handleHeartRateData;
    private handleActivityData;
    private reconnect;
    getDeviceState(): DeviceState;
    isReady(): boolean;
    disconnect(): Promise<void>;
}
