import { Device, Characteristic } from 'react-native-ble-plx';
import { DeviceConnection } from '../../core/DeviceConnection';
import { DeviceEventCallbacks } from '../../types/DeviceTypes';
import { MiBandProtocol } from './MiBandProtocol';
import { MiBandConstants } from './MiBandConstants';


export class MiBandDevice extends DeviceConnection {
  private protocol: MiBandProtocol;
  private characteristics: Map<string, Characteristic> = new Map();
  private isAuthenticated = false;

  constructor(device: Device, callbacks: DeviceEventCallbacks, authToken?: string) {
    super(device, callbacks, authToken);
    this.protocol = new MiBandProtocol(authToken);
  }

  async initialize(): Promise<void> {
    try {
      await this.discoverCharacteristics();
      
      await this.setupNotifications();
      
      if (this.authToken) {
        await this.authenticate();
      }
      
      this.isInitialized = true;
      this.connectionState = true;
      
    } catch (error) {
      this.callbacks.onError?.(error as Error, this.device.id);
      throw error;
    }
  }

  private async discoverCharacteristics(): Promise<void> {
    const services = await this.device.services();
    
    for (const service of services) {
      const characteristics = await service.characteristics();
      
      for (const char of characteristics) {
        switch (char.uuid.toLowerCase()) {
          case MiBandConstants.CHAR_AUTH:
          case MiBandConstants.CHAR_HEART_RATE_MEASURE:
          case MiBandConstants.CHAR_HEART_RATE_DATA:
          case MiBandConstants.CHAR_STEPS:
          case MiBandConstants.CHAR_ACTIVITY_DATA:
          case MiBandConstants.CHAR_NOTIFICATION:
            this.characteristics.set(char.uuid.toLowerCase(), char);
            break;
        }
      }
    }
  }

  private async setupNotifications(): Promise<void> {
    const heartRateChar = this.characteristics.get(MiBandConstants.CHAR_HEART_RATE_DATA);
    if (heartRateChar) {
      await heartRateChar.monitor((error, characteristic) => {
        if (error) {
          this.callbacks.onError?.(error, this.device.id);
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
          this.callbacks.onError?.(error, this.device.id);
          return;
        }
        
        if (characteristic?.value) {
          const data = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
          this.handleActivityData(data);
        }
      });
    }
  }

  private async authenticate(): Promise<void> {
    if (!this.authToken) {
      throw new Error('Auth token required for authentication');
    }

    const authChar = this.characteristics.get(MiBandConstants.CHAR_AUTH);
    if (!authChar) {
      throw new Error('Authentication characteristic not found');
    }

    try {
      const authRequest = this.protocol.createAuthRequest(this.authToken);
      const authRequestB64 = Buffer.from(authRequest).toString('base64');
      await authChar.writeWithoutResponse(authRequestB64);
      
   
      this.isAuthenticated = true;
      
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Authentication failed: ${error.message}`);
      } else {
        throw new Error('Authentication failed: Unknown error');
      }
    }
  }

  async triggerHeartRateMeasurement(): Promise<boolean> {
    try {
      const measureChar = this.characteristics.get(MiBandConstants.CHAR_HEART_RATE_MEASURE);
      if (!measureChar) {
        return false;
      }

      const command = this.protocol.createHeartRateMeasureCommand();
      const commandB64 = Buffer.from(command).toString('base64');
      await measureChar.writeWithoutResponse(commandB64);
      
      return true;
    } catch (error) {
      this.callbacks.onError?.(error as Error, this.device.id);
      return false;
    }
  }

  async triggerStepsMeasurement(): Promise<boolean> {
    try {
      return await this.triggerHeartRateMeasurement();
    } catch (error) {
      this.callbacks.onError?.(error as Error, this.device.id);
      return false;
    }
  }

  async triggerCaloriesMeasurement(): Promise<boolean> {
    try {
      return await this.triggerHeartRateMeasurement();
    } catch (error) {
      this.callbacks.onError?.(error as Error, this.device.id);
      return false;
    }
  }

  async triggerStandingHoursMeasurement(): Promise<boolean> {
    try {
      return await this.triggerHeartRateMeasurement();
    } catch (error) {
      this.callbacks.onError?.(error as Error, this.device.id);
      return false;
    }
  }

  private handleHeartRateData(data: Uint8Array): void {
    const heartRate = this.protocol.parseHeartRateData(data);
    if (heartRate > 0) {
      this.callbacks.onHeartRate?.(heartRate, this.device.id);
      this.emitHealthMetrics({ heartRate });
    }
  }

  private handleActivityData(data: Uint8Array): void {
    const activityData = this.protocol.parseActivityData(data);
    
    if (activityData.steps !== undefined) {
      this.callbacks.onSteps?.(activityData.steps, this.device.id);
    }
    
    if (activityData.calories !== undefined) {
      this.callbacks.onCalories?.(activityData.calories, this.device.id);
    }
    
    if (activityData.standingHours !== undefined) {
      this.callbacks.onStandingHours?.(activityData.standingHours, this.device.id);
    }
    
    this.emitHealthMetrics(activityData);
  }
}


