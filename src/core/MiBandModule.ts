import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { BLEManager } from './BLEManager';
import { MiBandDevice } from '../devices/xiaomi/MiBandDevice';
import { DeviceCandidate,  } from '../types/DeviceTypes';
import { BLEError, BLEErrorType } from '../utils/BLEError';


interface MiBandEvents {
  'PairingStarted': { deviceAddress: string };
  'PairingSuccess': { deviceAddress: string };
  'PairingError': { error: string; deviceAddress?: string };
  'GattConnectionState': { status: 'connected' | 'disconnected'; deviceAddress: string };
  'HeartRateUpdate': { heartRate: number; deviceAddress: string };
  'onXiaomiHeartRateData': { heartRate: number };
  'onXiaomiStepsData': { steps: number };
  'onXiaomiCaloriesData': { calories: number };
  'onXiaomiStandingHoursData': { standingHours: number };
}

export class MiBandModule {
  private static instance: MiBandModule;
  private bleManager: BLEManager;
  private eventEmitter?: NativeEventEmitter;
  private connectedDevices: Map<string, MiBandDevice> = new Map();
  private currentPairingDevice?: string;
  private eventListeners: Map<string, any[]> = new Map();

  private constructor() {
    this.bleManager = new BLEManager({
      onConnectionStateChange: this.handleConnectionStateChange.bind(this),
      onError: this.handleError.bind(this),
      onHeartRate: this.handleHeartRate.bind(this),
      onSteps: this.handleSteps.bind(this),
      onCalories: this.handleCalories.bind(this),
    });

    if (Platform.OS === 'android' && NativeModules.BluetoothPairingModule) {
      this.eventEmitter = new NativeEventEmitter(NativeModules.BluetoothPairingModule);
    }
  }

  public static getInstance(): MiBandModule {
    if (!MiBandModule.instance) {
      MiBandModule.instance = new MiBandModule();
    }
    return MiBandModule.instance;
  }

  public async getBondedDevices(): Promise<DeviceCandidate[]> {
    try {
      await this.bleManager.waitUntilReady();
      return await this.bleManager.getBondedDevices();
    } catch (error) {
      console.error('Failed to get bonded devices:', error);
      throw error;
    }
  }

  public async startPairing(deviceAddress: string, authToken?: string): Promise<string> {
    try {
      if (this.currentPairingDevice) {
        console.warn('Pairing process already in progress. Cleaning up existing one.');
        await this.stopPairing();
      }

      this.currentPairingDevice = deviceAddress;

      this.emitEvent('PairingStarted', { deviceAddress });

      await this.bleManager.waitUntilReady();
      
      const deviceConnection = await this.bleManager.pairDevice(deviceAddress, {
        authToken,
        timeout: 15000
      });

      const miBandDevice = new MiBandDevice(
        deviceConnection.device,
        {
          onConnectionStateChange: this.handleConnectionStateChange.bind(this),
          onError: this.handleError.bind(this),
          onHeartRate: this.handleHeartRate.bind(this),
          onSteps: this.handleSteps.bind(this),
          onCalories: this.handleCalories.bind(this),
        },
        authToken
      );

      await miBandDevice.initialize();

      this.connectedDevices.set(deviceAddress, miBandDevice);

      this.emitEvent('PairingSuccess', { deviceAddress });
      this.emitEvent('GattConnectionState', { status: 'connected', deviceAddress });

      return `Pairing process started for ${deviceAddress}`;
    } catch (error) {
      this.currentPairingDevice = undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent('PairingError', { error: errorMessage, deviceAddress });
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        `Failed to start pairing: ${errorMessage}`,
        deviceAddress,
        error as Error
      );
    }
  }

  public async stopPairing(): Promise<string> {
    if (this.currentPairingDevice) {
      const deviceAddress = this.currentPairingDevice;
      
      try {
        const device = this.connectedDevices.get(deviceAddress);
        if (device) {
          await device.disconnect();
          this.connectedDevices.delete(deviceAddress);
        }
        
        await this.bleManager.disconnectDevice(deviceAddress);
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
      
      this.currentPairingDevice = undefined;
      return 'Pairing process stopped and cleaned up.';
    } else {
      return 'No active pairing process to stop.';
    }
  }

  public async triggerXiaomiHrMeasure(deviceAddress?: string): Promise<string> {
    const targetDevice = deviceAddress || this.currentPairingDevice;
    
    if (!targetDevice) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'No target device address provided and no current pairing device set'
      );
    }

    const device = this.connectedDevices.get(targetDevice);
    if (!device) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.',
        targetDevice
      );
    }

    if (!device.isReady()) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'Device not ready for measurement',
        targetDevice
      );
    }

    try {
      const triggered = await device.triggerHeartRateMeasurement();
      if (triggered) {
        return 'HR measurement trigger sent successfully.';
      } else {
        return 'HR measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BLEError(
        BLEErrorType.WRITE_FAILED,
        `Failed to trigger Xiaomi HR measurement: ${errorMessage}`,
        targetDevice,
        error as Error
      );
    }
  }

  public async triggerXiaomiStepsMeasure(deviceAddress?: string): Promise<string> {
    const targetDevice = deviceAddress || this.currentPairingDevice;
    
    if (!targetDevice) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'No target device address provided and no current pairing device set'
      );
    }

    const device = this.connectedDevices.get(targetDevice);
    if (!device) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.',
        targetDevice
      );
    }

    try {
      const triggered = await device.triggerStepsMeasurement();
      if (triggered) {
        return 'Steps measurement trigger sent successfully.';
      } else {
        return 'Steps measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BLEError(
        BLEErrorType.WRITE_FAILED,
        `Failed to trigger Xiaomi steps measurement: ${errorMessage}`,
        targetDevice,
        error as Error
      );
    }
  }

  public async triggerXiaomiCaloriesMeasure(deviceAddress?: string): Promise<string> {
    const targetDevice = deviceAddress || this.currentPairingDevice;
    
    if (!targetDevice) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'No target device address provided and no current pairing device set'
      );
    }

    const device = this.connectedDevices.get(targetDevice);
    if (!device) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.',
        targetDevice
      );
    }

    try {
      const triggered = await device.triggerCaloriesMeasurement();
      if (triggered) {
        return 'Calories measurement trigger sent successfully.';
      } else {
        return 'Calories measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BLEError(
        BLEErrorType.WRITE_FAILED,
        `Failed to trigger Xiaomi calories measurement: ${errorMessage}`,
        targetDevice,
        error as Error
      );
    }
  }

  public async triggerXiaomiStandingHoursMeasure(deviceAddress?: string): Promise<string> {
    const targetDevice = deviceAddress || this.currentPairingDevice;
    
    if (!targetDevice) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'No target device address provided and no current pairing device set'
      );
    }

    const device = this.connectedDevices.get(targetDevice);
    if (!device) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'XiaomiSupport not found. Target device address might not be set or device not connected/type mismatch.',
        targetDevice
      );
    }

    try {
      const triggered = await device.triggerStandingHoursMeasurement();
      if (triggered) {
        return 'Standing hours measurement trigger sent successfully.';
      } else {
        return 'Standing hours measurement trigger sent, but service indicated no new measurement started (e.g., already in progress).';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BLEError(
        BLEErrorType.WRITE_FAILED,
        `Failed to trigger Xiaomi standing hours measurement: ${errorMessage}`,
        targetDevice,
        error as Error
      );
    }
  }

  public async scanForDevices(timeoutMs: number = 15000, includeBonded: boolean = true): Promise<DeviceCandidate[]> {
    try {
      await this.bleManager.waitUntilReady();
      return await this.bleManager.startScan(timeoutMs, includeBonded);
    } catch (error) {
      console.error('Device scan failed:', error);
      throw error;
    }
  }

  public stopScan(): void {
    this.bleManager.stopScan();
  }

  public addListener<K extends keyof MiBandEvents>(
    eventName: K,
    listener: (event: MiBandEvents[K]) => void
  ): () => void {
    if (this.eventEmitter) {
      const subscription = this.eventEmitter.addListener(eventName, listener);
      return () => subscription.remove();
    } else {
      if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, []);
      }
      this.eventListeners.get(eventName)!.push(listener);
      
      return () => {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      };
    }
  }

  public removeAllListeners<K extends keyof MiBandEvents>(eventName?: K): void {
    if (this.eventEmitter) {
      if (eventName !== undefined) {
        this.eventEmitter.removeAllListeners(eventName);
      } else {
        (Object.keys(this.eventListeners) as (keyof MiBandEvents)[]).forEach(event =>
          this.eventEmitter!.removeAllListeners(event as string)
        );
      }
    } else {
      if (eventName) {
        this.eventListeners.delete(eventName);
      } else {
        this.eventListeners.clear();
      }
    }
  }

  private emitEvent<K extends keyof MiBandEvents>(eventName: K, data: MiBandEvents[K]): void {
    if (this.eventEmitter) {
      console.info(`Would emit native event: ${eventName}`, data);
    }
    
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  private handleConnectionStateChange(connected: boolean, deviceAddress: string): void {
    this.emitEvent('GattConnectionState', {
      status: connected ? 'connected' : 'disconnected',
      deviceAddress
    });
  }

  private handleError(error: Error, deviceAddress?: string): void {
    this.emitEvent('PairingError', {
      error: error.message,
      deviceAddress
    });
  }

  private handleHeartRate(heartRate: number, deviceAddress: string): void {
    this.emitEvent('HeartRateUpdate', { heartRate, deviceAddress });
    this.emitEvent('onXiaomiHeartRateData', { heartRate });
  }

  private handleSteps(steps: number, deviceAddress: string): void {
    this.emitEvent('onXiaomiStepsData', { steps });
  }

  private handleCalories(calories: number, deviceAddress: string): void {
    this.emitEvent('onXiaomiCaloriesData', { calories });
  }

  public getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  public isDeviceConnected(deviceAddress: string): boolean {
    const device = this.connectedDevices.get(deviceAddress);
    return device ? device.isConnected() : false;
  }

  public async disconnectDevice(deviceAddress: string): Promise<void> {
    const device = this.connectedDevices.get(deviceAddress);
    if (device) {
      await device.disconnect();
      this.connectedDevices.delete(deviceAddress);
    }
    
    await this.bleManager.disconnectDevice(deviceAddress);
  }

  public async getBatteryLevel(deviceAddress?: string): Promise<number | null> {
    const targetDevice = deviceAddress || this.currentPairingDevice;
    
    if (!targetDevice) {
      return null;
    }

    const device = this.connectedDevices.get(targetDevice);
    if (!device) {
      return null;
    }

    return await device.getBatteryLevel();
  }

  public async destroy(): Promise<void> {
    const disconnectPromises = Array.from(this.connectedDevices.values())
      .map(device => device.disconnect());
    
    await Promise.all(disconnectPromises);
    this.connectedDevices.clear();
    
    this.eventListeners.clear();
    
    await this.bleManager.destroy();
    
    this.currentPairingDevice = undefined;
  }
}

export const MiBand = MiBandModule.getInstance();

export interface MiBandNativeModule {
  startPairing(deviceAddress: string, authToken?: string): Promise<string>;
  stopPairing(): Promise<string>;
  getBondedDevices(): Promise<DeviceCandidate[]>;
  triggerXiaomiHrMeasure(): Promise<string>;
  triggerXiaomiStepsMeasure(): Promise<string>;
  triggerXiaomiCaloriesMeasure(): Promise<string>;
  triggerXiaomiStandingHoursMeasure(): Promise<string>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}