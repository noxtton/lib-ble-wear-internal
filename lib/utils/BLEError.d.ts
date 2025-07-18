export declare enum BLEErrorType {
    CONNECTION_FAILED = "connection_failed",
    AUTHENTICATION_FAILED = "authentication_failed",
    CHARACTERISTIC_NOT_FOUND = "characteristic_not_found",
    WRITE_FAILED = "write_failed",
    READ_FAILED = "read_failed",
    NOTIFICATION_FAILED = "notification_failed",
    TIMEOUT = "timeout",
    DEVICE_NOT_SUPPORTED = "device_not_supported",
    PERMISSIONS_DENIED = "permissions_denied"
}
export declare class BLEError extends Error {
    type: BLEErrorType;
    deviceId?: string | undefined;
    originalError?: Error | undefined;
    constructor(type: BLEErrorType, message: string, deviceId?: string | undefined, originalError?: Error | undefined);
}
