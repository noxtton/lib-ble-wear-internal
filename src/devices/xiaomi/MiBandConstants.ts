import { DeviceType } from '../../types/DeviceTypes';

export class MiBandConstants {
  static readonly SERVICE_MIBAND = 'fee0';
  static readonly SERVICE_MIBAND2 = 'fee1';
  static readonly SERVICE_HEART_RATE = '180d';
  static readonly SERVICE_IMMEDIATE_ALERT = '1802';
  static readonly SERVICE_DEVICE_INFO = '180a';
  static readonly SERVICE_BATTERY = '180f';

  static readonly CHAR_AUTH = 'ff01';
  static readonly CHAR_HEART_RATE_MEASURE = '2a39';
  static readonly CHAR_HEART_RATE_DATA = '2a37';
  static readonly CHAR_STEPS = 'ff06';
  static readonly CHAR_ACTIVITY_DATA = 'ff04';
  static readonly CHAR_NOTIFICATION = 'ff03';
  static readonly CHAR_DEVICE_INFO = 'ff01';
  static readonly CHAR_BATTERY = 'ff0c';
  static readonly CHAR_TIME = 'ff0a';
  static readonly CHAR_USER_INFO = 'ff04';
  static readonly CHAR_CONTROL_POINT = 'ff05';
  static readonly CHAR_REALTIME_STEPS = 'ff06';
  static readonly CHAR_ACTIVITY_DATA_NOTIFY = 'ff07';
  static readonly CHAR_FIRMWARE_DATA = 'ff08';
  static readonly CHAR_LE_PARAMS = 'ff09';
  static readonly CHAR_DATE_TIME = 'ff0a';
  static readonly CHAR_STATISTICS = 'ff0b';
  static readonly CHAR_BATTERY_INFO = 'ff0c';
  static readonly CHAR_TEST = 'ff0d';
  static readonly CHAR_SENSOR_DATA = 'ff0e';
  static readonly CHAR_PAIR = 'ff0f';
  static readonly CHAR_VIBRATION = 'ff10';

  static readonly CMD_AUTH_REQUEST = 0x01;
  static readonly CMD_AUTH_CONFIRM = 0x02;
  static readonly CMD_START_HEART_RATE_MANUAL = 0x15;
  static readonly CMD_STOP_HEART_RATE_MANUAL = 0x16;
  static readonly CMD_NOTIFICATION = 0x05;
  static readonly CMD_SET_TIME = 0x0a;
  static readonly CMD_GET_STEPS = 0x06;
  static readonly CMD_GET_ACTIVITY = 0x04;
  static readonly CMD_SET_USER_INFO = 0x4f;
  static readonly CMD_SET_FITNESS_GOAL = 0x10;
  static readonly CMD_VIBRATION = 0x08;
  static readonly CMD_FACTORY_RESET = 0x09;
  static readonly CMD_REBOOT = 0x0c;

  static readonly RESPONSE_HEART_RATE = 0x10;
  static readonly RESPONSE_ACTIVITY_DATA = 0x04;
  static readonly RESPONSE_REALTIME_STEPS = 0x06;
  static readonly RESPONSE_AUTH_SUCCESS = 0x10;
  static readonly RESPONSE_AUTH_FAIL = 0x11;
  static readonly RESPONSE_AUTH_REQUEST_RANDOM_AUTH_NUMBER = 0x02;
  static readonly RESPONSE_AUTH_SEND_ENCRYPTED_AUTH_NUMBER = 0x03;

  static readonly CCCD_UUID = '2902';
  static readonly HEART_RATE_SERVICE_UUID = '180d';
  static readonly HEART_RATE_MEASUREMENT_UUID = '2a37';
  static readonly HEART_RATE_CONTROL_POINT_UUID = '2a39';
  static readonly DEVICE_INFORMATION_SERVICE_UUID = '180a';
  static readonly BATTERY_SERVICE_UUID = '180f';
  static readonly BATTERY_LEVEL_UUID = '2a19';

  static readonly MIBAND_NAME_PATTERNS = [
    'mi band',
    'miband',
    'xiaomi',
    'mi smart band',
    'smart band',
    'redmi band',
    'amazfit band'
  ];

  static readonly AUTH_SECRET_KEY_LENGTH = 16;
  static readonly AUTH_RANDOM_KEY_LENGTH = 16;
  static readonly AUTH_SEND_KEY = [0x01, 0x00];
  static readonly AUTH_REQUEST_RANDOM_AUTH_NUMBER = [0x02, 0x00];
  static readonly AUTH_SEND_ENCRYPTED_AUTH_NUMBER = [0x03, 0x00];

  // Activity data types
  static readonly ACTIVITY_TYPE_ACTIVITY = 0x01;
  static readonly ACTIVITY_TYPE_UNKNOWN_1 = 0x02;
  static readonly ACTIVITY_TYPE_UNKNOWN_2 = 0x03;
  static readonly ACTIVITY_TYPE_NONWEAR = 0x04;
  static readonly ACTIVITY_TYPE_UNKNOWN_3 = 0x05;
  static readonly ACTIVITY_TYPE_CHARGING = 0x06;

  static readonly NOTIFICATION_TYPE_SMS = 0x01;
  static readonly NOTIFICATION_TYPE_CALL = 0x02;
  static readonly NOTIFICATION_TYPE_EMAIL = 0x03;
  static readonly NOTIFICATION_TYPE_CHAT = 0x04;
  static readonly NOTIFICATION_TYPE_SOCIAL = 0x05;
  static readonly NOTIFICATION_TYPE_CALENDAR = 0x06;

  static readonly VIBRATION_SHORT = [0x08, 0x01];
  static readonly VIBRATION_LONG = [0x08, 0x02];
  static readonly VIBRATION_TRIPLE = [0x08, 0x03];

  static readonly DEVICE_CAPABILITIES = {
    [DeviceType.MI_BAND]: {
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
    [DeviceType.MI_BAND_2]: {
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
    [DeviceType.MI_BAND_3]: {
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
    [DeviceType.MI_BAND_4]: {
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
    [DeviceType.MI_BAND_5]: {
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
    [DeviceType.MI_BAND_6]: {
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
    [DeviceType.MI_BAND_7]: {
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
    [DeviceType.MI_BAND_8]: {
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

  static readonly PROTOCOL_COMMANDS = {
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

  static readonly ERROR_CODES = {
    SUCCESS: 0x01,
    FAILURE: 0x02,
    INVALID_PARAMETER: 0x03,
    NOT_SUPPORTED: 0x04,
    AUTH_REQUIRED: 0x05,
    TIMEOUT: 0x06,
    BUSY: 0x07,
  };

  static readonly MAX_PACKET_SIZE = 20;
  static readonly AUTH_PACKET_SIZE = 18;
  static readonly USER_INFO_PACKET_SIZE = 20;

  static readonly TIMEOUTS = {
    CONNECTION: 15000,
    AUTHENTICATION: 10000,
    COMMAND_RESPONSE: 5000,
    HEART_RATE_MEASUREMENT: 60000,
    DATA_FETCH: 30000,
  };

  static readonly DEFAULTS = {
    FITNESS_GOAL: 10000, 
    USER_WEIGHT: 70, 
    USER_HEIGHT: 170, 
    USER_AGE: 25,
    USER_GENDER: 1,
  };
}