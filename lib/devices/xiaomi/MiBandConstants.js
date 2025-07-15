export class MiBandConstants {
}
MiBandConstants.SERVICE_MIBAND = 'fee0';
MiBandConstants.SERVICE_MIBAND2 = 'fee1';
MiBandConstants.SERVICE_HEART_RATE = '180d';
MiBandConstants.SERVICE_IMMEDIATE_ALERT = '1802';
MiBandConstants.SERVICE_DEVICE_INFO = '180a';
MiBandConstants.CHAR_AUTH = 'ff01';
MiBandConstants.CHAR_HEART_RATE_MEASURE = '2a39';
MiBandConstants.CHAR_HEART_RATE_DATA = '2a37';
MiBandConstants.CHAR_STEPS = 'ff06';
MiBandConstants.CHAR_ACTIVITY_DATA = 'ff04';
MiBandConstants.CHAR_NOTIFICATION = 'ff03';
MiBandConstants.CHAR_DEVICE_INFO = 'ff01';
MiBandConstants.CHAR_BATTERY = 'ff0c';
MiBandConstants.CHAR_TIME = 'ff0a';
MiBandConstants.CMD_AUTH_REQUEST = 0x01;
MiBandConstants.CMD_AUTH_CONFIRM = 0x02;
MiBandConstants.CMD_START_HEART_RATE_MANUAL = 0x15;
MiBandConstants.CMD_STOP_HEART_RATE_MANUAL = 0x16;
MiBandConstants.CMD_NOTIFICATION = 0x05;
MiBandConstants.CMD_SET_TIME = 0x0a;
MiBandConstants.CMD_GET_STEPS = 0x06;
MiBandConstants.CMD_GET_ACTIVITY = 0x04;
MiBandConstants.RESPONSE_HEART_RATE = 0x10;
MiBandConstants.RESPONSE_ACTIVITY_DATA = 0x04;
MiBandConstants.RESPONSE_REALTIME_STEPS = 0x06;
MiBandConstants.RESPONSE_AUTH_SUCCESS = 0x10;
MiBandConstants.RESPONSE_AUTH_FAIL = 0x11;
MiBandConstants.CCCD_UUID = '2902';
MiBandConstants.HEART_RATE_SERVICE_UUID = '180d';
MiBandConstants.HEART_RATE_MEASUREMENT_UUID = '2a37';
MiBandConstants.HEART_RATE_CONTROL_POINT_UUID = '2a39';
MiBandConstants.MIBAND_NAME_PATTERNS = [
    'mi band',
    'miband',
    'xiaomi',
    'mi smart band'
];
MiBandConstants.AUTH_SECRET_KEY_LENGTH = 16;
MiBandConstants.AUTH_RANDOM_KEY_LENGTH = 16;
