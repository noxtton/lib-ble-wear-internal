"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiBandAuthentication = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const BinaryUtils_1 = require("../../utils/BinaryUtils");
const MiBandConstants_1 = require("./MiBandConstants");
class MiBandAuthentication {
    constructor(authKey) {
        this.state = { step: 'initial', attempts: 0 };
        if (authKey.length !== 32) {
            throw new Error('Auth key must be 32 hex characters (16 bytes)');
        }
        this.authKey = BinaryUtils_1.BinaryUtils.hexToBytes(authKey);
    }
    /**
     * Creates the initial authentication request with the device key
     */
    createInitialAuthRequest() {
        const command = new Uint8Array(18);
        command.set(MiBandConstants_1.MiBandConstants.AUTH_SEND_KEY, 0);
        command.set(this.authKey, 2);
        this.state = { step: 'key_sent', attempts: this.state.attempts + 1 };
        return command;
    }
    /**
     * Creates request for random authentication number
     */
    createRandomAuthRequest() {
        this.state = { ...this.state, step: 'random_requested' };
        return new Uint8Array(MiBandConstants_1.MiBandConstants.AUTH_REQUEST_RANDOM_AUTH_NUMBER);
    }
    /**
     * Creates encrypted authentication response using AES
     */
    createEncryptedAuthResponse(randomNumber) {
        if (randomNumber.length !== 16) {
            throw new Error('Random number must be 16 bytes');
        }
        this.randomKey = randomNumber;
        try {
            const encrypted = this.aesEncrypt(randomNumber, this.authKey);
            const command = new Uint8Array(18);
            command.set(MiBandConstants_1.MiBandConstants.AUTH_SEND_ENCRYPTED_AUTH_NUMBER, 0);
            command.set(encrypted, 2);
            this.state = { ...this.state, step: 'encrypted_sent' };
            return command;
        }
        catch (error) {
            this.state = {
                ...this.state,
                step: 'failed',
                lastError: `Encryption failed: ${error instanceof Error ? error.message : String(error)}`
            };
            throw error;
        }
    }
    aesEncrypt(data, key) {
        try {
            const keyWords = crypto_js_1.default.lib.WordArray.create(Array.from(key));
            const dataWords = crypto_js_1.default.lib.WordArray.create(Array.from(data));
            const encrypted = crypto_js_1.default.AES.encrypt(dataWords, keyWords, {
                mode: crypto_js_1.default.mode.ECB,
                padding: crypto_js_1.default.pad.NoPadding
            });
            const encryptedBytes = [];
            const words = encrypted.ciphertext.words;
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                encryptedBytes.push((word >> 24) & 0xff);
                encryptedBytes.push((word >> 16) & 0xff);
                encryptedBytes.push((word >> 8) & 0xff);
                encryptedBytes.push(word & 0xff);
            }
            return new Uint8Array(encryptedBytes.slice(0, 16));
        }
        catch (error) {
            console.error('AES encryption failed:', error);
            return this.xorEncrypt(data, key);
        }
    }
    xorEncrypt(data, key) {
        const result = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            result[i] = data[i] ^ key[i];
        }
        return result;
    }
    parseAuthResponse(data) {
        if (data.length < 2) {
            this.state = { ...this.state, step: 'failed', lastError: 'Invalid response length' };
            return { success: false };
        }
        const responseType = (data[1] << 8) | data[0];
        switch (responseType) {
            case 0x0100:
                this.state = { ...this.state, step: 'random_requested' };
                return { success: true, needsRandom: true };
            case 0x0200:
                if (data.length >= 18) {
                    const randomNumber = data.slice(2, 18);
                    this.state = { ...this.state, step: 'random_requested' };
                    return { success: true, randomNumber };
                }
                else {
                    this.state = { ...this.state, step: 'failed', lastError: 'Invalid random number length' };
                    return { success: false };
                }
            case 0x0300:
                this.state = { ...this.state, step: 'authenticated' };
                return { success: true, isComplete: true };
            case 0x0301:
                this.state = {
                    ...this.state,
                    step: 'failed',
                    lastError: 'Authentication rejected by device'
                };
                return { success: false };
            default:
                this.state = {
                    ...this.state,
                    step: 'failed',
                    lastError: `Unknown response type: 0x${responseType.toString(16)}`
                };
                return { success: false };
        }
    }
    async performAuthentication(writeCharacteristic, readResponse, timeout = MiBandConstants_1.MiBandConstants.TIMEOUTS.AUTHENTICATION) {
        this.state = { step: 'initial', attempts: this.state.attempts + 1 };
        const startTime = Date.now();
        try {
            const authRequest = this.createInitialAuthRequest();
            await writeCharacteristic(authRequest);
            let response = await this.waitForResponse(readResponse, timeout);
            let result = this.parseAuthResponse(response);
            if (!result.success) {
                throw new Error(this.state.lastError || 'Initial authentication failed');
            }
            if (result.needsRandom) {
                const randomRequest = this.createRandomAuthRequest();
                await writeCharacteristic(randomRequest);
                response = await this.waitForResponse(readResponse, timeout);
                result = this.parseAuthResponse(response);
                if (!result.success || !result.randomNumber) {
                    throw new Error(this.state.lastError || 'Random number request failed');
                }
                const encryptedResponse = this.createEncryptedAuthResponse(result.randomNumber);
                await writeCharacteristic(encryptedResponse);
                response = await this.waitForResponse(readResponse, timeout);
                result = this.parseAuthResponse(response);
                if (!result.success || !result.isComplete) {
                    throw new Error(this.state.lastError || 'Encrypted authentication failed');
                }
            }
            return true;
        }
        catch (error) {
            this.state = {
                ...this.state,
                step: 'failed',
                lastError: error instanceof Error ? error.message : String(error)
            };
            console.error('Authentication failed:', this.state.lastError);
            return false;
        }
    }
    async waitForResponse(readResponse, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Authentication response timeout'));
            }, timeout);
            readResponse()
                .then(response => {
                clearTimeout(timeoutId);
                resolve(response);
            })
                .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    getAuthenticationState() {
        return { ...this.state };
    }
    isAuthenticated() {
        return this.state.step === 'authenticated';
    }
    reset() {
        this.state = { step: 'initial', attempts: 0 };
        this.randomKey = undefined;
    }
    static isValidAuthKey(authKey) {
        return /^[0-9a-fA-F]{32}$/.test(authKey);
    }
    static generateRandomAuthKey() {
        const bytes = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(bytes);
        }
        else {
            for (let i = 0; i < 16; i++) {
                bytes[i] = Math.floor(Math.random() * 256);
            }
        }
        return BinaryUtils_1.BinaryUtils.bytesToHex(bytes);
    }
}
exports.MiBandAuthentication = MiBandAuthentication;
