import { Device } from 'react-native-ble-plx';
import { DeviceConnection } from '../../core/DeviceConnection';
import { DeviceEventCallbacks } from '../../types/DeviceTypes';
export declare class MiBandDevice extends DeviceConnection {
    private protocol;
    private characteristics;
    private isAuthenticated;
    constructor(device: Device, callbacks: DeviceEventCallbacks, authToken?: string);
    initialize(): Promise<void>;
    private discoverCharacteristics;
    private setupNotifications;
    private authenticate;
    triggerHeartRateMeasurement(): Promise<boolean>;
    triggerStepsMeasurement(): Promise<boolean>;
    triggerCaloriesMeasurement(): Promise<boolean>;
    triggerStandingHoursMeasurement(): Promise<boolean>;
    private handleHeartRateData;
    private handleActivityData;
}
