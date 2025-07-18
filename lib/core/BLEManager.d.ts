import { DeviceCandidate, DeviceEventCallbacks, PairingOptions } from '../types/DeviceTypes';
export declare class BLEManager {
    private bleManager;
    private connectedDevices;
    private scanningDevices;
    private allScannedDevices;
    private probedDevices;
    private callbacks;
    private isScanning;
    private isInitialized;
    constructor(callbacks?: DeviceEventCallbacks);
    private initializeBLE;
    requestPermissions(): Promise<boolean>;
    isReady(): boolean;
    waitUntilReady(timeout?: number): Promise<void>;
    startScan(timeoutMs?: number): Promise<DeviceCandidate[]>;
    private probeDevice;
    private identifyCompatibleDevices;
    private identifyDeviceByName;
    stopScan(): void;
    pairDevice(deviceAddress: string, options?: PairingOptions): Promise<any>;
    disconnectDevice(deviceAddress: string): Promise<void>;
    getConnectedDevice(deviceAddress: string): any;
    getConnectedDevices(): any[];
    getAllScannedDevices(): any[];
    getProbedDevices(): any[];
    destroy(): Promise<void>;
}
