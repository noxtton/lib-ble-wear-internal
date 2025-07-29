import { Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { DeviceCandidate, DeviceType, DeviceEventCallbacks, PairingOptions } from '../types/DeviceTypes';
import { BLEError, BLEErrorType } from '../utils/BLEError';
import { DeviceDiscovery } from '../utils/DeviceDiscovery';

export class BLEManager {
  private bleManager: BleManager;
  private connectedDevices: Map<string, any> = new Map();
  private scanningDevices: Map<string, DeviceCandidate> = new Map();
  private allScannedDevices: Map<string, Device> = new Map();
  private bondedDevices: Map<string, Device> = new Map();
  private probedDevices: Map<string, any> = new Map();
  private callbacks: DeviceEventCallbacks = {};
  private isScanning = false;
  private isInitialized = false;

  constructor(callbacks?: DeviceEventCallbacks) {
    this.bleManager = new BleManager();
    this.callbacks = callbacks || {};
    this.initializeBLE();
  }

  private async initializeBLE(): Promise<void> {
    try {      
      if (Platform.OS === 'android') {
        console.info('Android platform detected');
      }

      const state = await this.bleManager.state();
      
      if (state === 'PoweredOn') {
        this.isInitialized = true;
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new BLEError(
            BLEErrorType.TIMEOUT,
            'BLE initialization timeout - Bluetooth not powered on'
          ));
        }, 10000);

        const subscription = this.bleManager.onStateChange((newState) => {
          if (newState === 'PoweredOn') {
            clearTimeout(timeout);
            subscription.remove();
            resolve();
          } else if (newState === 'PoweredOff' || newState === 'Unauthorized') {
            clearTimeout(timeout);
            subscription.remove();
            reject(new BLEError(
              BLEErrorType.PERMISSIONS_DENIED,
              `Bluetooth not available. State: ${newState}`
            ));
          }
        }, true);
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('BLE initialization failed:', error);
      this.isInitialized = false;
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  public async getBondedDevices(): Promise<DeviceCandidate[]> {
    if (!this.isInitialized) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'BLE Manager not initialized. Please wait for initialization to complete.'
      );
    }

    const bondedDevices: DeviceCandidate[] = [];
    this.bondedDevices.clear();

    try {
      const knownDevices = await this.bleManager.devices([]);
      
      console.info(`Found ${knownDevices.length} known devices`);

      for (const device of knownDevices) {
        if (device.name || device.localName) {
          this.bondedDevices.set(device.id, device);
          
          const deviceType = this.identifyDeviceByName(device.name || device.localName || '');
          
          if (deviceType !== DeviceType.UNKNOWN) {
            bondedDevices.push({
              id: device.id,
              name: device.name || device.localName || 'Unknown Device',
              address: device.id,
              rssi: device.rssi === null ? undefined : device.rssi,
              isConnected: false,
              deviceType
            });
            
            console.info(`Found bonded compatible device: ${device.name} (${device.id})`);
          }
        }
      }

      await this.probeBondedDevices();

      return bondedDevices.sort((a, b) => (b.rssi || -100) - (a.rssi || -100));
    } catch (error) {
      console.error('Failed to get bonded devices:', error);
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        `Failed to get bonded devices: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error as Error
      );
    }
  }

  private async probeBondedDevices(): Promise<void> {
    const devicesWithoutNames = Array.from(this.bondedDevices.values())
      .filter(device => !device.name && !device.localName);

    console.info(`Probing ${devicesWithoutNames.length} bonded devices without names`);

    for (const device of devicesWithoutNames) {
      try {
        const probeResult = await this.probeDevice(device.id, true);
        if (probeResult && probeResult.isMiBand) {
          this.probedDevices.set(device.id, probeResult);
          console.info(`Bonded device ${device.id} identified as Mi Band`);
        }
      } catch (error) {
        console.debug(`Could not probe bonded device ${device.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  public async startScan(timeoutMs: number = 15000, includeBonded: boolean = true): Promise<DeviceCandidate[]> {
    if (!this.isInitialized) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'BLE Manager not initialized. Please wait for initialization to complete.'
      );
    }

    if (this.isScanning) {
      throw new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        'Scan already in progress'
      );
    }

    this.isScanning = true;
    this.scanningDevices.clear();
    this.allScannedDevices.clear();
    this.probedDevices.clear();

    let bondedDevices: DeviceCandidate[] = [];
    if (includeBonded) {
      try {
        bondedDevices = await this.getBondedDevices();
        console.info(`Found ${bondedDevices.length} bonded compatible devices`);
      } catch (error) {
        console.warn('Failed to get bonded devices, continuing with scan:', error);
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        this.stopScan();
        
        const scannedDevices = Array.from(this.allScannedDevices.values());
        console.info(`Scan completed: found ${scannedDevices.length} devices`);
        
        scannedDevices.forEach((device, index) => {
          console.info(`Device ${index + 1}:`, {
            id: device.id,
            name: device.name || device.localName || 'No Name',
            rssi: device.rssi === null ? undefined : device.rssi,
            serviceUUIDs: device.serviceUUIDs?.length || 0
          });
        });

        const unnamedDevices = scannedDevices.filter(device => 
          !device.name && !device.localName && (device.rssi || -100) > -70 
        );
        
        const devicesToProbe = unnamedDevices
          .sort((a, b) => (b.rssi || -100) - (a.rssi || -100))
          .slice(0, 3);
        
        for (const device of devicesToProbe) {
          try {
            const probeResult = await this.probeDevice(device.id);
            if (probeResult) {
              this.probedDevices.set(device.id, probeResult);
              console.info(`Probed ${device.id}:`, {
                name: probeResult.name,
                services: probeResult.services?.length || 0,
                isMiBand: probeResult.isMiBand
              });
            }
          } catch (error) {
            console.error(`Failed to probe ${device.id}:`, error instanceof Error ? error.message : String(error));
          }
        }
        
        const compatibleDevices = this.identifyCompatibleDevices();
        
        const allDevices = [...bondedDevices];
        
        for (const scannedDevice of compatibleDevices) {
          const existingDevice = allDevices.find(d => d.id === scannedDevice.id);
          if (!existingDevice) {
            allDevices.push(scannedDevice);
          } else {
            if (scannedDevice.rssi !== undefined) {
              existingDevice.rssi = scannedDevice.rssi;
            }
          }
        }
        
        resolve(allDevices.sort((a, b) => (b.rssi || -100) - (a.rssi || -100)));
      }, timeoutMs);

      this.bleManager.startDeviceScan(
        null,
        { allowDuplicates: false }, 
        (error, device) => {
          if (error) {
            clearTimeout(timeout);
            this.isScanning = false;
            reject(new BLEError(
              BLEErrorType.CONNECTION_FAILED,
              `Scan failed: ${error.message}`,
              undefined,
              error
            ));
            return;
          }

          if (device) {
            this.allScannedDevices.set(device.id, device);
            
            const deviceName = device.name || device.localName;
            if (deviceName) {
              console.info(`Named device found: ${deviceName} (${device.id}) RSSI: ${device.rssi}`);
            }
          }
        }
      );
    });
  }

  private async probeDevice(deviceId: string, isBonded: boolean = false): Promise<any> {
    try {      
      const device = await this.bleManager.connectToDevice(deviceId, { timeout: isBonded ? 10000 : 5000 });
      
      const services = await device.services();
      
      let deviceName = device.name || device.localName;
      
      const genericAccessService = services.find(s => 
        s.uuid.toLowerCase() === '1800' || s.uuid.toLowerCase() === '00001800-0000-1000-8000-00805f9b34fb'
      );
      
      if (genericAccessService && !deviceName) {
        try {
          const characteristics = await genericAccessService.characteristics();
          const deviceNameChar = characteristics.find(c => 
            c.uuid.toLowerCase() === '2a00' || c.uuid.toLowerCase() === '00002a00-0000-1000-8000-00805f9b34fb'
          );
          
          if (deviceNameChar && deviceNameChar.isReadable) {
            const nameValue = await deviceNameChar.read();
            if (nameValue.value) {
              deviceName = Buffer.from(nameValue.value, 'base64').toString('utf8');
            }
          }
        } catch (e) {
          console.debug('Could not read device name characteristic', e);
        }
      }
      
      const serviceUUIDs = services.map(s => s.uuid.toLowerCase());
      
      const isMiBand = serviceUUIDs.some(uuid => 
        uuid.includes('fee0') || uuid.includes('fee1') || 
        (deviceName && deviceName.toLowerCase().includes('mi'))
      );
      
      await device.cancelConnection();
      
      const result = {
        id: deviceId,
        name: deviceName,
        services: serviceUUIDs,
        isMiBand,
        probedAt: new Date(),
        wasBonded: isBonded
      };
      
      return result;
      
    } catch (error) {
      console.debug(`Probe failed for ${deviceId}:`, (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  private identifyCompatibleDevices(): DeviceCandidate[] {
    const compatibleDevices: DeviceCandidate[] = [];
    
    for (const device of this.allScannedDevices.values()) {
      const deviceName = device.name || device.localName;
      if (deviceName) {
        const deviceType = this.identifyDeviceByName(deviceName);
        if (deviceType !== DeviceType.UNKNOWN) {
          compatibleDevices.push({
            id: device.id,
            name: deviceName,
            address: device.id,
            rssi: device.rssi === null ? undefined : device.rssi,
            isConnected: false,
            deviceType
          });
        }
      }
    }
    
    for (const probedDevice of this.probedDevices.values()) {
      if (probedDevice.name) {
        const deviceType = this.identifyDeviceByName(probedDevice.name);
        if (deviceType !== DeviceType.UNKNOWN) {
          compatibleDevices.push({
            id: probedDevice.id,
            name: probedDevice.name,
            address: probedDevice.id,
            rssi: this.allScannedDevices.get(probedDevice.id)?.rssi ?? undefined,
            isConnected: false,
            deviceType
          });
        }
      } else if (probedDevice.isMiBand) {
        compatibleDevices.push({
          id: probedDevice.id,
          name: probedDevice.wasBonded ? 'Mi Band (Bonded)' : 'Mi Band (Unknown Model)',
          address: probedDevice.id,
          rssi: this.allScannedDevices.get(probedDevice.id)?.rssi ?? undefined,
          isConnected: false,
          deviceType: DeviceType.MI_BAND_8 
        });
      }
    }
    
    return compatibleDevices.sort((a, b) => (b.rssi || -100) - (a.rssi || -100));
  }

  private identifyDeviceByName(deviceName: string): DeviceType {
    return DeviceDiscovery.identifyDevice({ name: deviceName });
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      console.error('Request permissions failed:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async waitUntilReady(timeout = 10000): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new BLEError(BLEErrorType.TIMEOUT, 'BLE initialization timeout'));
      }, timeout);

      const intervalId = setInterval(() => {
        if (this.isInitialized) {
          clearTimeout(timeoutId);
          clearInterval(intervalId);
          resolve();
        }
      }, 100);
    });
  }

  public stopScan(): void {
    if (this.isScanning) {
      this.bleManager.stopDeviceScan();
      this.isScanning = false;
    }
  }

  public async pairDevice(
    deviceAddress: string, 
    options: PairingOptions = {}
  ): Promise<any> {
    try {
      const existingConnection = this.connectedDevices.get(deviceAddress);
      if (existingConnection) {
        return existingConnection;
      }

      const device = await this.bleManager.connectToDevice(deviceAddress, {
        timeout: options.timeout || 10000
      });
      
      await device.discoverAllServicesAndCharacteristics();

      const deviceConnection = {
        device,
        isConnected: () => true,
        getDeviceAddress: () => device.id,
        getDeviceName: () => device.name || 'Unknown Device',
        disconnect: async () => {
          await device.cancelConnection();
        },
        getServices: async () => {
          const services = await device.services();
          return services.map(s => ({
            uuid: s.uuid,
            characteristics: []
          }));
        }
      };

      this.connectedDevices.set(deviceAddress, deviceConnection);
      this.callbacks.onConnectionStateChange?.(true, deviceAddress);
      
      return deviceConnection;

    } catch (error) {
      console.error('Connection failed:', error);
      const bleError = error instanceof BLEError ? error : new BLEError(
        BLEErrorType.CONNECTION_FAILED,
        `Device pairing failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)}`,
        deviceAddress,
        error as Error
      );
      
      this.callbacks.onError?.(bleError, deviceAddress);
      throw bleError;
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

  public getConnectedDevice(deviceAddress: string): any {
    return this.connectedDevices.get(deviceAddress);
  }

  public getConnectedDevices(): any[] {
    return Array.from(this.connectedDevices.values());
  }

  public getAllScannedDevices(): Device[] {
    return Array.from(this.allScannedDevices.values());
  }

  public getBondedDevicesMap(): Device[] {
    return Array.from(this.bondedDevices.values());
  }

  public getProbedDevices(): any[] {
    return Array.from(this.probedDevices.values());
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