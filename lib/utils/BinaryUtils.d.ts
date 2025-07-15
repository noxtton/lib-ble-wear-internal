export declare class BinaryUtils {
    static bytesToHex(bytes: Uint8Array): string;
    static hexToBytes(hex: string): Uint8Array;
    static concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array;
    static parseHeartRate(value: Uint8Array): number;
    static uint16ToBytes(value: number): Uint8Array;
    static uint32ToBytes(value: number): Uint8Array;
    static bytesToUint16(bytes: Uint8Array, offset?: number): number;
    static bytesToUint32(bytes: Uint8Array, offset?: number): number;
}
