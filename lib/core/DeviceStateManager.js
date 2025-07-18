"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceStateManager = void 0;
const DeviceTypes_1 = require("../types/DeviceTypes");
class DeviceStateManager {
    constructor(deviceId) {
        this.deviceId = deviceId;
        this.state = DeviceTypes_1.DeviceState.DISCONNECTED;
        this.stateHistory = [];
        this.callbacks = new Set();
        this.retryCount = 0;
        this.maxRetries = 3;
    }
    setState(newState) {
        const previousState = this.state;
        this.state = newState;
        this.stateHistory.push({
            state: newState,
            timestamp: new Date()
        });
        if (this.stateHistory.length > 20) {
            this.stateHistory.shift();
        }
        this.callbacks.forEach(callback => {
            try {
                callback(newState);
            }
            catch (error) {
                console.error('Error in state callback:', error);
            }
        });
    }
    getState() {
        return this.state;
    }
    isConnected() {
        return [
            DeviceTypes_1.DeviceState.CONNECTED,
            DeviceTypes_1.DeviceState.AUTHENTICATING,
            DeviceTypes_1.DeviceState.AUTHENTICATED,
            DeviceTypes_1.DeviceState.READY
        ].includes(this.state);
    }
    isReady() {
        return this.state === DeviceTypes_1.DeviceState.READY;
    }
    onStateChange(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }
    canRetry() {
        return this.retryCount < this.maxRetries;
    }
    incrementRetry() {
        this.retryCount++;
    }
    resetRetry() {
        this.retryCount = 0;
    }
    getStateHistory() {
        return [...this.stateHistory];
    }
}
exports.DeviceStateManager = DeviceStateManager;
