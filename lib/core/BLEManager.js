import { BleManager } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { DeviceType } from '../types/DeviceTypes';
import { MiBandDevice } from '../devices/xiaomi/MiBandDevice';
export class BLEManager {
    constructor(callbacks) {
        this.connectedDevices = new Map();
        this.scanningDevices = new Map();
        this.callbacks = {};
        this.isScanning = false;
        this.bleManager = new BleManager();
        this.callbacks = callbacks || {};
        this.initializeBLE();
    }
    async initializeBLE() {
        var _a, _b;
        try {
            const state = await this.bleManager.state();
            if (state !== 'PoweredOn') {
                throw new Error(`Bluetooth not available. State: ${state}`);
            }
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
        }
    }
    async requestPermissions() {
        var _a, _b;
        try {
            if (Platform.OS === 'android') {
                return true;
            }
            else if (Platform.OS === 'ios') {
                return true;
            }
            return false;
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
            return false;
        }
    }
    async startScan(timeoutMs = 10000) {
        if (this.isScanning) {
            throw new Error('Scan already in progress');
        }
        this.isScanning = true;
        this.scanningDevices.clear();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.stopScan();
                resolve(Array.from(this.scanningDevices.values()));
            }, timeoutMs);
            this.bleManager.startDeviceScan(null, null, (error, device) => {
                if (error) {
                    clearTimeout(timeout);
                    this.isScanning = false;
                    reject(error);
                    return;
                }
                if (device && device.name) {
                    const deviceType = this.identifyDeviceType(device);
                    if (deviceType !== DeviceType.UNKNOWN) {
                        const candidate = {
                            id: device.id,
                            name: device.name,
                            address: device.id,
                            rssi: device.rssi || undefined,
                            isConnected: false,
                            deviceType
                        };
                        this.scanningDevices.set(device.id, candidate);
                    }
                }
            });
        });
    }
    stopScan() {
        if (this.isScanning) {
            this.bleManager.stopDeviceScan();
            this.isScanning = false;
        }
    }
    identifyDeviceType(device) {
        var _a;
        const name = ((_a = device.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        if (name.includes('mi band')) {
            if (name.includes('7'))
                return DeviceType.MI_BAND_7;
            if (name.includes('6'))
                return DeviceType.MI_BAND_6;
            if (name.includes('5'))
                return DeviceType.MI_BAND_5;
            if (name.includes('4'))
                return DeviceType.MI_BAND_4;
            if (name.includes('3'))
                return DeviceType.MI_BAND_3;
            if (name.includes('2'))
                return DeviceType.MI_BAND_2;
            return DeviceType.MI_BAND;
        }
        return DeviceType.UNKNOWN;
    }
    async pairDevice(deviceAddress, options = {}) {
        var _a, _b, _c, _d;
        try {
            const existingConnection = this.connectedDevices.get(deviceAddress);
            if (existingConnection === null || existingConnection === void 0 ? void 0 : existingConnection.isConnected()) {
                return existingConnection;
            }
            const device = await this.bleManager.connectToDevice(deviceAddress);
            await device.discoverAllServicesAndCharacteristics();
            const candidateDevice = this.scanningDevices.get(deviceAddress);
            const deviceType = (candidateDevice === null || candidateDevice === void 0 ? void 0 : candidateDevice.deviceType) || DeviceType.UNKNOWN;
            let deviceConnection;
            switch (deviceType) {
                case DeviceType.MI_BAND:
                case DeviceType.MI_BAND_2:
                case DeviceType.MI_BAND_3:
                case DeviceType.MI_BAND_4:
                case DeviceType.MI_BAND_5:
                case DeviceType.MI_BAND_6:
                case DeviceType.MI_BAND_7:
                    deviceConnection = new MiBandDevice(device, this.callbacks, options.authToken);
                    break;
                default:
                    throw new Error(`Unsupported device type: ${deviceType}`);
            }
            await deviceConnection.initialize();
            this.connectedDevices.set(deviceAddress, deviceConnection);
            (_b = (_a = this.callbacks).onConnectionStateChange) === null || _b === void 0 ? void 0 : _b.call(_a, true, deviceAddress);
            return deviceConnection;
        }
        catch (error) {
            (_d = (_c = this.callbacks).onError) === null || _d === void 0 ? void 0 : _d.call(_c, error, deviceAddress);
            throw error;
        }
    }
    async disconnectDevice(deviceAddress) {
        var _a, _b;
        const connection = this.connectedDevices.get(deviceAddress);
        if (connection) {
            await connection.disconnect();
            this.connectedDevices.delete(deviceAddress);
            (_b = (_a = this.callbacks).onConnectionStateChange) === null || _b === void 0 ? void 0 : _b.call(_a, false, deviceAddress);
        }
    }
    getConnectedDevice(deviceAddress) {
        return this.connectedDevices.get(deviceAddress);
    }
    getConnectedDevices() {
        return Array.from(this.connectedDevices.values());
    }
    async destroy() {
        this.stopScan();
        const disconnectPromises = Array.from(this.connectedDevices.values())
            .map(connection => connection.disconnect());
        await Promise.all(disconnectPromises);
        this.connectedDevices.clear();
        await this.bleManager.destroy();
    }
}
