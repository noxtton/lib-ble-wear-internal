"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiBand = exports.MiBandModule = void 0;
const react_native_1 = require("react-native");
const BLEManager_1 = require("./BLEManager");
const MiBandDevice_1 = require("../devices/xiaomi/MiBandDevice");
const BLEError_1 = require("../utils/BLEError");
class MiBandModule {
    constructor() {
        this.connectedDevices = new Map();
        this.eventListeners = new Map();
        this.bleManager = new BLEManager_1.BLEManager({
            onConnectionStateChange: this.handleConnectionStateChange.bind(this),
            onError: this.handleError.bind(this),
            onHeartRate: this.handleHeartRate.bind(this),
            onSteps: this.handleSteps.bind(this),
            onCalories: this.handleCalories.bind(this),
        });
        if (react_native_1.Platform.OS === 'android' && react_native_1.NativeModules.BluetoothPairingModule) {
            this.eventEmitter = new react_native_1.NativeEventEmitter(react_native_1.NativeModules.BluetoothPairingModule);
        }
    }
    static getInstance() {
        if (!MiBandModule.instance) {
            MiBandModule.instance = new MiBandModule();
        }
        return MiBandModule.instance;
    }
    async getBondedDevices() {
        try {
            await this.bleManager.waitUntilReady();
            return await this.bleManager.getBondedDevices();
        }
        catch (error) {
            console.error('Failed to get bonded devices:', error);
            throw error;
        }
    }
    async startPairing(deviceAddress, authToken) {
        try {
            if (this.currentPairingDevice) {
                console.warn('Pairing process already in progress. Cleaning up existing one.');
                await this.stopPairing();
            }
            this.currentPairingDevice = deviceAddress;
            this.emitEvent('PairingStarted', { deviceAddress });
            await this.bleManager.waitUntilReady();
            const deviceConnection = await this.bleManager.pairDevice(deviceAddress, {
                authToken,
                timeout: 15000
            });
            const miBandDevice = new MiBandDevice_1.MiBandDevice(deviceConnection.device, {
                onConnectionStateChange: this.handleConnectionStateChange.bind(this),
                onError: this.handleError.bind(this),
                onHeartRate: this.handleHeartRate.bind(this),
                onSteps: this.handleSteps.bind(this),
                onCalories: this.handleCalories.bind(this),
            }, authToken);
            await miBandDevice.initialize();
            this.connectedDevices.set(deviceAddress, miBandDevice);
            this.emitEvent('PairingSuccess', { deviceAddress });
            this.emitEvent('GattConnectionState', { status: 'connected', deviceAddress });
            return `Pairing process started for ${deviceAddress}`;
        }
        catch (error) {
            this.currentPairingDevice = undefined;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emitEvent('PairingError', { error: errorMessage, deviceAddress });
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, `Failed to start pairing: ${errorMessage}`, deviceAddress, error);
        }
    }
    async stopPairing() {
        if (this.currentPairingDevice) {
            const deviceAddress = this.currentPairingDevice;
            try {
                const device = this.connectedDevices.get(deviceAddress);
                if (device) {
                    await device.disconnect();
                    this.connectedDevices.delete(deviceAddress);
                }
                await this.bleManager.disconnectDevice(deviceAddress);
            }
            catch (error) {
                console.error('Error during cleanup:', error);
            }
            this.currentPairingDevice = undefined;
            return 'Pairing process stopped and cleaned up.';
        }
        else {
            return 'No active pairing process to stop.';
        }
    }
    async triggerXiaomiHrMeasure(deviceAddress) {
        const targetDevice = deviceAddress || this.currentPairingDevice;
        if (!targetDevice) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'No target device address provided and no current pairing device set');
        }
        const device = this.connectedDevices.get(targetDevice);
        if (!device) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.', targetDevice);
        }
        if (!device.isReady()) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'Device not ready for measurement', targetDevice);
        }
        try {
            const triggered = await device.triggerHeartRateMeasurement();
            if (triggered) {
                return 'HR measurement trigger sent successfully.';
            }
            else {
                return 'HR measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.WRITE_FAILED, `Failed to trigger Xiaomi HR measurement: ${errorMessage}`, targetDevice, error);
        }
    }
    async triggerXiaomiStepsMeasure(deviceAddress) {
        const targetDevice = deviceAddress || this.currentPairingDevice;
        if (!targetDevice) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'No target device address provided and no current pairing device set');
        }
        const device = this.connectedDevices.get(targetDevice);
        if (!device) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.', targetDevice);
        }
        try {
            const triggered = await device.triggerStepsMeasurement();
            if (triggered) {
                return 'Steps measurement trigger sent successfully.';
            }
            else {
                return 'Steps measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.WRITE_FAILED, `Failed to trigger Xiaomi steps measurement: ${errorMessage}`, targetDevice, error);
        }
    }
    async triggerXiaomiCaloriesMeasure(deviceAddress) {
        const targetDevice = deviceAddress || this.currentPairingDevice;
        if (!targetDevice) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'No target device address provided and no current pairing device set');
        }
        const device = this.connectedDevices.get(targetDevice);
        if (!device) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.', targetDevice);
        }
        try {
            const triggered = await device.triggerCaloriesMeasurement();
            if (triggered) {
                return 'Calories measurement trigger sent successfully.';
            }
            else {
                return 'Calories measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.WRITE_FAILED, `Failed to trigger Xiaomi calories measurement: ${errorMessage}`, targetDevice, error);
        }
    }
    async triggerXiaomiStandingHoursMeasure(deviceAddress) {
        const targetDevice = deviceAddress || this.currentPairingDevice;
        if (!targetDevice) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'No target device address provided and no current pairing device set');
        }
        const device = this.connectedDevices.get(targetDevice);
        if (!device) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, 'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.', targetDevice);
        }
        try {
            const triggered = await device.triggerStandingHoursMeasurement();
            if (triggered) {
                return 'Standing hours measurement trigger sent successfully.';
            }
            else {
                return 'Standing hours measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.WRITE_FAILED, `Failed to trigger Xiaomi standing hours measurement: ${errorMessage}`, targetDevice, error);
        }
    }
    async scanForDevices(timeoutMs = 15000, includeBonded = true) {
        try {
            await this.bleManager.waitUntilReady();
            return await this.bleManager.startScan(timeoutMs, includeBonded);
        }
        catch (error) {
            console.error('Device scan failed:', error);
            throw error;
        }
    }
    stopScan() {
        this.bleManager.stopScan();
    }
    addListener(eventName, listener) {
        if (this.eventEmitter) {
            const subscription = this.eventEmitter.addListener(eventName, listener);
            return () => subscription.remove();
        }
        else {
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            this.eventListeners.get(eventName).push(listener);
            return () => {
                const listeners = this.eventListeners.get(eventName);
                if (listeners) {
                    const index = listeners.indexOf(listener);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            };
        }
    }
    removeAllListeners(eventName) {
        if (this.eventEmitter) {
            if (eventName !== undefined) {
                this.eventEmitter.removeAllListeners(eventName);
            }
            else {
                Object.keys(this.eventListeners).forEach(event => this.eventEmitter.removeAllListeners(event));
            }
        }
        else {
            if (eventName) {
                this.eventListeners.delete(eventName);
            }
            else {
                this.eventListeners.clear();
            }
        }
    }
    emitEvent(eventName, data) {
        if (this.eventEmitter) {
            console.info(`Would emit native event: ${eventName}`, data);
        }
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }
    handleConnectionStateChange(connected, deviceAddress) {
        this.emitEvent('GattConnectionState', {
            status: connected ? 'connected' : 'disconnected',
            deviceAddress
        });
    }
    handleError(error, deviceAddress) {
        this.emitEvent('PairingError', {
            error: error.message,
            deviceAddress
        });
    }
    handleHeartRate(heartRate, deviceAddress) {
        this.emitEvent('HeartRateUpdate', { heartRate, deviceAddress });
        this.emitEvent('onXiaomiHeartRateData', { heartRate });
    }
    handleSteps(steps, deviceAddress) {
        this.emitEvent('onXiaomiStepsData', { steps });
    }
    handleCalories(calories, deviceAddress) {
        this.emitEvent('onXiaomiCaloriesData', { calories });
    }
    getConnectedDevices() {
        return Array.from(this.connectedDevices.keys());
    }
    isDeviceConnected(deviceAddress) {
        const device = this.connectedDevices.get(deviceAddress);
        return device ? device.isConnected() : false;
    }
    async disconnectDevice(deviceAddress) {
        const device = this.connectedDevices.get(deviceAddress);
        if (device) {
            await device.disconnect();
            this.connectedDevices.delete(deviceAddress);
        }
        await this.bleManager.disconnectDevice(deviceAddress);
    }
    async getBatteryLevel(deviceAddress) {
        const targetDevice = deviceAddress || this.currentPairingDevice;
        if (!targetDevice) {
            return null;
        }
        const device = this.connectedDevices.get(targetDevice);
        if (!device) {
            return null;
        }
        return await device.getBatteryLevel();
    }
    async destroy() {
        const disconnectPromises = Array.from(this.connectedDevices.values())
            .map(device => device.disconnect());
        await Promise.all(disconnectPromises);
        this.connectedDevices.clear();
        this.eventListeners.clear();
        await this.bleManager.destroy();
        this.currentPairingDevice = undefined;
    }
}
exports.MiBandModule = MiBandModule;
exports.MiBand = MiBandModule.getInstance();
