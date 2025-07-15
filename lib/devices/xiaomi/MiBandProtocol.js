import { BinaryUtils } from '../../utils/BinaryUtils';
import { MiBandConstants } from './MiBandConstants';
export class MiBandProtocol {
    constructor(authToken) {
        this.authToken = authToken;
    }
    createAuthRequest(authToken) {
        const authBytes = BinaryUtils.hexToBytes(authToken);
        const request = new Uint8Array(1 + authBytes.length);
        request[0] = MiBandConstants.CMD_AUTH_REQUEST;
        request.set(authBytes, 1);
        return request;
    }
    createHeartRateMeasureCommand() {
        return new Uint8Array([
            MiBandConstants.CMD_START_HEART_RATE_MANUAL,
            0x01,
            0x01
        ]);
    }
    parseHeartRateData(data) {
        if (data.length < 2)
            return 0;
        if (data[0] === MiBandConstants.RESPONSE_HEART_RATE) {
            return data[1];
        }
        return 0;
    }
    parseActivityData(data) {
        const result = {};
        if (data.length < 4)
            return result;
        const packetType = data[0];
        switch (packetType) {
            case MiBandConstants.RESPONSE_ACTIVITY_DATA:
                if (data.length >= 4) {
                    result.steps = BinaryUtils.bytesToUint32(data.slice(1, 4));
                }
                if (data.length >= 6) {
                    result.calories = BinaryUtils.bytesToUint16(data.slice(4, 6));
                }
                if (data.length >= 10) {
                    result.distance = BinaryUtils.bytesToUint32(data.slice(6, 10));
                }
                break;
            case MiBandConstants.RESPONSE_REALTIME_STEPS:
                if (data.length >= 4) {
                    result.steps = BinaryUtils.bytesToUint32(data.slice(1, 4));
                }
                break;
        }
        return result;
    }
    createNotificationCommand(message) {
        const messageBytes = new TextEncoder().encode(message.substring(0, 20));
        const command = new Uint8Array(2 + messageBytes.length);
        command[0] = MiBandConstants.CMD_NOTIFICATION;
        command[1] = messageBytes.length;
        command.set(messageBytes, 2);
        return command;
    }
    createTimeCommand() {
        const now = new Date();
        const timestamp = Math.floor(now.getTime() / 1000);
        const timeBytes = BinaryUtils.uint32ToBytes(timestamp);
        const command = new Uint8Array(5);
        command[0] = MiBandConstants.CMD_SET_TIME;
        command.set(timeBytes, 1);
        return command;
    }
}
