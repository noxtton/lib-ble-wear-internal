import { BinaryUtils } from '../../utils/BinaryUtils';

export class MiBandAuthentication {
  private static readonly AUTH_SEND_KEY = new Uint8Array([0x01, 0x00]);
  private static readonly AUTH_REQUEST_RANDOM_AUTH_NUMBER = new Uint8Array([0x02, 0x00]);
  private static readonly AUTH_SEND_ENCRYPTED_AUTH_NUMBER = new Uint8Array([0x03, 0x00]);

  private authKey: Uint8Array;
  private randomKey?: Uint8Array;

  constructor(authKey: string) {
    this.authKey = BinaryUtils.hexToBytes(authKey);
  }

  createInitialAuthRequest(): Uint8Array {
    const command = new Uint8Array(18);
    command.set(MiBandAuthentication.AUTH_SEND_KEY, 0);
    command.set(this.authKey, 2);
    return command;
  }

  createRandomAuthRequest(): Uint8Array {
    return MiBandAuthentication.AUTH_REQUEST_RANDOM_AUTH_NUMBER;
  }

  createEncryptedAuthResponse(randomNumber: Uint8Array): Uint8Array {
    const encrypted = this.aesEncrypt(randomNumber, this.authKey);
    const command = new Uint8Array(18);
    command.set(MiBandAuthentication.AUTH_SEND_ENCRYPTED_AUTH_NUMBER, 0);
    command.set(encrypted, 2);
    return command;
  }

  private aesEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
 
    return data; 
  }

  parseAuthResponse(data: Uint8Array): { success: boolean; randomNumber?: Uint8Array } {
    if (data.length < 2) return { success: false };
    
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