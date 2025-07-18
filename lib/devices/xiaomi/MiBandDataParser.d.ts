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
export declare class MiBandDataParser {
    static parseDetailedActivityData(data: Uint8Array): DetailedActivityData | null;
    static parseHeartRateData(data: Uint8Array): HeartRateData | null;
    static parseBatteryLevel(data: Uint8Array): number | null;
    static parseDeviceInfo(data: Uint8Array): {
        firmwareVersion?: string;
        hardwareVersion?: string;
        serialNumber?: string;
    };
    static parseNotificationResponse(data: Uint8Array): {
        success: boolean;
        messageId?: number;
    };
}
