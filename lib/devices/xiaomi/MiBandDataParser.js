"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiBandDataParser = void 0;
const BinaryUtils_1 = require("../../utils/BinaryUtils");
class MiBandDataParser {
    static parseDetailedActivityData(data) {
        if (data.length < 8)
            return null;
        const category = data[0];
        if (category === 0x01) {
            return {
                steps: BinaryUtils_1.BinaryUtils.bytesToUint32(data.slice(1, 5)),
                calories: BinaryUtils_1.BinaryUtils.bytesToUint16(data.slice(5, 7)),
                distance: data.length >= 9 ? BinaryUtils_1.BinaryUtils.bytesToUint16(data.slice(7, 9)) : 0,
                activeMinutes: data.length >= 11 ? BinaryUtils_1.BinaryUtils.bytesToUint16(data.slice(9, 11)) : 0,
                timestamp: new Date(),
                dataType: 'realtime'
            };
        }
        if (category === 0x02) {
            const timestamp = new Date(BinaryUtils_1.BinaryUtils.bytesToUint32(data.slice(1, 5)) * 1000);
            return {
                steps: BinaryUtils_1.BinaryUtils.bytesToUint32(data.slice(5, 9)),
                calories: BinaryUtils_1.BinaryUtils.bytesToUint16(data.slice(9, 11)),
                distance: BinaryUtils_1.BinaryUtils.bytesToUint16(data.slice(11, 13)),
                activeMinutes: BinaryUtils_1.BinaryUtils.bytesToUint16(data.slice(13, 15)),
                timestamp,
                dataType: 'historical'
            };
        }
        return null;
    }
    static parseHeartRateData(data) {
        if (data.length < 2)
            return null;
        const heartRate = data[1];
        let quality = 'unknown';
        if (data.length >= 3) {
            const qualityByte = data[2];
            if (qualityByte === 0x00)
                quality = 'good';
            else if (qualityByte === 0x01)
                quality = 'poor';
        }
        return {
            heartRate,
            timestamp: new Date(),
            quality
        };
    }
    static parseBatteryLevel(data) {
        if (data.length < 2)
            return null;
        return Math.min(100, Math.max(0, data[1]));
    }
    static parseDeviceInfo(data) {
        const info = {};
        if (data.length >= 4) {
            info.firmwareVersion = `${data[0]}.${data[1]}.${data[2]}`;
        }
        if (data.length >= 6) {
            info.hardwareVersion = `${data[4]}.${data[5]}`;
        }
        if (data.length >= 16) {
            info.serialNumber = BinaryUtils_1.BinaryUtils.bytesToHex(data.slice(6, 16));
        }
        return info;
    }
    static parseNotificationResponse(data) {
        if (data.length < 2)
            return { success: false };
        const responseCode = data[1];
        return {
            success: responseCode === 0x01,
            messageId: data.length >= 3 ? data[2] : undefined
        };
    }
}
exports.MiBandDataParser = MiBandDataParser;
