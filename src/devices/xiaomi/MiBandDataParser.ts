import { BinaryUtils } from '../../utils/BinaryUtils';

export interface DetailedActivityData {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  heartRate?: number;
  timestamp: Date;
  dataType: 'realtime' | 'historical';
}

export interface HeartRateData {
  heartRate: number;
  timestamp: Date;
  quality: 'good' | 'poor' | 'unknown';
}

export class MiBandDataParser {
  
  static parseDetailedActivityData(data: Uint8Array): DetailedActivityData | null {
    if (data.length < 8) return null;

    const category = data[0];
    
    if (category === 0x01) {
      return {
        steps: BinaryUtils.bytesToUint32(data.slice(1, 5)),
        calories: BinaryUtils.bytesToUint16(data.slice(5, 7)),
        distance: data.length >= 9 ? BinaryUtils.bytesToUint16(data.slice(7, 9)) : 0,
        activeMinutes: data.length >= 11 ? BinaryUtils.bytesToUint16(data.slice(9, 11)) : 0,
        timestamp: new Date(),
        dataType: 'realtime'
      };
    }
    

    if (category === 0x02) {
      const timestamp = new Date(BinaryUtils.bytesToUint32(data.slice(1, 5)) * 1000);
      return {
        steps: BinaryUtils.bytesToUint32(data.slice(5, 9)),
        calories: BinaryUtils.bytesToUint16(data.slice(9, 11)),
        distance: BinaryUtils.bytesToUint16(data.slice(11, 13)),
        activeMinutes: BinaryUtils.bytesToUint16(data.slice(13, 15)),
        timestamp,
        dataType: 'historical'
      };
    }

    return null;
  }

  static parseHeartRateData(data: Uint8Array): HeartRateData | null {
    if (data.length < 2) return null;

    const heartRate = data[1];
    let quality: 'good' | 'poor' | 'unknown' = 'unknown';
    
    if (data.length >= 3) {
      const qualityByte = data[2];
      if (qualityByte === 0x00) quality = 'good';
      else if (qualityByte === 0x01) quality = 'poor';
    }

    return {
      heartRate,
      timestamp: new Date(),
      quality
    };
  }

  static parseBatteryLevel(data: Uint8Array): number | null {
    if (data.length < 2) return null;
    
    return Math.min(100, Math.max(0, data[1]));
  }

  static parseDeviceInfo(data: Uint8Array): { 
    firmwareVersion?: string;
    hardwareVersion?: string;
    serialNumber?: string;
  } {
    const info: any = {};
    
    if (data.length >= 4) {
      info.firmwareVersion = `${data[0]}.${data[1]}.${data[2]}`;
    }
    
    if (data.length >= 6) {
      info.hardwareVersion = `${data[4]}.${data[5]}`;
    }
    
    if (data.length >= 16) {
      info.serialNumber = BinaryUtils.bytesToHex(data.slice(6, 16));
    }
    
    return info;
  }

  static parseNotificationResponse(data: Uint8Array): { 
    success: boolean; 
    messageId?: number 
  } {
    if (data.length < 2) return { success: false };
    
    const responseCode = data[1];
    return {
      success: responseCode === 0x01,
      messageId: data.length >= 3 ? data[2] : undefined
    };
  }
}