import { Device } from 'react-native-ble-plx';
import { DeviceEventCallbacks, HealthMetrics } from '../types/DeviceTypes';

export abstract class DeviceConnection {
  protected device: Device;
  protected callbacks: DeviceEventCallbacks;
  protected authToken?: string;
  protected isInitialized = false;
  protected connectionState = false;

  constructor(device: Device, callbacks: DeviceEventCallbacks, authToken?: string) {
    this.device = device;
    this.callbacks = callbacks;
    this.authToken = authToken;
  }

  abstract initialize(): Promise<void>;
  abstract triggerHeartRateMeasurement(): Promise<boolean>;
  abstract triggerStepsMeasurement(): Promise<boolean>;
  abstract triggerCaloriesMeasurement(): Promise<boolean>;
  abstract triggerStandingHoursMeasurement(): Promise<boolean>;

  public isConnected(): boolean {
    return this.connectionState;
  }

  public getDeviceAddress(): string {
    return this.device.id;
  }

  public getDeviceName(): string {
    return this.device.name || 'Unknown Device';
  }

  public async disconnect(): Promise<void> {
    try {
      if (await this.device.isConnected()) {
        await this.device.cancelConnection();
      }
      this.connectionState = false;
    } catch (error) {
      this.callbacks.onError?.(error as Error, this.device.id);
    }
  }

  protected emitHealthMetrics(metrics: Partial<HealthMetrics>): void {
    const fullMetrics: HealthMetrics = {
      timestamp: new Date(),
      deviceAddress: this.device.id,
      ...metrics
    };
    this.callbacks.onHealthMetrics?.(fullMetrics);
  }
}
