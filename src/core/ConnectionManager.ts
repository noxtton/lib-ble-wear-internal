import {  DeviceStateManager } from '../core/DeviceStateManager';
import { DeviceState } from '../types/DeviceTypes';

export class ConnectionManager {
  private reconnectInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private isAutoReconnectEnabled = true;

  constructor(
    private device: any,
    private stateManager: DeviceStateManager,
    private onReconnect: () => Promise<void>
  ) {}

  startAutoReconnect(): void {
    if (this.reconnectInterval) return;

    this.reconnectInterval = setInterval(async () => {
      if (!this.isAutoReconnectEnabled) return;
      
      const isConnected = await this.device.isConnected();
      if (!isConnected && this.stateManager.canRetry()) {
        try {
          await this.onReconnect();
          this.stateManager.resetRetry();
        } catch (error) {
          this.stateManager.incrementRetry();
          console.error('Auto-reconnect failed:', error);
        }
      }
    }, 5000); 
  }

  stopAutoReconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = undefined;
    }
  }

  startHealthCheck(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      try {
        const isConnected = await this.device.isConnected();
        if (!isConnected) {
          this.stateManager.setState(DeviceState.DISCONNECTED);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 10000); 
  }

  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  setAutoReconnect(enabled: boolean): void {
    this.isAutoReconnectEnabled = enabled;
  }

  destroy(): void {
    this.stopAutoReconnect();
    this.stopHealthCheck();
  }
}