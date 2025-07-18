"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLEErrorType = exports.DeviceState = exports.DeviceType = void 0;
var DeviceType;
(function (DeviceType) {
    DeviceType["MI_BAND"] = "MI_BAND";
    DeviceType["MI_BAND_2"] = "MI_BAND_2";
    DeviceType["MI_BAND_3"] = "MI_BAND_3";
    DeviceType["MI_BAND_4"] = "MI_BAND_4";
    DeviceType["MI_BAND_5"] = "MI_BAND_5";
    DeviceType["MI_BAND_6"] = "MI_BAND_6";
    DeviceType["MI_BAND_7"] = "MI_BAND_7";
    DeviceType["MI_BAND_8"] = "MI_BAND_8";
    DeviceType["UNKNOWN"] = "UNKNOWN";
})(DeviceType || (exports.DeviceType = DeviceType = {}));
var DeviceState;
(function (DeviceState) {
    DeviceState["DISCONNECTED"] = "disconnected";
    DeviceState["CONNECTING"] = "connecting";
    DeviceState["CONNECTED"] = "connected";
    DeviceState["AUTHENTICATING"] = "authenticating";
    DeviceState["AUTHENTICATED"] = "authenticated";
    DeviceState["READY"] = "ready";
    DeviceState["ERROR"] = "error";
})(DeviceState || (exports.DeviceState = DeviceState = {}));
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
