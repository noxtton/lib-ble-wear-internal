"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLEError = exports.BLEErrorType = void 0;
var BLEErrorType;
(function (BLEErrorType) {
    BLEErrorType["CONNECTION_FAILED"] = "connection_failed";
    BLEErrorType["AUTHENTICATION_FAILED"] = "authentication_failed";
    BLEErrorType["CHARACTERISTIC_NOT_FOUND"] = "characteristic_not_found";
    BLEErrorType["WRITE_FAILED"] = "write_failed";
    BLEErrorType["READ_FAILED"] = "read_failed";
    BLEErrorType["NOTIFICATION_FAILED"] = "notification_failed";
    BLEErrorType["TIMEOUT"] = "timeout";
    BLEErrorType["DEVICE_NOT_SUPPORTED"] = "device_not_supported";
    BLEErrorType["PERMISSIONS_DENIED"] = "permissions_denied";
})(BLEErrorType || (exports.BLEErrorType = BLEErrorType = {}));
class BLEError extends Error {
    constructor(type, message, deviceId, originalError) {
        super(message);
        this.type = type;
        this.deviceId = deviceId;
        this.originalError = originalError;
        this.name = 'BLEError';
    }
}
exports.BLEError = BLEError;
