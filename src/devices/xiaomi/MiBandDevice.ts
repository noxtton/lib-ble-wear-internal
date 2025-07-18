import { Device, Characteristic } from 'react-native-ble-plx';
import { DeviceConnection } from '../../core/DeviceConnection';
import { DeviceEventCallbacks, DeviceState } from '../../types/DeviceTypes';
import { MiBandProtocol } from './MiBandProtocol';
import { MiBandConstants } from './MiBandConstants';
import { MiBandAuthentication } from './MiBandAuthentication';
import { MiBandDataParser, } from './MiBandDataParser';
import { DeviceStateManager } from '../../core/DeviceStateManager';
import { ConnectionManager } from '../../core/ConnectionManager';
import { BLEError, BLEErrorType } from '../../utils/BLEError';

export class MiBandDevice extends DeviceConnection {
  private protocol: MiBandProtocol;
  private authentication!: MiBandAuthentication;
  private characteristics: Map<string, Characteristic> = new Map();
  private stateManager: DeviceStateManager;
  private connectionManager: ConnectionManager;
  private isAuthenticated = false;

  constructor(device: Device, callbacks: DeviceEventCallbacks, authToken?: string) {
    super(device, callbacks, authToken);
    this.protocol = new MiBandProtocol(authToken);
    this.stateManager = new DeviceStateManager(device.id);
    
    if (authToken) {
      this.authentication = new MiBandAuthentication(authToken);
    }

    this.connectionManager = new ConnectionManager(
      device,
      this.stateManager,
      () => this.reconnect()
    );

    this.stateManager.onStateChange((state) => {
      this.connectionState = this.stateManager.isConnected();
      this.isInitialized = this.stateManager.isReady();
    });
  }

  async initialize(): Promise<void> {
    try {
      this.stateManager.setState(DeviceState.CONNECTING);
      
      await this.discoverCharacteristics();
      this.stateManager.setState(DeviceState.CONNECTED);
      
      await this.setupNotifications();
      
      if (this.authToken && this.authentication) {
        this.stateManager.setState(DeviceState.AUTHENTICATING);
        await this.authenticate();
        this.stateManager.setState(DeviceState.AUTHENTICATED);
      }
      
      this.stateManager.setState(DeviceState.READY);
      this.connectionState = true;
      this.isInitialized = true;
      
      this.connectionManager.startAutoReconnect();
      this.connectionManager.startHealthCheck();
      
    } catch (error) {
      this.stateManager.setState(DeviceState.ERROR);
      const bleError = new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        `Device initialization failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error)}`,
        this.device.id,
        error as Error
      );
      this.callbacks.onError?.(bleError, this.device.id);
      throw bleError;
    }
  }

  private async discoverCharacteristics(): Promise<void> {
    try {
      const services = await this.device.services();
      
      for (const service of services) {
        const characteristics = await service.characteristics();
        
        for (const char of characteristics) {
          const uuid = char.uuid.toLowerCase();
          switch (uuid) {
            case MiBandConstants.CHAR_AUTH:
            case MiBandConstants.CHAR_HEART_RATE_MEASURE:
            case MiBandConstants.CHAR_HEART_RATE_DATA:
            case MiBandConstants.CHAR_STEPS:
            case MiBandConstants.CHAR_ACTIVITY_DATA:
            case MiBandConstants.CHAR_NOTIFICATION:
            case MiBandConstants.CHAR_BATTERY:
              this.characteristics.set(uuid, char);
              break;
          }
        }
      }

      const requiredChars = [MiBandConstants.CHAR_HEART_RATE_DATA, MiBandConstants.CHAR_ACTIVITY_DATA];
      for (const requiredChar of requiredChars) {
        if (!this.characteristics.has(requiredChar)) {
          throw new BLEError(
            BLEErrorType.CHARACTERISTIC_NOT_FOUND,
            `Required characteristic ${requiredChar} not found`,
            this.device.id
          );
        }
      }
      
    } catch (error) {
      throw new BLEError(
        BLEErrorType.CHARACTERISTIC_NOT_FOUND,
        `Characteristic discovery failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error)}`,
        this.device.id,
        error as Error
      );
    }
  }

  private async setupNotifications(): Promise<void> {
    try {
      const heartRateChar = this.characteristics.get(MiBandConstants.CHAR_HEART_RATE_DATA);
      if (heartRateChar) {
        await heartRateChar.monitor((error, characteristic) => {
          if (error) {
            const bleError = new BLEError(
              BLEErrorType.NOTIFICATION_FAILED,
              `Heart rate notification failed: ${error.message}`,
              this.device.id,
              error
            );
            this.callbacks.onError?.(bleError, this.device.id);
            return;
          }
          
          if (characteristic?.value) {
            const data = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
            this.handleHeartRateData(data);
          }
        });
      }

      const activityChar = this.characteristics.get(MiBandConstants.CHAR_ACTIVITY_DATA);
      if (activityChar) {
        await activityChar.monitor((error, characteristic) => {
          if (error) {
            const bleError = new BLEError(
              BLEErrorType.NOTIFICATION_FAILED,
              `Activity notification failed: ${error.message}`,
              this.device.id,
              error
            );
            this.callbacks.onError?.(bleError, this.device.id);
            return;
          }
          
          if (characteristic?.value) {
            const data = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
            this.handleActivityData(data);
          }
        });
      }

    } catch (error) {
      throw new BLEError(
        BLEErrorType.NOTIFICATION_FAILED,
        `Notification setup failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error)}`,
        this.device.id,
        error as Error
      );
    }
  }

  private async authenticate(): Promise<void> {
    if (!this.authToken || !this.authentication) {
      throw new BLEError(
        BLEErrorType.AUTHENTICATION_FAILED,
        'Auth token required for authentication',
        this.device.id
      );
    }

    const authChar = this.characteristics.get(MiBandConstants.CHAR_AUTH);
    if (!authChar) {
      throw new BLEError(
        BLEErrorType.CHARACTERISTIC_NOT_FOUND,
        'Authentication characteristic not found',
        this.device.id
      );
    }

    try {
      const authRequest = this.authentication.createInitialAuthRequest();
      await this.writeCharacteristic(authChar, authRequest);
      

      const randomRequest = this.authentication.createRandomAuthRequest();
      await this.writeCharacteristic(authChar, randomRequest);
      
   
      this.isAuthenticated = true;
      
    } catch (error) {
      throw new BLEError(
        BLEErrorType.AUTHENTICATION_FAILED,
        `Authentication failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error)}`,
        this.device.id,
        error as Error
      );
    }
  }

  private async writeCharacteristic(characteristic: Characteristic, data: Uint8Array): Promise<void> {
    try {
      const dataB64 = Buffer.from(data).toString('base64');
      await characteristic.writeWithoutResponse(dataB64);
    } catch (error) {
      throw new BLEError(
        BLEErrorType.WRITE_FAILED,
        `Write failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error)}`,
        this.device.id,
        error as Error
      );
    }
  }

  async triggerHeartRateMeasurement(): Promise<boolean> {
    if (!this.stateManager.isReady()) {
      console.warn('Device not ready for heart rate measurement');
      return false;
    }

    try {
      const measureChar = this.characteristics.get(MiBandConstants.CHAR_HEART_RATE_MEASURE);
      if (!measureChar) {
        return false;
      }

      const command = this.protocol.createHeartRateMeasureCommand();
      await this.writeCharacteristic(measureChar, command);
      
      return true;
    } catch (error) {
      const bleError = new BLEError(
        BLEErrorType.WRITE_FAILED,
        `Heart rate measurement failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error)}`,
        this.device.id,
        error as Error
      );
      this.callbacks.onError?.(bleError, this.device.id);
      return false;
    }
  }

  async triggerStepsMeasurement(): Promise<boolean> {
    return await this.triggerHeartRateMeasurement();
  }

  async triggerCaloriesMeasurement(): Promise<boolean> {
    return await this.triggerHeartRateMeasurement();
  }

  async triggerStandingHoursMeasurement(): Promise<boolean> {
    return await this.triggerHeartRateMeasurement();
  }

  async getBatteryLevel(): Promise<number | null> {
    try {
      const batteryChar = this.characteristics.get(MiBandConstants.CHAR_BATTERY);
      if (!batteryChar) {
        return null;
      }

      const value = await batteryChar.read();
      if (value.value) {
        const data = new Uint8Array(Buffer.from(value.value, 'base64'));
        return MiBandDataParser.parseBatteryLevel(data);
      }
      
      return null;
    } catch (error) {
      console.error('Battery level read failed:', error);
      return null;
    }
  }

  private handleHeartRateData(data: Uint8Array): void {
    const heartRateData = MiBandDataParser.parseHeartRateData(data);
    
    if (heartRateData && heartRateData.heartRate > 0) {
      this.callbacks.onHeartRate?.(heartRateData.heartRate, this.device.id);
      
      this.emitHealthMetrics({ 
        heartRate: heartRateData.heartRate,
        timestamp: heartRateData.timestamp 
      });
    }
  }

  private handleActivityData(data: Uint8Array): void {
    const activityData = MiBandDataParser.parseDetailedActivityData(data);
    
    if (activityData) {
      if (activityData.steps !== undefined) {
        this.callbacks.onSteps?.(activityData.steps, this.device.id);
      }
      
      if (activityData.calories !== undefined) {
        this.callbacks.onCalories?.(activityData.calories, this.device.id);
      }
      
      this.emitHealthMetrics({
        steps: activityData.steps,
        calories: activityData.calories,
        timestamp: activityData.timestamp
      });
    }
  }

  private async reconnect(): Promise<void> {
    try {
      await this.initialize();
    } catch (error) {
      console.error('Reconnection failed:', error);
      throw error;
    }
  }

  public getDeviceState(): DeviceState {
    return this.stateManager.getState();
  }

  public isReady(): boolean {
    return this.stateManager.isReady();
  }

  public async disconnect(): Promise<void> {
    this.connectionManager.destroy();
    await super.disconnect();
    this.stateManager.setState(DeviceState.DISCONNECTED);
  }
}