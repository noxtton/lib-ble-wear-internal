import { Buffer } from 'buffer';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BleManager, Device, } from 'react-native-ble-plx';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const BluetoothApp = () => {
  const [bleManager] = useState(new BleManager());
  type BLEDevice = Device & { type: string };
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [connectedBleDevice, setConnectedBleDevice] = useState<Device | null>(null);
  const [isBleScanining, setIsBleScanning] = useState(false);
  const [bleState, setBleState] = useState('Unknown');
  
  const [classicDevices, setClassicDevices] = useState([]);
  const [bondedDevices, setBondedDevices] = useState([]);
  const [connectedClassicDevice, setConnectedClassicDevice] = useState(null);
  const [isClassicScanning, setIsClassicScanning] = useState(false);
  const [classicEnabled, setClassicEnabled] = useState(false);
  
  const [isMiBandDevice, setIsMiBandDevice] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authProgress, setAuthProgress] = useState('');
  const [miBandData, setMiBandData] = useState({
    battery: null,
    steps: null,
    heartRate: null,
    deviceInfo: null,
    time: null
  });
  const [isExtractingData, setIsExtractingData] = useState(false);
  
  const [receivedData, setReceivedData] = useState('');
  const [serviceUUID, setServiceUUID] = useState('');
  const [characteristicUUID, setCharacteristicUUID] = useState('');
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [, setAvailableCharacteristics] = useState([]);
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);

  const MI_BAND_SERVICES = {
    MAIN: '0000fee0-0000-1000-8000-00805f9b34fb',
    SECONDARY: '0000fee1-0000-1000-8000-00805f9b34fb',
    HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
    BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
    DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb',
    ALERT: '00001802-0000-1000-8000-00805f9b34fb'
  };

  const MI_BAND_CHARACTERISTICS = {
    AUTH: '00000009-0000-3512-2118-0009af100700',
    STEPS: '00000007-0000-3512-2118-0009af100700',
    BATTERY_INFO: '00000006-0000-3512-2118-0009af100700',
    DEVICE_EVENT: '00000010-0000-3512-2118-0009af100700',
    USER_INFO: '00000008-0000-3512-2118-0009af100700',
    CONTROL_POINT: '00000004-0000-3512-2118-0009af100700',
    ACTIVITY_DATA: '00000005-0000-3512-2118-0009af100700',
    FIRMWARE_DATA: '00000016-0000-3512-2118-0009af100700',
    LE_PARAMS: '00000019-0000-3512-2118-0009af100700',
    DATE_TIME: '00000002-0000-3512-2118-0009af100700',
    
    HEART_RATE_MEASURE: '00002a37-0000-1000-8000-00805f9b34fb',
    HEART_RATE_CONTROL: '00002a39-0000-1000-8000-00805f9b34fb',
    
    BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
    
    MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
    MODEL_NUMBER: '00002a24-0000-1000-8000-00805f9b34fb',
    SERIAL_NUMBER: '00002a25-0000-1000-8000-00805f9b34fb',
    FIRMWARE_VERSION: '00002a26-0000-1000-8000-00805f9b34fb',
    HARDWARE_VERSION: '00002a27-0000-1000-8000-00805f9b34fb',
    SOFTWARE_VERSION: '00002a28-0000-1000-8000-00805f9b34fb'
  };

  useEffect(() => {
    initializeBluetooth();
    
    const subscription = bleManager.onStateChange((state) => {
      setBleState(state);
      if (state === 'PoweredOn') {
        console.log('BLE is ready');
        subscription.remove();
      }
    }, true);

    return () => {
      bleManager.destroy();
    };
  }, []);

  const initializeBluetooth = async () => {
    await requestPermissions();
    
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      setClassicEnabled(enabled);
      
      if (enabled) {
        loadBondedDevices();
      }
    } catch (error) {
      console.error('Classic Bluetooth initialization error:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        ]);

        const allPermissionsGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allPermissionsGranted) {
          Alert.alert('Permissions required', 'Bluetooth permissions are required for this app to work');
        }
      } catch (err) {
        console.warn('Permission request error:', err);
      }
    }
  };

  const startBleScan = () => {
    if (bleState !== 'PoweredOn') {
      Alert.alert('Bluetooth Error', 'Please turn on Bluetooth');
      return;
    }

    setBleDevices([]);
    setIsBleScanning(true);

    if (scanTimeout.current) {
      clearTimeout(scanTimeout.current);
    }

    bleManager.startDeviceScan(null, null, (error, device) => {
      console.log("device found:", device ? device.name : 'Unnamed', device ? device.id : 'No ID');
      if (error) {
        console.error('BLE Scan error:', error);
      
        setIsBleScanning(false);
        return;
      }

      if (device && device.name) {
        setBleDevices(prevDevices => {
          const exists = prevDevices.find(d => d.id === device.id);
          if (exists) return prevDevices;
          return [...prevDevices, Object.assign(device, { type: 'BLE' }) as BLEDevice];
        });
      }
    });

    scanTimeout.current = setTimeout(() => {
      stopBleScan();
    }, 10000);
  };

  const stopBleScan = () => {
    bleManager.stopDeviceScan();
    setIsBleScanning(false);
    if (scanTimeout.current) {
      clearTimeout(scanTimeout.current);
      scanTimeout.current = null;
    }
  };

  const connectToBleDevice = async (device: { name: string; id: string; }) => {
    try {
      console.log('Connecting to BLE device:', device.name);
      
      const connectedDev = await bleManager.connectToDevice(device.id);
      setConnectedBleDevice(connectedDev);
      
      console.log('Connected to BLE device:', connectedDev);
      const newConnectedDevice = new Device(connectedDev, bleManager);

      newConnectedDevice.writeCharacteristicWithResponseForService(
        MI_BAND_CHARACTERISTICS.AUTH,
        MI_BAND_SERVICES.SECONDARY,
        Buffer.from([0x01, 0x00]).toString('base64')
      ).then((res) => { console.log(res); }).catch(err => console.log(err));

      const lol = await newConnectedDevice.discoverAllServicesAndCharacteristics();
      console.log('Discovered services and characteristics:', lol);
      const services = await connectedDev.services();
      console.log('Available services:', services.map(s => s.uuid));
      setAvailableServices(services);
      
      const isMiBand = services.some(service => 
        service.uuid.toLowerCase() === MI_BAND_SERVICES.MAIN.toLowerCase() ||
        device.name.toLowerCase().includes('mi band') ||
        device.name.toLowerCase().includes('xiaomi')
      );
      
      setIsMiBandDevice(isMiBand);
      
      if (isMiBand) {
        Alert.alert('Mi Band Detected', `Connected to Mi Band: ${device.name || 'Unknown Device'}. Ready for authentication.`);
        setAuthProgress('Connected to Mi Band. Click "Authenticate" to proceed.');
      } else {
        Alert.alert('Success', `Connected to BLE device: ${device.name || 'Unknown Device'}`);
      }
      
    } catch (error) {
      console.error('BLE Connection error:', error);
      if (error instanceof Error) {
        Alert.alert('BLE Connection Error', error.message);
      } else {
        Alert.alert('BLE Connection Error', String(error));
      }
    }
  };

const discoverMiBandServices = async (device: Device) => {
  try {
    console.log('Starting Mi Band service discovery...');
    
    await device.discoverAllServicesAndCharacteristics();
    const services = await device.services();
    
    console.log('Available services:', services.map((s: { uuid: any; }) => s.uuid));
    
    const serviceMap: { [uuid: string]: any[] } = {};
    
    for (const service of services) {
      try {
        const characteristics = await device.characteristicsForService(service.uuid);
        serviceMap[service.uuid] = characteristics.map((char: { uuid: any; isReadable: any; isWritableWithResponse: any; isWritableWithoutResponse: any; isNotifiable: any; }) => ({
          uuid: char.uuid,
          isReadable: char.isReadable,
          isWritableWithResponse: char.isWritableWithResponse,
          isWritableWithoutResponse: char.isWritableWithoutResponse,
          isNotifiable: char.isNotifiable
        }));
        
        console.log(`Service ${service.uuid} characteristics:`, 
          serviceMap[service.uuid].map((c: { uuid: any; }) => c.uuid));
      } catch (error) {
        console.log(
          `Error getting characteristics for service ${service.uuid}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    
    return serviceMap;
  } catch (error) {
    console.error('Service discovery error:', error);
    throw error;
  }
};


  const authenticateMiBand = async () => {
  if (!connectedBleDevice || !isMiBandDevice) {
    Alert.alert('Error', 'Please connect to a Mi Band device first');
    return;
  }

  try {
    setAuthProgress('Discovering Mi Band services...');
    
    const serviceMap = await discoverMiBandServices(connectedBleDevice);
    
    let authService = null;
    let authChar = null;
    
    const possibleAuthServices = [
      '0000fee1-0000-1000-8000-00805f9b34fb', 
      '0000fee0-0000-1000-8000-00805f9b34fb',   
      '00001530-0000-3512-2118-0009af100700', 
    ];
    
    const possibleAuthChars = [
      '00000009-0000-3512-2118-0009af100700',
      '00000002-0000-3512-2118-0009af100700',
      '00000001-0000-3512-2118-0009af100700',
    ];
    
    for (const serviceUuid of possibleAuthServices) {
      if (serviceMap[serviceUuid]) {
        for (const authCharUuid of possibleAuthChars) {
          const foundChar = serviceMap[serviceUuid].find((char: { uuid: string; }) => 
            char.uuid.toLowerCase() === authCharUuid.toLowerCase()
          );
          
          if (foundChar && foundChar.isWritableWithResponse) {
            authService = serviceUuid;
            authChar = authCharUuid;
            console.log(`Found auth characteristic: ${authChar} in service: ${authService}`);
            break;
          }
        }
        if (authService && authChar) break;
      }
    }
    
    if (!authService || !authChar) {
      for (const [serviceUuid, chars] of Object.entries(serviceMap)) {
        if (serviceUuid.includes('fee') || serviceUuid.includes('1530')) {
          const writableChar = chars.find((char: { isWritableWithResponse: any; }) => char.isWritableWithResponse);
          if (writableChar) {
            authService = serviceUuid;
            authChar = writableChar.uuid;
            console.log(`Using fallback auth characteristic: ${authChar} in service: ${authService}`);
            break;
          }
        }
      }
    }
    
    if (!authService || !authChar) {
      throw new Error('No suitable authentication characteristic found. Available services: ' + 
        Object.keys(serviceMap).join(', '));
    }
    
    setAuthProgress(`Found auth service: ${authService}`);
    
    console.log(`Attempting authentication with service: ${authService}, char: ${authChar}`);
    
    const authSequences = [
      [0x01, 0x00], 
      [0x02, 0x00], 
      [0x01, 0x08], 
      [0x02, 0x08], 
    ];
    
    let authSuccess = false;
    
    for (const [index, authBytes] of authSequences.entries()) {
      try {
        setAuthProgress(`Trying authentication sequence ${index + 1}/${authSequences.length}...`);
        
        const authKey = Buffer.from(authBytes);
        const authKeyBase64 = authKey.toString('base64');
        
        connectedBleDevice.writeCharacteristicWithResponseForService(
          authService,
          authChar,
          authKeyBase64
        );
        
        console.log(`Authentication sequence ${index + 1} sent successfully`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const response = await connectedBleDevice.readCharacteristicForService(
            authService,
            authChar
          );
          
          if (response.value) {
            const responseData = Buffer.from(response.value, 'base64');
            console.log('Auth response:', Array.from(responseData).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
            
            if (responseData.length > 0 && responseData[0] !== 0x00) {
              authSuccess = true;
              break;
            }
          }
        } catch (readError) {
          if (readError instanceof Error) {
            console.log('Could not read auth response:', readError.message);
          } else {
            console.log('Could not read auth response:', String(readError));
          }
          authSuccess = true;
          break;
        }
        
      } catch (writeError) {
        if (writeError instanceof Error) {
          console.log(`Authentication sequence ${index + 1} failed:`, writeError.message);
        } else {
          console.log(`Authentication sequence ${index + 1} failed:`, String(writeError));
        }
        if (index === authSequences.length - 1) {
          throw writeError;
        }
      }
    }
    
    if (authSuccess) {
      setAuthProgress('Authentication completed!');
      setIsAuthenticated(true);
      
      setServiceUUID(authService);
      setCharacteristicUUID(authChar);
      
      Alert.alert('Success', 'Mi Band 6 authenticated successfully! You can now extract measurements.');
    } else {
      throw new Error('All authentication sequences failed');
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    setAuthProgress('Authentication failed: ' + error.message);
    Alert.alert('Authentication Failed', `Error: ${error.message}\n\nTip: Make sure the Mi Band is not connected to the Mi Fit app and try again.`);
  }
};

const extractAllMeasurements = async () => {
  if (!connectedBleDevice || !isMiBandDevice) {
    Alert.alert('Error', 'Please connect to a Mi Band device first');
    return;
  }

  setIsExtractingData(true);
  const newData = { ...miBandData };

  try {
    const serviceMap = await discoverMiBandServices(connectedBleDevice);
    
    try {
      const batteryService = '0000180f-0000-1000-8000-00805f9b34fb';
      const batteryChar = '00002a19-0000-1000-8000-00805f9b34fb';
      
      if (serviceMap[batteryService]?.find((c: { uuid: string; }) => c.uuid.toLowerCase() === batteryChar.toLowerCase())) {
        const batteryCharacteristic = await connectedBleDevice.readCharacteristicForService(
          batteryService,
          batteryChar
        );
        if (batteryCharacteristic.value) {
          const batteryLevel = Buffer.from(batteryCharacteristic.value, 'base64')[0];
          newData.battery = `${batteryLevel}%`;
          console.log('Battery level:', batteryLevel);
        }
      }
    } catch (error) {
      console.log('Battery read error:', error.message);
    }

    try {
      const deviceInfoService = '0000180a-0000-1000-8000-00805f9b34fb';
      const deviceInfoChars = {
        manufacturer: '00002a29-0000-1000-8000-00805f9b34fb',
        model: '00002a24-0000-1000-8000-00805f9b34fb',
        firmware: '00002a26-0000-1000-8000-00805f9b34fb',
        serial: '00002a25-0000-1000-8000-00805f9b34fb',
        hardware: '00002a27-0000-1000-8000-00805f9b34fb'
      };
      
      let deviceInfo = '';
      
      for (const [name, uuid] of Object.entries(deviceInfoChars)) {
        try {
          if (serviceMap[deviceInfoService]?.find((c: { uuid: string; }) => c.uuid.toLowerCase() === uuid.toLowerCase())) {
            const char = await connectedBleDevice.readCharacteristicForService(
              deviceInfoService,
              uuid
            );
            if (char.value) {
              const value = Buffer.from(char.value, 'base64').toString();
              deviceInfo += `${name.charAt(0).toUpperCase() + name.slice(1)}: ${value}\n`;
            }
          }
        } catch (error) {
          console.log(`${name} read error:`, error.message);
        }
      }
      
      if (deviceInfo) {
        newData.deviceInfo = deviceInfo.trim();
      }
      
    } catch (error) {
      console.log('Device info read error:', error.message);
    }

    if (isAuthenticated) {
      try {
        const possibleStepServices = [
          '0000fee0-0000-1000-8000-00805f9b34fb',
          '00001530-0000-3512-2118-0009af100700'
        ];
        
        const possibleStepChars = [
          '00000007-0000-3512-2118-0009af100700',
          '00000005-0000-3512-2118-0009af100700',
          '00000006-0000-3512-2118-0009af100700'
        ];
        
        for (const serviceUuid of possibleStepServices) {
          if (!serviceMap[serviceUuid]) continue;
          
          for (const charUuid of possibleStepChars) {
            try {
              const foundChar = serviceMap[serviceUuid].find((c: { uuid: string; }) => 
                c.uuid.toLowerCase() === charUuid.toLowerCase()
              );
              
              if (foundChar && foundChar.isReadable) {
                const stepsChar = await connectedBleDevice.readCharacteristicForService(
                  serviceUuid,
                  charUuid
                );
                
                if (stepsChar.value) {
                  const stepsData = Buffer.from(stepsChar.value, 'base64');
                  console.log('Steps data:', Array.from(stepsData).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
                  
                  if (stepsData.length >= 2) {
                    const steps = stepsData.readUInt16LE(0);
                    if (steps > 0 && steps < 100000) { 
                      newData.steps = steps;
                      break;
                    }
                  }
                  
                  if (stepsData.length >= 4) {
                    const steps = stepsData.readUInt32LE(0);
                    if (steps > 0 && steps < 100000) {
                      newData.steps = steps;
                      break;
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`Steps read error for ${charUuid}:`, error.message);
            }
          }
          
          if (newData.steps) break;
        }
      } catch (error) {
        console.log('Steps extraction error:', error.message);
      }
    }

    newData.time = new Date().toLocaleString();

    setMiBandData(newData);
    
    const extractedCount = Object.values(newData).filter(value => value !== null).length;
    Alert.alert('Success', `Extracted ${extractedCount} measurements from Mi Band 6!\n\n` +
      `Battery: ${newData.battery || 'N/A'}\n` +
      `Steps: ${newData.steps || 'N/A'}\n` +
      `Device Info: ${newData.deviceInfo ? 'Available' : 'N/A'}`);
    
  } catch (error) {
    console.error('Data extraction error:', error);
    Alert.alert('Extraction Error', error.message);
  } finally {
    setIsExtractingData(false);
  }
};

  const syncTime = async () => {
    if (!connectedBleDevice || !isMiBandDevice || !isAuthenticated) {
      Alert.alert('Error', 'Please authenticate with Mi Band first');
      return;
    }

    try {
      const now = new Date();
      const timeBytes = Buffer.allocUnsafe(12);
      
      timeBytes.writeUInt16LE(now.getFullYear(), 0);
      timeBytes.writeUInt8(now.getMonth() + 1, 2);
      timeBytes.writeUInt8(now.getDate(), 3);
      timeBytes.writeUInt8(now.getHours(), 4);
      timeBytes.writeUInt8(now.getMinutes(), 5);
      timeBytes.writeUInt8(now.getSeconds(), 6);
      timeBytes.writeUInt8(now.getDay() === 0 ? 7 : now.getDay(), 7); 
      timeBytes.writeUInt16LE(0, 8);
      timeBytes.writeUInt8(Math.round(now.getTimezoneOffset() / 15), 10);
      timeBytes.writeUInt8(0, 11); 
      
      const timeBase64 = timeBytes.toString('base64');
      
      await connectedBleDevice.writeCharacteristicWithResponseForService(
        MI_BAND_SERVICES.MAIN,
        MI_BAND_CHARACTERISTICS.DATE_TIME,
        timeBase64
      );
      
      Alert.alert('Success', 'Time synchronized with Mi Band');
      
    } catch (error) {
      console.error('Time sync error:', error);
      Alert.alert('Time Sync Error', error.message);
    }
  };

  const loadBondedDevices = async () => {
    try {
      const bonded = await RNBluetoothClassic.getBondedDevices();
      setBondedDevices(bonded.map(device => ({ ...device, type: 'Bonded' })));
    } catch (error) {
      console.error('Error loading bonded devices:', error);
    }
  };

  const startClassicScan = async () => {
    if (!classicEnabled) {
      Alert.alert('Bluetooth Error', 'Please enable Bluetooth');
      return;
    }

    try {
      setClassicDevices([]);
      setIsClassicScanning(true);
      
      const devices = await RNBluetoothClassic.startDiscovery();
      setClassicDevices(devices.map(device => ({ ...device, type: 'Classic' })));
      setIsClassicScanning(false);
      
    } catch (error) {
      console.error('Classic Bluetooth scan error:', error);
      setIsClassicScanning(false);
      Alert.alert('Scan Error', error.message);
    }
  };

  const connectToClassicDevice = async (device: { id: string; name: any; }) => {
    try {
      const connectedDevice = await RNBluetoothClassic.connectToDevice(device.id);
      setConnectedClassicDevice(connectedDevice);
      
      connectedDevice.onDataReceived((data) => {
        const timestamp = new Date().toLocaleTimeString();
        setReceivedData(prev => prev + `\n[${timestamp}] Classic: ${data.data}`);
      });
      
      Alert.alert('Success', `Connected to Classic device: ${device.name || 'Unknown Device'}`);
      
    } catch (error) {
      console.error('Classic Connection error:', error);
      Alert.alert('Classic Connection Error', error.message);
    }
  };

  const disconnectAll = async () => {
    try {
      if (connectedBleDevice) {
        await bleManager.cancelDeviceConnection(connectedBleDevice.id);
        setConnectedBleDevice(null);
      }
      
      if (connectedClassicDevice) {
        await connectedClassicDevice.disconnect();
        setConnectedClassicDevice(null);
      }
      
      setIsMiBandDevice(false);
      setIsAuthenticated(false);
      setAuthProgress('');
      setMiBandData({
        battery: null,
        steps: null,
        heartRate: null,
        deviceInfo: null,
        time: null
      });
      
      setReceivedData('');
      setAvailableServices([]);
      setAvailableCharacteristics([]);
      setServiceUUID('');
      setCharacteristicUUID('');
      
      Alert.alert('Disconnected', 'All devices disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const exploreService = async (serviceUUID: React.SetStateAction<string>) => {
    if (!connectedBleDevice) return;
    
    try {
      const characteristics = await connectedBleDevice.characteristicsForService(serviceUUID);
      setAvailableCharacteristics(characteristics);
      setServiceUUID(serviceUUID);
    } catch (error) {
      console.error('Service exploration error:', error);
    }
  };

  const decodeBase64Data = (base64Data: string, serviceUUID = '', characteristicUUID = '') => {
    try {
      const decodedData = atob(base64Data);
      
      if (serviceUUID.toLowerCase().includes('180f') && 
          characteristicUUID.toLowerCase().includes('2a19')) {
        if (decodedData.length === 1) {
          const batteryLevel = decodedData.charCodeAt(0);
          return `Battery Level: ${batteryLevel}%`;
        }
      }
      
      if (characteristicUUID.toLowerCase().includes('2a25')) {
        return `Serial Number: ${decodedData}`;
      }
      
      if (characteristicUUID.toLowerCase().includes('2a29')) {
        return `Manufacturer: ${decodedData}`;
      }
      
      if (characteristicUUID.toLowerCase().includes('2a24')) {
        return `Model Number: ${decodedData}`;
      }
      
      const printableChars = decodedData.split('').filter(char => {
        const code = char.charCodeAt(0);
        return code >= 32 && code <= 126;
      });
      
      if (printableChars.length / decodedData.length > 0.7) {
        return `Text: ${decodedData}`;
      }
      
      const bytes = Array.from(decodedData).map(char => char.charCodeAt(0));
      
      if (bytes.length === 1) {
        const value = bytes[0];
        return `Decimal: ${value} | Hex: 0x${value.toString(16).padStart(2, '0')}`;
      } else if (bytes.length === 2) {
        const little_endian = bytes[0] | (bytes[1] << 8);
        const big_endian = (bytes[0] << 8) | bytes[1];
        const hexString = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
        return `LE: ${little_endian} | BE: ${big_endian} | Hex: ${hexString}`;
      } else {
        const hexString = bytes.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(' ');
        return `${bytes.length} bytes | Hex: ${hexString}${bytes.length > 8 ? '...' : ''}`;
      }
      
    } catch (error) {
      return `Error decoding: ${error.message}`;
    }
  };

  const readBleCharacteristic = async () => {
    if (!connectedBleDevice || !serviceUUID || !characteristicUUID) {
      Alert.alert('Error', 'Please ensure BLE device is connected and UUIDs are provided');
      return;
    }

    try {
      const characteristic = await connectedBleDevice.readCharacteristicForService(
        serviceUUID,
        characteristicUUID
      );
      
      const data = characteristic.value;
      if (data) {
        const readableData = decodeBase64Data(data, serviceUUID, characteristicUUID);
        const timestamp = new Date().toLocaleTimeString();
        setReceivedData(prev => prev + `\n[${timestamp}] BLE: ${readableData}`);
      } else {
        setReceivedData('No data received');
      }
    } catch (error) {
      console.error('BLE Read error:', error);
      Alert.alert('BLE Read Error', error instanceof Error ? error.message : String(error));
    }
  };

  const writeToClassicDevice = async (data: string) => {
    if (!connectedClassicDevice) {
      Alert.alert('Error', 'No Classic Bluetooth device connected');
      return;
    }

    try {
      await connectedClassicDevice.write(data);
      Alert.alert('Success', 'Data sent to Classic device');
    } catch (error) {
      console.error('Classic write error:', error);
      Alert.alert('Write Error', error.message);
    }
  };

  interface DeviceItem {
    id: string;
    name?: string;
    type: string;
    rssi?: number;
    [key: string]: any;
  }

  const renderDevice = ({ item }: { item: DeviceItem }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
        <Text style={[
          styles.deviceType, 
          { color: item.type === 'BLE' ? '#4CAF50' : item.type === 'Classic' ? '#2196F3' : '#FF9800' }
        ]}>
          Type: {item.type}
        </Text>
        {item.rssi && <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>}
        {item.name && (item.name.toLowerCase().includes('mi band') || item.name.toLowerCase().includes('xiaomi')) && (
          <Text style={styles.miBandIndicator}>🎯 Mi Band Device</Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.connectButton,
          { backgroundColor: item.type === 'BLE' ? '#4CAF50' : '#2196F3' }
        ]}
        onPress={() => {
          if (item.type === 'BLE') {
            connectToBleDevice(item);
          } else {
            connectToClassicDevice(item);
          }
        }}
      >
        <Text style={styles.buttonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );

  const allDevices = [...bleDevices, ...classicDevices, ...bondedDevices];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mi Band Bluetooth Manager</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>BLE Status: {bleState}</Text>
        <Text style={styles.statusText}>Classic BT: {classicEnabled ? 'Enabled' : 'Disabled'}</Text>
        {connectedBleDevice && (
          <View>
            <Text style={styles.connectedText}>
              BLE Connected: {connectedBleDevice.name || 'Unknown'}
            </Text>
            <Text style={styles.deviceId}>MAC: {connectedBleDevice.id}</Text>
            {isMiBandDevice && (
              <Text style={styles.miBandStatus}>
                Mi Band: {isAuthenticated ? '✅ Authenticated' : '⏳ Not Authenticated'}
              </Text>
            )}
          </View>
        )}
        {connectedClassicDevice && (
          <Text style={styles.connectedText}>
            Classic Connected: {connectedClassicDevice.name || 'Unknown'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Scanning</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, isBleScanining && styles.buttonDisabled]}
            onPress={startBleScan}
            disabled={isBleScanining}
          >
            <Text style={styles.buttonText}>
              {isBleScanining ? 'BLE Scanning...' : 'Scan BLE'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, isClassicScanning && styles.buttonDisabled]}
            onPress={startClassicScan}
            disabled={isClassicScanning}
          >
            <Text style={styles.buttonText}>
              {isClassicScanning ? 'Classic Scanning...' : 'Scan Classic'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={loadBondedDevices}>
            <Text style={styles.buttonText}>Reload Bonded</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              stopBleScan();
              setBleDevices([]);
              setClassicDevices([]);
            }}
          >
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          All Devices ({allDevices.length})
        </Text>
        <Text style={styles.infoText}>
          🔵 BLE • 🟢 Classic • 🟡 Bonded • 🎯 Mi Band
        </Text>
        <FlatList
          data={allDevices}
          renderItem={renderDevice}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          style={styles.deviceList}
          scrollEnabled={true}
        />
      </View>

      {isMiBandDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Band Authentication</Text>
          {authProgress ? (
            <Text style={styles.authProgress}>{authProgress}</Text>
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#FF5722' }]}
              onPress={authenticateMiBand}
              disabled={isAuthenticated}
            >
              <Text style={styles.buttonText}>
                {isAuthenticated ? 'Authenticated ✅' : 'Authenticate'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#9C27B0' }]}
              onPress={syncTime}
              disabled={!isAuthenticated}
            >
              <Text style={styles.buttonText}>Sync Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isMiBandDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Band Measurements</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#4CAF50' }, isExtractingData && styles.buttonDisabled]}
            onPress={extractAllMeasurements}
            disabled={isExtractingData}
          >
            <Text style={styles.buttonText}>
              {isExtractingData ? 'Extracting Data...' : 'Extract All Measurements'}
            </Text>
          </TouchableOpacity>
          
          {Object.values(miBandData).some(value => value !== null) && (
            <View style={styles.dataDisplay}>
              {miBandData.battery && (
                <Text style={styles.dataItem}>🔋 Battery: {miBandData.battery}</Text>
              )}
              {miBandData.steps && (
                <Text style={styles.dataItem}>👣 Steps: {miBandData.steps}</Text>
              )}
              {miBandData.heartRate && (
                <Text style={styles.dataItem}>💓 Heart Rate: {miBandData.heartRate}</Text>
              )}
              {miBandData.deviceInfo && (
                <Text style={styles.dataItem}>📱 Device Info:{'\n'}{miBandData.deviceInfo}</Text>
              )}
              {miBandData.time && (
                <Text style={styles.dataItem}>🕒 Last Updated: {miBandData.time}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {connectedBleDevice && availableServices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BLE Services</Text>
          <ScrollView style={styles.serviceList} nestedScrollEnabled={true}>
            {availableServices.map((service, index) => (
              <TouchableOpacity
                key={index}
                style={styles.serviceItem}
                onPress={() => exploreService(service.uuid)}
              >
                <Text style={styles.serviceUUID}>{service.uuid}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {connectedBleDevice && !isMiBandDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual BLE Control</Text>
          <TextInput
            style={styles.input}
            placeholder="Service UUID"
            value={serviceUUID}
            onChangeText={setServiceUUID}
          />
          <TextInput
            style={styles.input}
            placeholder="Characteristic UUID"
            value={characteristicUUID}
            onChangeText={setCharacteristicUUID}
          />
          <TouchableOpacity style={styles.button} onPress={readBleCharacteristic}>
            <Text style={styles.buttonText}>Read BLE Characteristic</Text>
          </TouchableOpacity>
        </View>
      )}

      {connectedClassicDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classic Bluetooth Control</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => writeToClassicDevice('Hello Classic!')}
            >
              <Text style={styles.buttonText}>Send Test Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => writeToClassicDevice('AT+GMR\r\n')}
            >
              <Text style={styles.buttonText}>Send AT Command</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {(connectedBleDevice || connectedClassicDevice) && (
        <TouchableOpacity style={styles.disconnectButton} onPress={disconnectAll}>
          <Text style={styles.buttonText}>Disconnect All</Text>
        </TouchableOpacity>
      )}

      {receivedData ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Received Data</Text>
          <ScrollView style={styles.dataContainer}>
            <Text style={styles.dataText}>{receivedData}</Text>
          </ScrollView>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setReceivedData('')}
          >
            <Text style={styles.buttonText}>Clear Data</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  connectedText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  miBandStatus: {
    fontSize: 14,
    color: '#FF5722',
    fontWeight: 'bold',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 15,
    marginHorizontal: 15,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceType: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  miBandIndicator: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: 'bold',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
  },
  authProgress: {
    fontSize: 14,
    color: '#FF5722',
    fontStyle: 'italic',
    marginBottom: 10,
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
  },
  dataDisplay: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  dataItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  dataContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    maxHeight: 150,
    marginBottom: 10,
  },
  dataText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  serviceList: {
    maxHeight: 200,
  },
  serviceItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
    marginBottom: 5,
    borderRadius: 4,
  },
  serviceUUID: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
});

export default BluetoothApp;