"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const DeviceTypes_1 = require("../types/DeviceTypes");
class ConnectionManager {
    constructor(device, stateManager, onReconnect) {
        this.device = device;
        this.stateManager = stateManager;
        this.onReconnect = onReconnect;
        this.isAutoReconnectEnabled = true;
    }
    startAutoReconnect() {
        if (this.reconnectInterval)
            return;
        this.reconnectInterval = setInterval(async () => {
            if (!this.isAutoReconnectEnabled)
                return;
            const isConnected = await this.device.isConnected();
            if (!isConnected && this.stateManager.canRetry()) {
                try {
                    await this.onReconnect();
                    this.stateManager.resetRetry();
                }
                catch (error) {
                    this.stateManager.incrementRetry();
                    console.error('Auto-reconnect failed:', error);
                }
            }
        }, 5000);
    }
    stopAutoReconnect() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = undefined;
        }
    }
    startHealthCheck() {
        if (this.healthCheckInterval)
            return;
        this.healthCheckInterval = setInterval(async () => {
            try {
                const isConnected = await this.device.isConnected();
                if (!isConnected) {
                    this.stateManager.setState(DeviceTypes_1.DeviceState.DISCONNECTED);
                }
            }
            catch (error) {
                console.error('Health check failed:', error);
            }
        }, 10000);
    }
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    }
    setAutoReconnect(enabled) {
        this.isAutoReconnectEnabled = enabled;
    }
    destroy() {
        this.stopAutoReconnect();
        this.stopHealthCheck();
    }
}
exports.ConnectionManager = ConnectionManager;
