import { DeviceState } from '../types/DeviceTypes';
export declare class DeviceStateManager {
    private deviceId;
    private state;
    private stateHistory;
    private callbacks;
    private retryCount;
    private maxRetries;
    constructor(deviceId: string);
    setState(newState: DeviceState): void;
    getState(): DeviceState;
    isConnected(): boolean;
    isReady(): boolean;
    onStateChange(callback: (state: DeviceState) => void): () => void;
    canRetry(): boolean;
    incrementRetry(): void;
    resetRetry(): void;
    getStateHistory(): {
        state: DeviceState;
        timestamp: Date;
    }[];
}
