export * from '../core/BLEManager';
export * from '../core/DeviceConnection';
export * from '../devices/xiaomi/MiBandDevice';
export * from '../devices/xiaomi/MiBandProtocol';
export * from '../types/DeviceTypes';
export * from '../utils/BinaryUtils';
export { BLEManager } from '../core/BLEManager';
export { MiBandDevice } from '../devices/xiaomi/MiBandDevice';
export var DeviceType;
(function (DeviceType) {
    DeviceType["MI_BAND"] = "MI_BAND";
    DeviceType["MI_BAND_2"] = "MI_BAND_2";
    DeviceType["MI_BAND_3"] = "MI_BAND_3";
    DeviceType["MI_BAND_4"] = "MI_BAND_4";
    DeviceType["MI_BAND_5"] = "MI_BAND_5";
    DeviceType["MI_BAND_6"] = "MI_BAND_6";
    DeviceType["MI_BAND_7"] = "MI_BAND_7";
    DeviceType["UNKNOWN"] = "UNKNOWN";
})(DeviceType || (DeviceType = {}));
