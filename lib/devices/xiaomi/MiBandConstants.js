"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiBandConstants = void 0;
const DeviceTypes_1 = require("../../types/DeviceTypes");
class MiBandConstants {
}
exports.MiBandConstants = MiBandConstants;
MiBandConstants.SERVICE_MIBAND = 'fee0';
MiBandConstants.SERVICE_MIBAND2 = 'fee1';
MiBandConstants.SERVICE_HEART_RATE = '180d';
MiBandConstants.SERVICE_IMMEDIATE_ALERT = '1802';
MiBandConstants.SERVICE_DEVICE_INFO = '180a';
MiBandConstants.SERVICE_BATTERY = '180f';
MiBandConstants.CHAR_AUTH = 'ff01';
MiBandConstants.CHAR_HEART_RATE_MEASURE = '2a39';
MiBandConstants.CHAR_HEART_RATE_DATA = '2a37';
MiBandConstants.CHAR_STEPS = 'ff06';
MiBandConstants.CHAR_ACTIVITY_DATA = 'ff04';
MiBandConstants.CHAR_NOTIFICATION = 'ff03';
MiBandConstants.CHAR_DEVICE_INFO = 'ff01';
MiBandConstants.CHAR_BATTERY = 'ff0c';
MiBandConstants.CHAR_TIME = 'ff0a';
MiBandConstants.CHAR_USER_INFO = 'ff04';
MiBandConstants.CHAR_CONTROL_POINT = 'ff05';
MiBandConstants.CHAR_REALTIME_STEPS = 'ff06';
MiBandConstants.CHAR_ACTIVITY_DATA_NOTIFY = 'ff07';
MiBandConstants.CHAR_FIRMWARE_DATA = 'ff08';
MiBandConstants.CHAR_LE_PARAMS = 'ff09';
MiBandConstants.CHAR_DATE_TIME = 'ff0a';
MiBandConstants.CHAR_STATISTICS = 'ff0b';
MiBandConstants.CHAR_BATTERY_INFO = 'ff0c';
MiBandConstants.CHAR_TEST = 'ff0d';
MiBandConstants.CHAR_SENSOR_DATA = 'ff0e';
MiBandConstants.CHAR_PAIR = 'ff0f';
MiBandConstants.CHAR_VIBRATION = 'ff10';
MiBandConstants.CMD_AUTH_REQUEST = 0x01;
MiBandConstants.CMD_AUTH_CONFIRM = 0x02;
MiBandConstants.CMD_START_HEART_RATE_MANUAL = 0x15;
MiBandConstants.CMD_STOP_HEART_RATE_MANUAL = 0x16;
MiBandConstants.CMD_NOTIFICATION = 0x05;
MiBandConstants.CMD_SET_TIME = 0x0a;
MiBandConstants.CMD_GET_STEPS = 0x06;
MiBandConstants.CMD_GET_ACTIVITY = 0x04;
MiBandConstants.CMD_SET_USER_INFO = 0x4f;
MiBandConstants.CMD_SET_FITNESS_GOAL = 0x10;
MiBandConstants.CMD_VIBRATION = 0x08;
MiBandConstants.CMD_FACTORY_RESET = 0x09;
MiBandConstants.CMD_REBOOT = 0x0c;
MiBandConstants.RESPONSE_HEART_RATE = 0x10;
MiBandConstants.RESPONSE_ACTIVITY_DATA = 0x04;
MiBandConstants.RESPONSE_REALTIME_STEPS = 0x06;
MiBandConstants.RESPONSE_AUTH_SUCCESS = 0x10;
MiBandConstants.RESPONSE_AUTH_FAIL = 0x11;
MiBandConstants.RESPONSE_AUTH_REQUEST_RANDOM_AUTH_NUMBER = 0x02;
MiBandConstants.RESPONSE_AUTH_SEND_ENCRYPTED_AUTH_NUMBER = 0x03;
MiBandConstants.CCCD_UUID = '2902';
MiBandConstants.HEART_RATE_SERVICE_UUID = '180d';
MiBandConstants.HEART_RATE_MEASUREMENT_UUID = '2a37';
MiBandConstants.HEART_RATE_CONTROL_POINT_UUID = '2a39';
MiBandConstants.DEVICE_INFORMATION_SERVICE_UUID = '180a';
MiBandConstants.BATTERY_SERVICE_UUID = '180f';
MiBandConstants.BATTERY_LEVEL_UUID = '2a19';
MiBandConstants.MIBAND_NAME_PATTERNS = [
    'mi band',
    'miband',
    'xiaomi',
    'mi smart band',
    'smart band',
    'redmi band',
    'amazfit band'
];
MiBandConstants.AUTH_SECRET_KEY_LENGTH = 16;
MiBandConstants.AUTH_RANDOM_KEY_LENGTH = 16;
MiBandConstants.AUTH_SEND_KEY = [0x01, 0x00];
MiBandConstants.AUTH_REQUEST_RANDOM_AUTH_NUMBER = [0x02, 0x00];
MiBandConstants.AUTH_SEND_ENCRYPTED_AUTH_NUMBER = [0x03, 0x00];
// Activity data types
MiBandConstants.ACTIVITY_TYPE_ACTIVITY = 0x01;
MiBandConstants.ACTIVITY_TYPE_UNKNOWN_1 = 0x02;
MiBandConstants.ACTIVITY_TYPE_UNKNOWN_2 = 0x03;
MiBandConstants.ACTIVITY_TYPE_NONWEAR = 0x04;
MiBandConstants.ACTIVITY_TYPE_UNKNOWN_3 = 0x05;
MiBandConstants.ACTIVITY_TYPE_CHARGING = 0x06;
MiBandConstants.NOTIFICATION_TYPE_SMS = 0x01;
MiBandConstants.NOTIFICATION_TYPE_CALL = 0x02;
MiBandConstants.NOTIFICATION_TYPE_EMAIL = 0x03;
MiBandConstants.NOTIFICATION_TYPE_CHAT = 0x04;
MiBandConstants.NOTIFICATION_TYPE_SOCIAL = 0x05;
MiBandConstants.NOTIFICATION_TYPE_CALENDAR = 0x06;
MiBandConstants.VIBRATION_SHORT = [0x08, 0x01];
MiBandConstants.VIBRATION_LONG = [0x08, 0x02];
MiBandConstants.VIBRATION_TRIPLE = [0x08, 0x03];
MiBandConstants.DEVICE_CAPABILITIES = {
    [DeviceTypes_1.DeviceType.MI_BAND]: {
        hasHeartRateSensor: false,
        hasStepCounter: true,
        hasCalorieTracking: false,
        hasDistanceTracking: false,
        hasSleepTracking: false,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: false,
    },
    [DeviceTypes_1.DeviceType.MI_BAND_2]: {
        hasHeartRateSensor: true,
        hasStepCounter: true,
        hasCalorieTracking: true,
        hasDistanceTracking: true,
        hasSleepTracking: true,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: true,
    },
    [DeviceTypes_1.DeviceType.MI_BAND_3]: {
        hasHeartRateSensor: true,
        hasStepCounter: true,
        hasCalorieTracking: true,
        hasDistanceTracking: true,
        hasSleepTracking: true,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: true,
    },
    [DeviceTypes_1.DeviceType.MI_BAND_4]: {
        hasHeartRateSensor: true,
        hasStepCounter: true,
        hasCalorieTracking: true,
        hasDistanceTracking: true,
        hasSleepTracking: true,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: true,
    },
    [DeviceTypes_1.DeviceType.MI_BAND_5]: {
        hasHeartRateSensor: true,
        hasStepCounter: true,
        hasCalorieTracking: true,
        hasDistanceTracking: true,
        hasSleepTracking: true,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: true,
    },
    [DeviceTypes_1.DeviceType.MI_BAND_6]: {
        hasHeartRateSensor: true,
        hasStepCounter: true,
        hasCalorieTracking: true,
        hasDistanceTracking: true,
        hasSleepTracking: true,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: true,
    },
    [DeviceTypes_1.DeviceType.MI_BAND_7]: {
        hasHeartRateSensor: true,
        hasStepCounter: true,
        hasCalorieTracking: true,
        hasDistanceTracking: true,
        hasSleepTracking: true,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: true,
    },
    [DeviceTypes_1.DeviceType.MI_BAND_8]: {
        hasHeartRateSensor: true,
        hasStepCounter: true,
        hasCalorieTracking: true,
        hasDistanceTracking: true,
        hasSleepTracking: true,
        hasNotifications: true,
        hasBatteryInfo: true,
        hasFind: true,
        supportsAuth: true,
    },
};
MiBandConstants.PROTOCOL_COMMANDS = {
    START_REALTIME_STEPS: [0x15, 0x00, 0x01],
    STOP_REALTIME_STEPS: [0x15, 0x00, 0x00],
    START_HEART_RATE: [0x15, 0x01, 0x01],
    STOP_HEART_RATE: [0x15, 0x01, 0x00],
    FETCH_ACTIVITY_DATA: [0x01, 0x01],
    SET_FITNESS_GOAL: [0x10, 0x00, 0x00],
    FIND_DEVICE: [0x08, 0x01],
    SEND_NOTIFICATION: [0x05, 0x01],
    SET_TIME: [0x0a],
    SET_USER_INFO: [0x4f, 0x00],
};
MiBandConstants.ERROR_CODES = {
    SUCCESS: 0x01,
    FAILURE: 0x02,
    INVALID_PARAMETER: 0x03,
    NOT_SUPPORTED: 0x04,
    AUTH_REQUIRED: 0x05,
    TIMEOUT: 0x06,
    BUSY: 0x07,
};
MiBandConstants.MAX_PACKET_SIZE = 20;
MiBandConstants.AUTH_PACKET_SIZE = 18;
MiBandConstants.USER_INFO_PACKET_SIZE = 20;
MiBandConstants.TIMEOUTS = {
    CONNECTION: 15000,
    AUTHENTICATION: 10000,
    COMMAND_RESPONSE: 5000,
    HEART_RATE_MEASUREMENT: 60000,
    DATA_FETCH: 30000,
};
MiBandConstants.DEFAULTS = {
    FITNESS_GOAL: 10000,
    USER_WEIGHT: 70,
    USER_HEIGHT: 170,
    USER_AGE: 25,
    USER_GENDER: 1,
};
