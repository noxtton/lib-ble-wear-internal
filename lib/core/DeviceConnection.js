export class DeviceConnection {
    constructor(device, callbacks, authToken) {
        this.isInitialized = false;
        this.connectionState = false;
        this.device = device;
        this.callbacks = callbacks;
        this.authToken = authToken;
    }
    isConnected() {
        return this.connectionState;
    }
    getDeviceAddress() {
        return this.device.id;
    }
    getDeviceName() {
        return this.device.name || 'Unknown Device';
    }
    async disconnect() {
        var _a, _b;
        try {
            if (await this.device.isConnected()) {
                await this.device.cancelConnection();
            }
            this.connectionState = false;
        }
        catch (error) {
            (_b = (_a = this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, this.device.id);
        }
    }
    emitHealthMetrics(metrics) {
        var _a, _b;
        const fullMetrics = {
            timestamp: new Date(),
            deviceAddress: this.device.id,
            ...metrics
        };
        (_b = (_a = this.callbacks).onHealthMetrics) === null || _b === void 0 ? void 0 : _b.call(_a, fullMetrics);
    }
}
