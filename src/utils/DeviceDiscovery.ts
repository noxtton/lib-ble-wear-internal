import { DeviceCandidate, DeviceType } from '../types/DeviceTypes';

export interface DeviceSignature {
  namePatterns: string[];
  serviceUUIDs: string[];
  manufacturerData?: number[];
  minRSSI?: number;
}

export class DeviceDiscovery {
  private static readonly DEVICE_SIGNATURES: Map<DeviceType, DeviceSignature> = new Map([
    [DeviceType.MI_BAND, {
      namePatterns: ['mi band', 'miband'],
      serviceUUIDs: ['fee0', 'fee1'],
      manufacturerData: [0x57, 0x01]
    }],
    [DeviceType.MI_BAND_2, {
      namePatterns: ['mi band 2', 'miband 2'],
      serviceUUIDs: ['fee0', 'fee1'],
      manufacturerData: [0x57, 0x01]
    }],
    [DeviceType.MI_BAND_3, {
      namePatterns: ['mi band 3', 'miband 3'],
      serviceUUIDs: ['fee0', 'fee1'],
      manufacturerData: [0x57, 0x01]
    }],
    [DeviceType.MI_BAND_4, {
      namePatterns: ['mi band 4', 'miband 4'],
      serviceUUIDs: ['fee0', 'fee1'],
      manufacturerData: [0x57, 0x01]
    }],
    [DeviceType.MI_BAND_5, {
      namePatterns: ['mi band 5', 'miband 5'],
      serviceUUIDs: ['fee0', 'fee1'],
      manufacturerData: [0x57, 0x01]
    }],
    [DeviceType.MI_BAND_6, {
      namePatterns: ['mi band 6', 'miband 6'],
      serviceUUIDs: ['fee0', 'fee1'],
      manufacturerData: [0x57, 0x01]
    }],
    [DeviceType.MI_BAND_7, {
      namePatterns: ['mi band 7', 'miband 7'],
      serviceUUIDs: ['fee0', 'fee1'],
      manufacturerData: [0x57, 0x01]
    }],
    [DeviceType.MI_BAND_8, {
      namePatterns: ['mi band 8', 'miband 8', 'mi smart band 8', 'smart band 8', 'xiaomi smart band 8'],
      serviceUUIDs: ['fee0', 'fee1', '180f', '1812'],
      manufacturerData: [0x57, 0x01]
    }]
  ]);

  static identifyDevice(scanResult: any): DeviceType {
    const deviceName = (scanResult.name || scanResult.localName || '').toLowerCase();
    const serviceUUIDs = (scanResult.serviceUUIDs || []).map((uuid: string) => uuid.toLowerCase());
    const manufacturerData = scanResult.manufacturerData;


    const scores: Array<{ type: DeviceType; score: number }> = [];

    for (const [deviceType, signature] of DeviceDiscovery.DEVICE_SIGNATURES) {
      let score = 0;

      const nameMatch = signature.namePatterns.some(pattern => 
        deviceName.includes(pattern)
      );
      if (nameMatch) {
        score += 50;
      }

      const serviceMatch = signature.serviceUUIDs.some(uuid => 
        serviceUUIDs.includes(uuid.toLowerCase())
      );
      if (serviceMatch) {
        score += 30;
      }

      if (signature.manufacturerData && manufacturerData) {
        const manufacturerMatch = signature.manufacturerData.every((byte, index) => 
          manufacturerData[index] === byte
        );
        if (manufacturerMatch) {
          score += 20;
        }
      }

      if (signature.minRSSI && scanResult.rssi && scanResult.rssi >= signature.minRSSI) {
        score += 10;
      }

      scores.push({ type: deviceType, score });
    }

    scores.sort((a, b) => b.score - a.score);
    
    const bestMatch = scores[0];
    if (bestMatch && bestMatch.score >= 20) {
      return bestMatch.type;
    }

    if (DeviceDiscovery.isLikelyXiaomiDevice(scanResult)) {
      return DeviceType.MI_BAND_8;
    }

    return DeviceType.UNKNOWN;
  }

  private static isLikelyXiaomiDevice(scanResult: any): boolean {
    const deviceName = (scanResult.name || scanResult.localName || '').toLowerCase();
    const serviceUUIDs = (scanResult.serviceUUIDs || []).map((uuid: string) => uuid.toLowerCase());
    
    const xiaomiNamePatterns = [
      'xiaomi', 'mi band', 'miband', 'mi smart band', 'smart band',
      'redmi', 'amazfit', 'huami', 'band 8', 'smart band 8'
    ];
    
    const hasXiaomiName = xiaomiNamePatterns.some(pattern => 
      deviceName.includes(pattern)
    );
    
    const xiaomiServiceUUIDs = ['fee0', 'fee1', '180f', '1812', '1800', '1801'];
    const hasXiaomiService = xiaomiServiceUUIDs.some(uuid => 
      serviceUUIDs.includes(uuid)
    );
    
    const hasXiaomiManufacturer = scanResult.manufacturerData && 
      (scanResult.manufacturerData[0] === 0x57 && scanResult.manufacturerData[1] === 0x01);
    
    return hasXiaomiName || hasXiaomiService || hasXiaomiManufacturer;
  }

  static getDeviceCapabilities(deviceType: DeviceType): {
    supportsHeartRate: boolean;
    supportsSteps: boolean;
    supportsCalories: boolean;
    supportsSleep: boolean;
    supportsNotifications: boolean;
    supportsFind: boolean;
    batteryMonitoring: boolean;
  } {
    const baseCapabilities = {
      supportsHeartRate: false,
      supportsSteps: false,
      supportsCalories: false,
      supportsSleep: false,
      supportsNotifications: false,
      supportsFind: false,
      batteryMonitoring: false
    };

    switch (deviceType) {
      case DeviceType.MI_BAND:
        return {
          ...baseCapabilities,
          supportsSteps: true,
          supportsNotifications: true,
          supportsFind: true,
          batteryMonitoring: true
        };
      
      case DeviceType.MI_BAND_2:
        return {
          ...baseCapabilities,
          supportsHeartRate: true,
          supportsSteps: true,
          supportsCalories: true,
          supportsNotifications: true,
          supportsFind: true,
          batteryMonitoring: true
        };
      
      case DeviceType.MI_BAND_3:
      case DeviceType.MI_BAND_4:
      case DeviceType.MI_BAND_5:
      case DeviceType.MI_BAND_6:
      case DeviceType.MI_BAND_7:
      case DeviceType.MI_BAND_8:
        return {
          ...baseCapabilities,
          supportsHeartRate: true,
          supportsSteps: true,
          supportsCalories: true,
          supportsSleep: true,
          supportsNotifications: true,
          supportsFind: true,
          batteryMonitoring: true
        };
      
      default:
        return baseCapabilities;
    }
  }

  static filterCompatibleDevices(scanResults: any[]): DeviceCandidate[] {
    const candidates = scanResults
      .map(result => {
        const deviceType = DeviceDiscovery.identifyDevice(result);
        return {
          id: result.id,
          name: result.name || result.localName || 'Unknown Device',
          address: result.id,
          rssi: result.rssi,
          isConnected: false,
          deviceType
        };
      })
      .filter(device => device.deviceType !== DeviceType.UNKNOWN)
      .sort((a, b) => (b.rssi || -100) - (a.rssi || -100)); 

    return candidates;
  }
}