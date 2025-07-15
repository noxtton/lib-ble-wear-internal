export class BinaryUtils {
    static bytesToHex(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }
    static hexToBytes(hex) {
        const result = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            result[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return result;
    }
    static concatUint8Arrays(...arrays) {
        const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const array of arrays) {
            result.set(array, offset);
            offset += array.length;
        }
        return result;
    }
    static parseHeartRate(value) {
        if (value.length === 0)
            return 0;
        const flag = value[0];
        const isUint16 = (flag & 0x01) !== 0;
        if (isUint16 && value.length >= 3) {
            return (value[2] << 8) | value[1];
        }
        else if (!isUint16 && value.length >= 2) {
            return value[1];
        }
        return 0;
    }
    static uint16ToBytes(value) {
        return new Uint8Array([value & 0xFF, (value >> 8) & 0xFF]);
    }
    static uint32ToBytes(value) {
        return new Uint8Array([
            value & 0xFF,
            (value >> 8) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 24) & 0xFF
        ]);
    }
    static bytesToUint16(bytes, offset = 0) {
        if (bytes.length < offset + 2)
            return 0;
        return bytes[offset] | (bytes[offset + 1] << 8);
    }
    static bytesToUint32(bytes, offset = 0) {
        if (bytes.length < offset + 4)
            return 0;
        return bytes[offset] |
            (bytes[offset + 1] << 8) |
            (bytes[offset + 2] << 16) |
            (bytes[offset + 3] << 24);
    }
}
