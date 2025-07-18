export declare class MiBandAuthentication {
    private static readonly AUTH_SEND_KEY;
    private static readonly AUTH_REQUEST_RANDOM_AUTH_NUMBER;
    private static readonly AUTH_SEND_ENCRYPTED_AUTH_NUMBER;
    private authKey;
    private randomKey?;
    constructor(authKey: string);
    createInitialAuthRequest(): Uint8Array;
    createRandomAuthRequest(): Uint8Array;
    createEncryptedAuthResponse(randomNumber: Uint8Array): Uint8Array;
    private aesEncrypt;
    parseAuthResponse(data: Uint8Array): {
        success: boolean;
        randomNumber?: Uint8Array;
    };
}
