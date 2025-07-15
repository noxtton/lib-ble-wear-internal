export class MiBandConstants {
  static readonly SERVICE_MIBAND = 'fee0';
  static readonly SERVICE_MIBAND2 = 'fee1';
  static readonly SERVICE_HEART_RATE = '180d';
  static readonly SERVICE_IMMEDIATE_ALERT = '1802';
  static readonly SERVICE_DEVICE_INFO = '180a';

  static readonly CHAR_AUTH = 'ff01';
  static readonly CHAR_HEART_RATE_MEASURE = '2a39';
  static readonly CHAR_HEART_RATE_DATA = '2a37';
  static readonly CHAR_STEPS = 'ff06';
  static readonly CHAR_ACTIVITY_DATA = 'ff04';
  static readonly CHAR_NOTIFICATION = 'ff03';
  static readonly CHAR_DEVICE_INFO = 'ff01';
  static readonly CHAR_BATTERY = 'ff0c';
  static readonly CHAR_TIME = 'ff0a';

  static readonly CMD_AUTH_REQUEST = 0x01;
  static readonly CMD_AUTH_CONFIRM = 0x02;
  static readonly CMD_START_HEART_RATE_MANUAL = 0x15;
  static readonly CMD_STOP_HEART_RATE_MANUAL = 0x16;
  static readonly CMD_NOTIFICATION = 0x05;
  static readonly CMD_SET_TIME = 0x0a;
  static readonly CMD_GET_STEPS = 0x06;
  static readonly CMD_GET_ACTIVITY = 0x04;

  static readonly RESPONSE_HEART_RATE = 0x10;
  static readonly RESPONSE_ACTIVITY_DATA = 0x04;
  static readonly RESPONSE_REALTIME_STEPS = 0x06;
  static readonly RESPONSE_AUTH_SUCCESS = 0x10;
  static readonly RESPONSE_AUTH_FAIL = 0x11;

  static readonly CCCD_UUID = '2902';
  static readonly HEART_RATE_SERVICE_UUID = '180d';
  static readonly HEART_RATE_MEASUREMENT_UUID = '2a37';
  static readonly HEART_RATE_CONTROL_POINT_UUID = '2a39';

  static readonly MIBAND_NAME_PATTERNS = [
    'mi band',
    'miband',
    'xiaomi',
    'mi smart band'
  ];

  static readonly AUTH_SECRET_KEY_LENGTH = 16;
  static readonly AUTH_RANDOM_KEY_LENGTH = 16;
}