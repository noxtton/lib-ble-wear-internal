import {  DeviceState} from '../types/DeviceTypes';

export class DeviceStateManager {
  private state: DeviceState = DeviceState.DISCONNECTED;
  private stateHistory: { state: DeviceState; timestamp: Date }[] = [];
  private callbacks: Set<(state: DeviceState) => void> = new Set();
  private retryCount = 0;
  private maxRetries = 3;

  constructor(private deviceId: string) {}

  setState(newState: DeviceState): void {
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
      } catch (error) {
        console.error('Error in state callback:', error);
      }
    });
  }

  getState(): DeviceState {
    return this.state;
  }

  isConnected(): boolean {
    return [
      DeviceState.CONNECTED,
      DeviceState.AUTHENTICATING,
      DeviceState.AUTHENTICATED,
      DeviceState.READY
    ].includes(this.state);
  }

  isReady(): boolean {
    return this.state === DeviceState.READY;
  }

  onStateChange(callback: (state: DeviceState) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  incrementRetry(): void {
    this.retryCount++;
  }

  resetRetry(): void {
    this.retryCount = 0;
  }

  getStateHistory(): { state: DeviceState; timestamp: Date }[] {
    return [...this.stateHistory];
  }
}

