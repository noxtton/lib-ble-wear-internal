"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiBandAuthentication = void 0;
const BinaryUtils_1 = require("../../utils/BinaryUtils");
class MiBandAuthentication {
    constructor(authKey) {
        this.authKey = BinaryUtils_1.BinaryUtils.hexToBytes(authKey);
    }
    createInitialAuthRequest() {
        const command = new Uint8Array(18);
        command.set(MiBandAuthentication.AUTH_SEND_KEY, 0);
        command.set(this.authKey, 2);
        return command;
    }
    createRandomAuthRequest() {
        return MiBandAuthentication.AUTH_REQUEST_RANDOM_AUTH_NUMBER;
    }
    createEncryptedAuthResponse(randomNumber) {
        const encrypted = this.aesEncrypt(randomNumber, this.authKey);
        const command = new Uint8Array(18);
        command.set(MiBandAuthentication.AUTH_SEND_ENCRYPTED_AUTH_NUMBER, 0);
        command.set(encrypted, 2);
        return command;
    }
    aesEncrypt(data, key) {
        return data;
    }
    parseAuthResponse(data) {
        if (data.length < 2)
            return { success: false };
        const responseType = (data[1] << 8) | data[0];
        switch (responseType) {
            case 0x0100:
                return { success: true };
            case 0x0200:
                if (data.length >= 18) {
                    return { success: true, randomNumber: data.slice(2, 18) };
                }
                return { success: false };
            case 0x0300:
                return { success: false };
            default:
                return { success: false };
        }
    }
}
exports.MiBandAuthentication = MiBandAuthentication;
MiBandAuthentication.AUTH_SEND_KEY = new Uint8Array([0x01, 0x00]);
MiBandAuthentication.AUTH_REQUEST_RANDOM_AUTH_NUMBER = new Uint8Array([0x02, 0x00]);
MiBandAuthentication.AUTH_SEND_ENCRYPTED_AUTH_NUMBER = new Uint8Array([0x03, 0x00]);
