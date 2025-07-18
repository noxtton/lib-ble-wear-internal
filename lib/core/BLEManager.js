"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLEManager = void 0;
const react_native_1 = require("react-native");
const react_native_ble_plx_1 = require("react-native-ble-plx");
const DeviceTypes_1 = require("../types/DeviceTypes");
const BLEError_1 = require("../utils/BLEError");
class BLEManager {
    constructor(callbacks) {
        this.connectedDevices = new Map();
        this.scanningDevices = new Map();
        this.allScannedDevices = new Map();
        this.probedDevices = new Map();
        this.callbacks = {};
        this.isScanning = false;
        this.isInitialized = false;
        this.bleManager = new react_native_ble_plx_1.BleManager();
        this.callbacks = callbacks || {};
        this.initializeBLE();
    }
    async initializeBLE() {
        var _a, _b;
        try {
            if (react_native_1.Platform.OS === 'android') {
                console.info('Android platform detected');
            }
            const state = await this.bleManager.state();
            if (state === 'PoweredOn') {
                this.isInitialized = true;
                return;
            }
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new BLEError_1.BLEError(BLEError_1.BLEErrorType.TIMEOUT, 'BLE initialization timeout - Bluetooth not powered on'));
                }, 10000);
                const subscription = this.bleManager.onStateChange((newState) => {
                    if (newState === 'PoweredOn') {
                        clearTimeout(timeout);
                        subscription.remove();
                        resolve();
                    }
                    else if (newState === 'PoweredOff' || newState === 'Unauthorized') {
                        clearTimeout(timeout);
                        subscription.remove();
                        reject(new BLEError_1.BLEError(BLEError_1.BLEErrorType.PERMISSIONS_DENIED, `Bluetooth not available. State: ${newState}`));
                    }
                }, true);
            });
            this.isInitialized = true;
        }
        catch (error) {
            console.error('BLE initialization failed:', error);
            this.isInitialized = false;
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
            throw error;
        }
    }
    async requestPermissions() {
        var _a, _b;
        try {
            return true;
        }
        catch (error) {
            console.error('Request permissions failed:', error);
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
            return false;
        }
    }
    isReady() {
        return this.isInitialized;
    }
    async waitUntilReady(timeout = 10000) {
        if (this.isInitialized) {
            return;
        }
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new BLEError_1.BLEError(BLEError_1.BLEErrorType.TIMEOUT, 'BLE initialization timeout'));
            }, timeout);
            const intervalId = setInterval(() => {
                if (this.isInitialized) {
                    clearTimeout(timeoutId);
                    clearInterval(intervalId);
                    resolve();
                }
            }, 100);
        });
    }
    async startScan(timeoutMs = 15000) {
        if (!this.isInitialized) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'BLE Manager not initialized. Please wait for initialization to complete.');
        }
        if (this.isScanning) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'Scan already in progress');
        }
        this.isScanning = true;
        this.scanningDevices.clear();
        this.allScannedDevices.clear();
        this.probedDevices.clear();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(async () => {
                var _a;
                this.stopScan();
                const scannedDevices = Array.from(this.allScannedDevices.values());
                scannedDevices.forEach((device, index) => {
                    var _a;
                    console.info(`Device ${index + 1}:`, {
                        id: device.id,
                        name: device.name || device.localName || 'No Name',
                        rssi: device.rssi,
                        serviceUUIDs: ((_a = device.serviceUUIDs) === null || _a === void 0 ? void 0 : _a.length) || 0
                    });
                });
                const unnamedDevices = scannedDevices.filter(device => !device.name && !device.localName && device.rssi > -70);
                const devicesToProbe = unnamedDevices
                    .sort((a, b) => (b.rssi || -100) - (a.rssi || -100))
                    .slice(0, 3);
                for (const device of devicesToProbe) {
                    try {
                        const probeResult = await this.probeDevice(device.id);
                        if (probeResult) {
                            this.probedDevices.set(device.id, probeResult);
                            console.info(`Probed ${device.id}:`, {
                                name: probeResult.name,
                                services: ((_a = probeResult.services) === null || _a === void 0 ? void 0 : _a.length) || 0
                            });
                        }
                    }
                    catch (error) {
                        console.error(`Failed to probe ${device.id}:`, error instanceof Error ? error.message : String(error));
                    }
                }
                const compatibleDevices = this.identifyCompatibleDevices();
                resolve(compatibleDevices);
            }, timeoutMs);
            this.bleManager.startDeviceScan(null, null, (error, device) => {
                if (error) {
                    clearTimeout(timeout);
                    this.isScanning = false;
                    reject(new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, `Scan failed: ${error.message}`, undefined, error));
                    return;
                }
                if (device) {
                    this.allScannedDevices.set(device.id, device);
                    const deviceName = device.name || device.localName;
                    if (deviceName) {
                        console.info(`Named device found: ${deviceName} (${device.id}) RSSI: ${device.rssi}`);
                    }
                }
            });
        });
    }
    async probeDevice(deviceId) {
        try {
            const device = await this.bleManager.connectToDevice(deviceId);
            const services = await device.services();
            let deviceName = device.name || device.localName;
            const genericAccessService = services.find(s => s.uuid.toLowerCase() === '1800' || s.uuid.toLowerCase() === '00001800-0000-1000-8000-00805f9b34fb');
            if (genericAccessService && !deviceName) {
                try {
                    const characteristics = await genericAccessService.characteristics();
                    const deviceNameChar = characteristics.find(c => c.uuid.toLowerCase() === '2a00' || c.uuid.toLowerCase() === '00002a00-0000-1000-8000-00805f9b34fb');
                    if (deviceNameChar) {
                        const nameValue = await deviceNameChar.read();
                        if (nameValue.value) {
                            deviceName = Buffer.from(nameValue.value, 'base64').toString('utf8');
                        }
                    }
                }
                catch (e) {
                    console.error('Could not read device name characteristic', e);
                }
            }
            const serviceUUIDs = services.map(s => s.uuid.toLowerCase());
            const isMiBand = serviceUUIDs.some(uuid => uuid.includes('fee0') || uuid.includes('fee1') ||
                (deviceName && deviceName.toLowerCase().includes('mi')));
            await device.cancelConnection();
            const result = {
                id: deviceId,
                name: deviceName,
                services: serviceUUIDs,
                isMiBand,
                probedAt: new Date()
            };
            return result;
        }
        catch (error) {
            console.error(`Probe failed for ${deviceId}:`, (error instanceof Error ? error.message : String(error)));
            return null;
        }
    }
    identifyCompatibleDevices() {
        var _a, _b;
        const compatibleDevices = [];
        for (const device of this.allScannedDevices.values()) {
            const deviceName = device.name || device.localName;
            if (deviceName) {
                const deviceType = this.identifyDeviceByName(deviceName);
                if (deviceType !== DeviceTypes_1.DeviceType.UNKNOWN) {
                    compatibleDevices.push({
                        id: device.id,
                        name: deviceName,
                        address: device.id,
                        rssi: device.rssi,
                        isConnected: false,
                        deviceType
                    });
                }
            }
        }
        for (const probedDevice of this.probedDevices.values()) {
            if (probedDevice.name) {
                const deviceType = this.identifyDeviceByName(probedDevice.name);
                if (deviceType !== DeviceTypes_1.DeviceType.UNKNOWN) {
                    compatibleDevices.push({
                        id: probedDevice.id,
                        name: probedDevice.name,
                        address: probedDevice.id,
                        rssi: (_a = this.allScannedDevices.get(probedDevice.id)) === null || _a === void 0 ? void 0 : _a.rssi,
                        isConnected: false,
                        deviceType
                    });
                }
            }
            else if (probedDevice.isMiBand) {
                compatibleDevices.push({
                    id: probedDevice.id,
                    name: 'Mi Band (Unknown Model)',
                    address: probedDevice.id,
                    rssi: (_b = this.allScannedDevices.get(probedDevice.id)) === null || _b === void 0 ? void 0 : _b.rssi,
                    isConnected: false,
                    deviceType: DeviceTypes_1.DeviceType.MI_BAND_8
                });
            }
        }
        return compatibleDevices.sort((a, b) => (b.rssi || -100) - (a.rssi || -100));
    }
    identifyDeviceByName(deviceName) {
        const name = deviceName.toLowerCase();
        if (name.includes('mi band 8') || name.includes('smart band 8')) {
            return DeviceTypes_1.DeviceType.MI_BAND_8;
        }
        else if (name.includes('mi band 7')) {
            return DeviceTypes_1.DeviceType.MI_BAND_7;
        }
        else if (name.includes('mi band 6')) {
            return DeviceTypes_1.DeviceType.MI_BAND_6;
        }
        else if (name.includes('mi band 5')) {
            return DeviceTypes_1.DeviceType.MI_BAND_5;
        }
        else if (name.includes('mi band 4')) {
            return DeviceTypes_1.DeviceType.MI_BAND_4;
        }
        else if (name.includes('mi band 3')) {
            return DeviceTypes_1.DeviceType.MI_BAND_3;
        }
        else if (name.includes('mi band 2')) {
            return DeviceTypes_1.DeviceType.MI_BAND_2;
        }
        else if (name.includes('mi band') || name.includes('miband')) {
            return DeviceTypes_1.DeviceType.MI_BAND;
        }
        else if (name.includes('xiaomi') || name.includes('smart band')) {
            return DeviceTypes_1.DeviceType.MI_BAND_8;
        }
        return DeviceTypes_1.DeviceType.UNKNOWN;
    }
    stopScan() {
        if (this.isScanning) {
            this.bleManager.stopDeviceScan();
            this.isScanning = false;
        }
    }
    async pairDevice(deviceAddress, options = {}) {
        var _a, _b, _c, _d;
        try {
            const existingConnection = this.connectedDevices.get(deviceAddress);
            if (existingConnection) {
                return existingConnection;
            }
            const device = await this.bleManager.connectToDevice(deviceAddress);
            await device.discoverAllServicesAndCharacteristics();
            const deviceConnection = {
                device,
                isConnected: () => true,
                getDeviceAddress: () => device.id,
                getDeviceName: () => device.name || 'Unknown Device',
                disconnect: async () => {
                    await device.cancelConnection();
                },
                getServices: async () => {
                    const services = await device.services();
                    return services.map(s => ({
                        uuid: s.uuid,
                        characteristics: []
                    }));
                }
            };
            this.connectedDevices.set(deviceAddress, deviceConnection);
            (_b = (_a = this.callbacks).onConnectionStateChange) === null || _b === void 0 ? void 0 : _b.call(_a, true, deviceAddress);
            return deviceConnection;
        }
        catch (error) {
            console.error('Connection failed:', error);
            const bleError = error instanceof BLEError_1.BLEError ? error : new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, `Device pairing failed: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`, deviceAddress, error);
            (_d = (_c = this.callbacks).onError) === null || _d === void 0 ? void 0 : _d.call(_c, bleError, deviceAddress);
            throw bleError;
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
    getAllScannedDevices() {
        return Array.from(this.allScannedDevices.values());
    }
    getProbedDevices() {
        return Array.from(this.probedDevices.values());
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
exports.BLEManager = BLEManager;
