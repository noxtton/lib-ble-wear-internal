import { DeviceCandidate, DeviceEventCallbacks, PairingOptions } from '../types/DeviceTypes';
import { DeviceConnection } from './DeviceConnection';
export declare class BLEManager {
    private bleManager;
    private connectedDevices;
    private scanningDevices;
    private callbacks;
    private isScanning;
    constructor(callbacks?: DeviceEventCallbacks);
    private initializeBLE;
    requestPermissions(): Promise<boolean>;
    startScan(timeoutMs?: number): Promise<DeviceCandidate[]>;
    stopScan(): void;
    private identifyDeviceType;
    pairDevice(deviceAddress: string, options?: PairingOptions): Promise<DeviceConnection>;
    disconnectDevice(deviceAddress: string): Promise<void>;
    getConnectedDevice(deviceAddress: string): DeviceConnection | undefined;
    getConnectedDevices(): DeviceConnection[];
    destroy(): Promise<void>;
}
