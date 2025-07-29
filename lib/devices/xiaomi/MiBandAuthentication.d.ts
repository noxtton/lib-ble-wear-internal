export interface AuthenticationState {
    step: 'initial' | 'key_sent' | 'random_requested' | 'encrypted_sent' | 'authenticated' | 'failed';
    attempts: number;
    lastError?: string;
}
export declare class MiBandAuthentication {
    private authKey;
    private randomKey?;
    private state;
    constructor(authKey: string);
    /**
     * Creates the initial authentication request with the device key
     */
    createInitialAuthRequest(): Uint8Array;
    /**
     * Creates request for random authentication number
     */
    createRandomAuthRequest(): Uint8Array;
    /**
     * Creates encrypted authentication response using AES
     */
    createEncryptedAuthResponse(randomNumber: Uint8Array): Uint8Array;
    private aesEncrypt;
    private xorEncrypt;
    parseAuthResponse(data: Uint8Array): {
        success: boolean;
        randomNumber?: Uint8Array;
        needsRandom?: boolean;
        isComplete?: boolean;
    };
    performAuthentication(writeCharacteristic: (data: Uint8Array) => Promise<void>, readResponse: () => Promise<Uint8Array>, timeout?: number): Promise<boolean>;
    private waitForResponse;
    getAuthenticationState(): AuthenticationState;
    isAuthenticated(): boolean;
    reset(): void;
    static isValidAuthKey(authKey: string): boolean;
    static generateRandomAuthKey(): string;
}
