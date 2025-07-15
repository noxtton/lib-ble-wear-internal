export interface ActivityData {
    steps?: number;
    calories?: number;
    standingHours?: number;
    distance?: number;
}
export declare class MiBandProtocol {
    private authToken?;
    constructor(authToken?: string);
    createAuthRequest(authToken: string): Uint8Array;
    createHeartRateMeasureCommand(): Uint8Array;
    parseHeartRateData(data: Uint8Array): number;
    parseActivityData(data: Uint8Array): ActivityData;
    createNotificationCommand(message: string): Uint8Array;
    createTimeCommand(): Uint8Array;
}
