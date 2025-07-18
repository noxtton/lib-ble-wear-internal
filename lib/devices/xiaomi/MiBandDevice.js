"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiBandDevice = void 0;
const DeviceConnection_1 = require("../../core/DeviceConnection");
const DeviceTypes_1 = require("../../types/DeviceTypes");
const MiBandProtocol_1 = require("./MiBandProtocol");
const MiBandConstants_1 = require("./MiBandConstants");
const MiBandAuthentication_1 = require("./MiBandAuthentication");
const MiBandDataParser_1 = require("./MiBandDataParser");
const DeviceStateManager_1 = require("../../core/DeviceStateManager");
const ConnectionManager_1 = require("../../core/ConnectionManager");
const BLEError_1 = require("../../utils/BLEError");
class MiBandDevice extends DeviceConnection_1.DeviceConnection {
    constructor(device, callbacks, authToken) {
        super(device, callbacks, authToken);
        this.characteristics = new Map();
        this.isAuthenticated = false;
        this.protocol = new MiBandProtocol_1.MiBandProtocol(authToken);
        this.stateManager = new DeviceStateManager_1.DeviceStateManager(device.id);
        if (authToken) {
            this.authentication = new MiBandAuthentication_1.MiBandAuthentication(authToken);
        }
        this.connectionManager = new ConnectionManager_1.ConnectionManager(device, this.stateManager, () => this.reconnect());
        this.stateManager.onStateChange((state) => {
            this.connectionState = this.stateManager.isConnected();
            this.isInitialized = this.stateManager.isReady();
        });
    }
    async initialize() {
        var _a, _b;
        try {
            this.stateManager.setState(DeviceTypes_1.DeviceState.CONNECTING);
            await this.discoverCharacteristics();
            this.stateManager.setState(DeviceTypes_1.DeviceState.CONNECTED);
            await this.setupNotifications();
            if (this.authToken && this.authentication) {
                this.stateManager.setState(DeviceTypes_1.DeviceState.AUTHENTICATING);
                await this.authenticate();
                this.stateManager.setState(DeviceTypes_1.DeviceState.AUTHENTICATED);
            }
            this.stateManager.setState(DeviceTypes_1.DeviceState.READY);
            this.connectionState = true;
            this.isInitialized = true;
            this.connectionManager.startAutoReconnect();
            this.connectionManager.startHealthCheck();
        }
        catch (error) {
            this.stateManager.setState(DeviceTypes_1.DeviceState.ERROR);
            const bleError = new BLEError_1.BLEError(BLEError_1.BLEErrorType.CONNECTION_FAILED, `Device initialization failed: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`, this.device.id, error);
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, bleError, this.device.id);
            throw bleError;
        }
    }
    async discoverCharacteristics() {
        try {
            const services = await this.device.services();
            for (const service of services) {
                const characteristics = await service.characteristics();
                for (const char of characteristics) {
                    const uuid = char.uuid.toLowerCase();
                    switch (uuid) {
                        case MiBandConstants_1.MiBandConstants.CHAR_AUTH:
                        case MiBandConstants_1.MiBandConstants.CHAR_HEART_RATE_MEASURE:
                        case MiBandConstants_1.MiBandConstants.CHAR_HEART_RATE_DATA:
                        case MiBandConstants_1.MiBandConstants.CHAR_STEPS:
                        case MiBandConstants_1.MiBandConstants.CHAR_ACTIVITY_DATA:
                        case MiBandConstants_1.MiBandConstants.CHAR_NOTIFICATION:
                        case MiBandConstants_1.MiBandConstants.CHAR_BATTERY:
                            this.characteristics.set(uuid, char);
                            break;
                    }
                }
            }
            const requiredChars = [MiBandConstants_1.MiBandConstants.CHAR_HEART_RATE_DATA, MiBandConstants_1.MiBandConstants.CHAR_ACTIVITY_DATA];
            for (const requiredChar of requiredChars) {
                if (!this.characteristics.has(requiredChar)) {
                    throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CHARACTERISTIC_NOT_FOUND, `Required characteristic ${requiredChar} not found`, this.device.id);
                }
            }
        }
        catch (error) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CHARACTERISTIC_NOT_FOUND, `Characteristic discovery failed: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`, this.device.id, error);
        }
    }
    async setupNotifications() {
        try {
            const heartRateChar = this.characteristics.get(MiBandConstants_1.MiBandConstants.CHAR_HEART_RATE_DATA);
            if (heartRateChar) {
                await heartRateChar.monitor((error, characteristic) => {
                    var _a, _b;
                    if (error) {
                        const bleError = new BLEError_1.BLEError(BLEError_1.BLEErrorType.NOTIFICATION_FAILED, `Heart rate notification failed: ${error.message}`, this.device.id, error);
                        (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, bleError, this.device.id);
                        return;
                    }
                    if (characteristic === null || characteristic === void 0 ? void 0 : characteristic.value) {
                        const data = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
                        this.handleHeartRateData(data);
                    }
                });
            }
            const activityChar = this.characteristics.get(MiBandConstants_1.MiBandConstants.CHAR_ACTIVITY_DATA);
            if (activityChar) {
                await activityChar.monitor((error, characteristic) => {
                    var _a, _b;
                    if (error) {
                        const bleError = new BLEError_1.BLEError(BLEError_1.BLEErrorType.NOTIFICATION_FAILED, `Activity notification failed: ${error.message}`, this.device.id, error);
                        (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, bleError, this.device.id);
                        return;
                    }
                    if (characteristic === null || characteristic === void 0 ? void 0 : characteristic.value) {
                        const data = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
                        this.handleActivityData(data);
                    }
                });
            }
        }
        catch (error) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.NOTIFICATION_FAILED, `Notification setup failed: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`, this.device.id, error);
        }
    }
    async authenticate() {
        if (!this.authToken || !this.authentication) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.AUTHENTICATION_FAILED, 'Auth token required for authentication', this.device.id);
        }
        const authChar = this.characteristics.get(MiBandConstants_1.MiBandConstants.CHAR_AUTH);
        if (!authChar) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.CHARACTERISTIC_NOT_FOUND, 'Authentication characteristic not found', this.device.id);
        }
        try {
            const authRequest = this.authentication.createInitialAuthRequest();
            await this.writeCharacteristic(authChar, authRequest);
            const randomRequest = this.authentication.createRandomAuthRequest();
            await this.writeCharacteristic(authChar, randomRequest);
            this.isAuthenticated = true;
        }
        catch (error) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.AUTHENTICATION_FAILED, `Authentication failed: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`, this.device.id, error);
        }
    }
    async writeCharacteristic(characteristic, data) {
        try {
            const dataB64 = Buffer.from(data).toString('base64');
            await characteristic.writeWithoutResponse(dataB64);
        }
        catch (error) {
            throw new BLEError_1.BLEError(BLEError_1.BLEErrorType.WRITE_FAILED, `Write failed: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`, this.device.id, error);
        }
    }
    async triggerHeartRateMeasurement() {
        var _a, _b;
        if (!this.stateManager.isReady()) {
            console.warn('Device not ready for heart rate measurement');
            return false;
        }
        try {
            const measureChar = this.characteristics.get(MiBandConstants_1.MiBandConstants.CHAR_HEART_RATE_MEASURE);
            if (!measureChar) {
                return false;
            }
            const command = this.protocol.createHeartRateMeasureCommand();
            await this.writeCharacteristic(measureChar, command);
            return true;
        }
        catch (error) {
            const bleError = new BLEError_1.BLEError(BLEError_1.BLEErrorType.WRITE_FAILED, `Heart rate measurement failed: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`, this.device.id, error);
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, bleError, this.device.id);
            return false;
        }
    }
    async triggerStepsMeasurement() {
        return await this.triggerHeartRateMeasurement();
    }
    async triggerCaloriesMeasurement() {
        return await this.triggerHeartRateMeasurement();
    }
    async triggerStandingHoursMeasurement() {
        return await this.triggerHeartRateMeasurement();
    }
    async getBatteryLevel() {
        try {
            const batteryChar = this.characteristics.get(MiBandConstants_1.MiBandConstants.CHAR_BATTERY);
            if (!batteryChar) {
                return null;
            }
            const value = await batteryChar.read();
            if (value.value) {
                const data = new Uint8Array(Buffer.from(value.value, 'base64'));
                return MiBandDataParser_1.MiBandDataParser.parseBatteryLevel(data);
            }
            return null;
        }
        catch (error) {
            console.error('Battery level read failed:', error);
            return null;
        }
    }
    handleHeartRateData(data) {
        var _a, _b;
        const heartRateData = MiBandDataParser_1.MiBandDataParser.parseHeartRateData(data);
        if (heartRateData && heartRateData.heartRate > 0) {
            (_b = (_a = this.callbacks).onHeartRate) === null || _b === void 0 ? void 0 : _b.call(_a, heartRateData.heartRate, this.device.id);
            this.emitHealthMetrics({
                heartRate: heartRateData.heartRate,
                timestamp: heartRateData.timestamp
            });
        }
    }
    handleActivityData(data) {
        var _a, _b, _c, _d;
        const activityData = MiBandDataParser_1.MiBandDataParser.parseDetailedActivityData(data);
        if (activityData) {
            if (activityData.steps !== undefined) {
                (_b = (_a = this.callbacks).onSteps) === null || _b === void 0 ? void 0 : _b.call(_a, activityData.steps, this.device.id);
            }
            if (activityData.calories !== undefined) {
                (_d = (_c = this.callbacks).onCalories) === null || _d === void 0 ? void 0 : _d.call(_c, activityData.calories, this.device.id);
            }
            this.emitHealthMetrics({
                steps: activityData.steps,
                calories: activityData.calories,
                timestamp: activityData.timestamp
            });
        }
    }
    async reconnect() {
        try {
            await this.initialize();
        }
        catch (error) {
            console.error('Reconnection failed:', error);
            throw error;
        }
    }
    getDeviceState() {
        return this.stateManager.getState();
    }
    isReady() {
        return this.stateManager.isReady();
    }
    async disconnect() {
        this.connectionManager.destroy();
        await super.disconnect();
        this.stateManager.setState(DeviceTypes_1.DeviceState.DISCONNECTED);
    }
}
exports.MiBandDevice = MiBandDevice;
