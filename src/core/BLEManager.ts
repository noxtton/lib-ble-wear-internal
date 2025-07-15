import { BleManager, Device, } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { DeviceCandidate, DeviceType, DeviceEventCallbacks, PairingOptions } from '../types/DeviceTypes';
import { MiBandDevice } from '../devices/xiaomi/MiBandDevice';
import { DeviceConnection } from './DeviceConnection';

export class BLEManager {
  private bleManager: BleManager;
  private connectedDevices: Map<string, DeviceConnection> = new Map();
  private scanningDevices: Map<string, DeviceCandidate> = new Map();
  private callbacks: DeviceEventCallbacks = {};
  private isScanning = false;

  constructor(callbacks?: DeviceEventCallbacks) {
    this.bleManager = new BleManager();
    this.callbacks = callbacks || {};
    this.initializeBLE();
  }

  private async initializeBLE(): Promise<void> {
    try {
      const state = await this.bleManager.state();
      if (state !== 'PoweredOn') {
        throw new Error(`Bluetooth not available. State: ${state}`);
      }
    } catch (error) {
      this.callbacks.onError?.(error as Error);
    }
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return true;
      } else if (Platform.OS === 'ios') {
        return true;
      }
      return false;
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  public async startScan(timeoutMs: number = 10000): Promise<DeviceCandidate[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    this.scanningDevices.clear();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopScan();
        resolve(Array.from(this.scanningDevices.values()));
      }, timeoutMs);

      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearTimeout(timeout);
          this.isScanning = false;
          reject(error);
          return;
        }

        if (device && device.name) {
          const deviceType = this.identifyDeviceType(device);
          if (deviceType !== DeviceType.UNKNOWN) {
            const candidate: DeviceCandidate = {
              id: device.id,
              name: device.name,
              address: device.id, 
              rssi: device.rssi || undefined,
              isConnected: false,
              deviceType
            };
            this.scanningDevices.set(device.id, candidate);
          }
        }
      });
    });
  }

  public stopScan(): void {
    if (this.isScanning) {
      this.bleManager.stopDeviceScan();
      this.isScanning = false;
    }
  }

  private identifyDeviceType(device: Device): DeviceType {
    const name = device.name?.toLowerCase() || '';
    
    if (name.includes('mi band')) {
      if (name.includes('7')) return DeviceType.MI_BAND_7;
      if (name.includes('6')) return DeviceType.MI_BAND_6;
      if (name.includes('5')) return DeviceType.MI_BAND_5;
      if (name.includes('4')) return DeviceType.MI_BAND_4;
      if (name.includes('3')) return DeviceType.MI_BAND_3;
      if (name.includes('2')) return DeviceType.MI_BAND_2;
      return DeviceType.MI_BAND;
    }

    return DeviceType.UNKNOWN;
  }

  public async pairDevice(
    deviceAddress: string, 
    options: PairingOptions = {}
  ): Promise<DeviceConnection> {
    try {
      const existingConnection = this.connectedDevices.get(deviceAddress);
      if (existingConnection?.isConnected()) {
        return existingConnection;
      }

      const device = await this.bleManager.connectToDevice(deviceAddress);
      await device.discoverAllServicesAndCharacteristics();

      const candidateDevice = this.scanningDevices.get(deviceAddress);
      const deviceType = candidateDevice?.deviceType || DeviceType.UNKNOWN;

      let deviceConnection: DeviceConnection;

      switch (deviceType) {
        case DeviceType.MI_BAND:
        case DeviceType.MI_BAND_2:
        case DeviceType.MI_BAND_3:
        case DeviceType.MI_BAND_4:
        case DeviceType.MI_BAND_5:
        case DeviceType.MI_BAND_6:
        case DeviceType.MI_BAND_7:
          deviceConnection = new MiBandDevice(device, this.callbacks, options.authToken);
          break;
        default:
          throw new Error(`Unsupported device type: ${deviceType}`);
      }

      await deviceConnection.initialize();
      this.connectedDevices.set(deviceAddress, deviceConnection);

      this.callbacks.onConnectionStateChange?.(true, deviceAddress);
      return deviceConnection;

    } catch (error) {
      this.callbacks.onError?.(error as Error, deviceAddress);
      throw error;
    }
  }

  public async disconnectDevice(deviceAddress: string): Promise<void> {
    const connection = this.connectedDevices.get(deviceAddress);
    if (connection) {
      await connection.disconnect();
      this.connectedDevices.delete(deviceAddress);
      this.callbacks.onConnectionStateChange?.(false, deviceAddress);
    }
  }

  public getConnectedDevice(deviceAddress: string): DeviceConnection | undefined {
    return this.connectedDevices.get(deviceAddress);
  }

  public getConnectedDevices(): DeviceConnection[] {
    return Array.from(this.connectedDevices.values());
  }

  public async destroy(): Promise<void> {
    this.stopScan();
    
    const disconnectPromises = Array.from(this.connectedDevices.values())
      .map(connection => connection.disconnect());
    
    await Promise.all(disconnectPromises);
    this.connectedDevices.clear();
    
    await this.bleManager.destroy();
  }
}