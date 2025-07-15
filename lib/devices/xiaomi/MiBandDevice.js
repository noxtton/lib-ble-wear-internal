import { DeviceConnection } from '../../core/DeviceConnection';
import { MiBandProtocol } from './MiBandProtocol';
import { MiBandConstants } from './MiBandConstants';
export class MiBandDevice extends DeviceConnection {
    constructor(device, callbacks, authToken) {
        super(device, callbacks, authToken);
        this.characteristics = new Map();
        this.isAuthenticated = false;
        this.protocol = new MiBandProtocol(authToken);
    }
    async initialize() {
        var _a, _b;
        try {
            await this.discoverCharacteristics();
            await this.setupNotifications();
            if (this.authToken) {
                await this.authenticate();
            }
            this.isInitialized = true;
            this.connectionState = true;
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
            throw error;
        }
    }
    async discoverCharacteristics() {
        const services = await this.device.services();
        for (const service of services) {
            const characteristics = await service.characteristics();
            for (const char of characteristics) {
                switch (char.uuid.toLowerCase()) {
                    case MiBandConstants.CHAR_AUTH:
                    case MiBandConstants.CHAR_HEART_RATE_MEASURE:
                    case MiBandConstants.CHAR_HEART_RATE_DATA:
                    case MiBandConstants.CHAR_STEPS:
                    case MiBandConstants.CHAR_ACTIVITY_DATA:
                    case MiBandConstants.CHAR_NOTIFICATION:
                        this.characteristics.set(char.uuid.toLowerCase(), char);
                        break;
                }
            }
        }
    }
    async setupNotifications() {
        const heartRateChar = this.characteristics.get(MiBandConstants.CHAR_HEART_RATE_DATA);
        if (heartRateChar) {
            await heartRateChar.monitor((error, characteristic) => {
                var _a, _b;
                if (error) {
                    (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
                    return;
                }
                if (characteristic === null || characteristic === void 0 ? void 0 : characteristic.value) {
                    const data = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
                    this.handleHeartRateData(data);
                }
            });
        }
        const activityChar = this.characteristics.get(MiBandConstants.CHAR_ACTIVITY_DATA);
        if (activityChar) {
            await activityChar.monitor((error, characteristic) => {
                var _a, _b;
                if (error) {
                    (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
                    return;
                }
                if (characteristic === null || characteristic === void 0 ? void 0 : characteristic.value) {
                    const data = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
                    this.handleActivityData(data);
                }
            });
        }
    }
    async authenticate() {
        if (!this.authToken) {
            throw new Error('Auth token required for authentication');
        }
        const authChar = this.characteristics.get(MiBandConstants.CHAR_AUTH);
        if (!authChar) {
            throw new Error('Authentication characteristic not found');
        }
        try {
            const authRequest = this.protocol.createAuthRequest(this.authToken);
            const authRequestB64 = Buffer.from(authRequest).toString('base64');
            await authChar.writeWithoutResponse(authRequestB64);
            this.isAuthenticated = true;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Authentication failed: ${error.message}`);
            }
            else {
                throw new Error('Authentication failed: Unknown error');
            }
        }
    }
    async triggerHeartRateMeasurement() {
        var _a, _b;
        try {
            const measureChar = this.characteristics.get(MiBandConstants.CHAR_HEART_RATE_MEASURE);
            if (!measureChar) {
                return false;
            }
            const command = this.protocol.createHeartRateMeasureCommand();
            const commandB64 = Buffer.from(command).toString('base64');
            await measureChar.writeWithoutResponse(commandB64);
            return true;
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
            return false;
        }
    }
    async triggerStepsMeasurement() {
        var _a, _b;
        try {
            return await this.triggerHeartRateMeasurement();
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
            return false;
        }
    }
    async triggerCaloriesMeasurement() {
        var _a, _b;
        try {
            return await this.triggerHeartRateMeasurement();
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
            return false;
        }
    }
    async triggerStandingHoursMeasurement() {
        var _a, _b;
        try {
            return await this.triggerHeartRateMeasurement();
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
            return false;
        }
    }
    handleHeartRateData(data) {
        var _a, _b;
        const heartRate = this.protocol.parseHeartRateData(data);
        if (heartRate > 0) {
            (_b = (_a = this.callbacks).onHeartRate) === null || _b === void 0 ? void 0 : _b.call(_a, heartRate, this.device.id);
            this.emitHealthMetrics({ heartRate });
        }
    }
    handleActivityData(data) {
        var _a, _b, _c, _d, _e, _f;
        const activityData = this.protocol.parseActivityData(data);
        if (activityData.steps !== undefined) {
            (_b = (_a = this.callbacks).onSteps) === null || _b === void 0 ? void 0 : _b.call(_a, activityData.steps, this.device.id);
        }
        if (activityData.calories !== undefined) {
            (_d = (_c = this.callbacks).onCalories) === null || _d === void 0 ? void 0 : _d.call(_c, activityData.calories, this.device.id);
        }
        if (activityData.standingHours !== undefined) {
            (_f = (_e = this.callbacks).onStandingHours) === null || _f === void 0 ? void 0 : _f.call(_e, activityData.standingHours, this.device.id);
        }
        this.emitHealthMetrics(activityData);
    }
}
