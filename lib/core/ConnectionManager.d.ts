import { DeviceStateManager } from '../core/DeviceStateManager';
export declare class ConnectionManager {
    private device;
    private stateManager;
    private onReconnect;
    private reconnectInterval?;
    private healthCheckInterval?;
    private isAutoReconnectEnabled;
    constructor(device: any, stateManager: DeviceStateManager, onReconnect: () => Promise<void>);
    startAutoReconnect(): void;
    stopAutoReconnect(): void;
    startHealthCheck(): void;
    stopHealthCheck(): void;
    setAutoReconnect(enabled: boolean): void;
    destroy(): void;
}
