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
import { BleManager } from 'react-native-ble-plx';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const BluetoothApp = () => {
  const [bleManager] = useState(new BleManager());
  type DeviceType = {
    id: string;
    name?: string;
    type: string;
    address?: string;
    rssi?: number;
    bonded?: boolean;
    connected?: boolean;
    deviceClass?: string;
  };

  const [bleDevices, setBleDevices] = useState<DeviceType[]>([]);
  const [connectedBleDevice, setConnectedBleDevice] = useState<any>(null);
  const [isBleScanining, setIsBleScanning] = useState(false);
  const [bleState, setBleState] = useState('Unknown');
  
  const [classicDevices, setClassicDevices] = useState<DeviceType[]>([]);
  const [bondedDevices, setBondedDevices] = useState<DeviceType[]>([]);
  const [connectedClassicDevice, setConnectedClassicDevice] = useState<any>(null);
  const [isClassicScanning, setIsClassicScanning] = useState(false);
  const [classicEnabled, setClassicEnabled] = useState(false);
  
  const [receivedData, setReceivedData] = useState('');
  const [serviceUUID, setServiceUUID] = useState('');
  const [characteristicUUID, setCharacteristicUUID] = useState('');
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableCharacteristics, setAvailableCharacteristics] = useState([]);
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeBluetooth();

    const subscription = bleManager.onStateChange((state) => {
      setBleState(state);
      if (state === 'PoweredOn') {
        console.log('BLE is ready');
      }
    }, true);

    return () => {
      subscription.remove();
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
      if (error) {
        console.error('BLE Scan error:', error);
        setIsBleScanning(false);
        return;
      }

      if (device && device.name) {
        setBleDevices(prevDevices => {
          const exists = prevDevices.find(d => d.id === device.id);
          if (exists) return prevDevices;
          return [
            ...prevDevices,
            {
              ...device,
              type: 'BLE',
              name: device.name === null ? undefined : device.name,
            } as DeviceType
          ];
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

  const connectToBleDevice = async (device) => {
    try {
      console.log('Connecting to BLE device:', device.name);
      
      const connectedDev = await bleManager.connectToDevice(device.id);
      setConnectedBleDevice(connectedDev);
      
      await connectedDev.discoverAllServicesAndCharacteristics();
      const services = await connectedDev.services();
      console.log('Available services:', services.map(s => s.uuid));
      setAvailableServices(services);
      
      Alert.alert('Success', `Connected to BLE device: ${device.name || 'Unknown Device'}`);
      
    } catch (error) {
      console.error('BLE Connection error:', error);
      Alert.alert('BLE Connection Error', error.message);
    }
  };

  const loadBondedDevices = async () => {
    try {
      const bonded = await RNBluetoothClassic.getBondedDevices();
      console.log('Bonded devices:', bonded);
      setBondedDevices(
                    bonded.map(device => ({
                      ...device,
                      type: 'Bonded',
                      rssi: typeof device.rssi === 'number' ? device.rssi : (device.rssi != null ? Number(device.rssi) : undefined),
                      bonded: !!device.bonded, 
                    }))
                  );
    } catch (error) {
      console.error('Error loading bonded devices:', error);
    }
  };

  const showDeviceDebugInfo = (device) => {
    const debugInfo = `
Device Debug Info:
Name: ${device.name || 'Unknown'}
ID: ${device.id || 'N/A'}
Address: ${device.address || 'N/A'}
Type: ${device.type || 'N/A'}
Class: ${device.deviceClass || 'N/A'}
Bonded: ${device.bonded ? 'Yes' : 'No'}
Connected: ${device.connected ? 'Yes' : 'No'}

Common Issues:
- Some watches only accept connections from specific apps
- Device might be connected to another app/phone
- Try unpairing and re-pairing the device
- Some devices require specific Bluetooth profiles
    `;
    
    Alert.alert('Device Debug Info', debugInfo, [
      { text: 'OK' },
      { text: 'Try Force Connect', onPress: () => forceConnectDevice(device) },
      { text: 'Check Connection', onPress: () => checkDeviceConnection(device) }
    ]);
  };

  const forceConnectDevice = async (device) => {
    try {
      setReceivedData(prev => prev + `\n🔧 Force connecting to ${device.name}...`);
      
      const connectionMethods = [
        async () => await RNBluetoothClassic.connectToDevice(device.id),
        async () => await RNBluetoothClassic.connectToDevice(device.address || device.id),
        async () => await RNBluetoothClassic.connectToDevice(device.id, { 
          delimiter: '\r\n',
          timeout: 10000 
        })
      ];
      
      for (let i = 0; i < connectionMethods.length; i++) {
        try {
          setReceivedData(prev => prev + `\n🔄 Method ${i + 1}...`);
          const connected = await connectionMethods[i]();
          if (connected) {
            setConnectedClassicDevice(connected);
            setReceivedData(prev => prev + `\n✅ Force connect method ${i + 1} succeeded!`);
            Alert.alert('Success!', `Force connection method ${i + 1} worked!`);
            return;
          }
        } catch (methodError) {
          setReceivedData(prev => prev + `\n❌ Method ${i + 1} failed: ${methodError.message}`);
        }
      }
      
      setReceivedData(prev => prev + `\n❌ All force connection methods failed`);
      Alert.alert('Force Connect Failed', 'All connection methods failed. The device might not support incoming connections.');
      
    } catch (error) {
      console.error('Force connect error:', error);
      Alert.alert('Force Connect Error', error.message);
    }
  };

  const checkDeviceConnection = async (device) => {
    try {
      setReceivedData(prev => prev + `\n🔍 Checking ${device.name} connection status...`);

      const isConnected = await RNBluetoothClassic.isDeviceConnected(device.id);
      setReceivedData(prev => prev + `\n📊 Device connected: ${isConnected}`);
      
      if (isConnected) {
        Alert.alert('Device Status', 'Device is already connected! Try using it directly.');

        try {
          const connectedDevice = await RNBluetoothClassic.getConnectedDevice(device.id);
          setConnectedClassicDevice(connectedDevice);
        } catch (getError) {
          console.log('Could not get connected device object:', getError);
        }
      } else {
        Alert.alert('Device Status', 'Device is not connected. Connection issues might be:\n• Device is off or out of range\n• Device is connected to another app\n• Device doesn\'t support incoming connections');
      }
      
    } catch (error) {
      setReceivedData(prev => prev + `\n❌ Status check error: ${error.message}`);
      Alert.alert('Status Check Failed', `Could not check device status: ${error.message}`);
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
      console.log('Classic devices found:', devices);
      
      setClassicDevices(
              devices.map(device => ({
                ...device,
                type: 'Classic',
                rssi: typeof device.rssi === 'number' ? device.rssi : (device.rssi != null ? Number(device.rssi) : undefined),
                bonded: !!device.bonded, 
              }))
            );
      setIsClassicScanning(false);
      
    } catch (error) {
      console.error('Classic Bluetooth scan error:', error);
      setIsClassicScanning(false);
      Alert.alert('Scan Error', error.message);
    }
  };

  const connectToClassicDevice = async (device) => {
    try {
      console.log('Connecting to Classic device:', device.name, 'ID:', device.id);
      setReceivedData(prev => prev + `\n🔄 Attempting to connect to ${device.name}...`);
      

      if (isKnownFitnessTracker(device.name)) {
        setReceivedData(prev => prev + `\n🏃 Detected fitness tracker: ${device.name}`);
        setReceivedData(prev => prev + `\n⚠️  This device likely only connects to its official app`);
        setReceivedData(prev => prev + `\n🔄 Attempting BLE connection instead...`);
        
        await tryBleConnectionForTracker(device);
        return;
      }
      

      let connectedDevice;
      try {
        connectedDevice = await RNBluetoothClassic.connectToDevice(device.id);
        setReceivedData(prev => prev + `\n✅ Connected using direct method`);
      } catch (directError) {
        console.log('Direct connection failed, trying alternative methods...', directError.message);
        setReceivedData(prev => prev + `\n❌ Direct connection failed: ${directError.message}`);
        

        try {
          const connectionOptions = {
            delimiter: '\n',
            deviceType: 'classic'
          };
          connectedDevice = await RNBluetoothClassic.connectToDevice(device.id, connectionOptions);
          setReceivedData(prev => prev + `\n✅ Connected using options method`);
        } catch (optionsError) {
          console.log('Options connection failed, trying paired device method...', optionsError.message);
          setReceivedData(prev => prev + `\n❌ Options connection failed: ${optionsError.message}`);
          
          try {
            connectedDevice = await RNBluetoothClassic.connectToDevice(device.address || device.id);
            setReceivedData(prev => prev + `\n✅ Connected using address method`);
          } catch (addressError) {
            setReceivedData(prev => prev + `\n❌ All connection methods failed`);
            
            const advice = getDeviceSpecificAdvice(device.name);
            setReceivedData(prev => prev + `\n💡 ${advice}`);
            
            throw new Error(`Connection failed: ${addressError.message}`);
          }
        }
      }
      
      if (connectedDevice) {
        setConnectedClassicDevice(connectedDevice);
        
        connectedDevice.onDataReceived((data) => {
          const timestamp = new Date().toLocaleTimeString();
          setReceivedData(prev => prev + `\n[${timestamp}] Classic: ${data.data}`);
        });
        
        setReceivedData(prev => prev + `\n🧪 Testing connection...`);
        
        Alert.alert('Success', `Connected to Classic device: ${device.name || 'Unknown Device'}`);
      }
      
    } catch (error) {
      console.error('Classic Connection error:', error);
      const errorMessage = error.message || 'Unknown error';
      setReceivedData(prev => prev + `\n❌ Final error: ${errorMessage}`);
      
      let helpMessage = getConnectionHelpMessage(errorMessage, device.name);
      
      Alert.alert(
        'Classic Connection Error', 
        `${errorMessage}\n\nSuggestion: ${helpMessage}`,
        [
          { text: 'OK' },
          { 
            text: 'Try BLE Instead', 
            onPress: () => tryBleConnectionForTracker(device)
          },
          { 
            text: 'Debug Info', 
            onPress: () => showDeviceDebugInfo(device) 
          }
        ]
      );
    }
  };

  const isKnownFitnessTracker = (deviceName) => {
    if (!deviceName) return false;
    
    const fitnessTrackers = [
      'xiaomi smart band',
      'mi band',
      'amazfit',
      'zepp',
      'huawei band',
      'samsung galaxy fit',
      'fitbit',
      'garmin',
      'apple watch'
    ];
    
    return fitnessTrackers.some(tracker => 
      deviceName.toLowerCase().includes(tracker.toLowerCase())
    );
  };

  const tryBleConnectionForTracker = async (device) => {
    try {
      setReceivedData(prev => prev + `\n🔄 Searching for ${device.name} via BLE...`);
      setReceivedData(prev => prev + `\n🎯 Target MAC: ${device.id}`);
      
      if (bleState !== 'PoweredOn') {
        setReceivedData(prev => prev + `\n❌ BLE not ready. Enable Bluetooth and try again.`);
        return;
      }

      setReceivedData(prev => prev + `\n📡 Starting BLE scan (15 seconds timeout)...`);
      
      let deviceFound = false;
      let scanTimeout;
      let devicesScanned = 0;
      
      try {
        setReceivedData(prev => prev + `\n🔗 Attempting direct BLE connection to bonded MAC...`);
        const directDevice = await bleManager.connectToDevice(device.id);
        setReceivedData(prev => prev + `\n✅ Direct BLE connection successful!`);
        deviceFound = true;
        setConnectedBleDevice(directDevice);
        
        await directDevice.discoverAllServicesAndCharacteristics();
        const services = await directDevice.services();
        setAvailableServices(services);
        
        Alert.alert('Success', `Connected to ${device.name} via direct BLE connection!`);
        return;
        
      } catch (directError) {
        setReceivedData(prev => prev + `\n❌ Direct connection failed: ${directError.message}`);
        setReceivedData(prev => prev + `\n🔍 Falling back to BLE scan...`);
      }
      
      bleManager.startDeviceScan(null, null, (error, bleDevice) => {
        if (error) {
          console.error('BLE Scan error:', error);
          setReceivedData(prev => prev + `\n❌ Scan error: ${error.message}`);
          return;
        }

        if (deviceFound) return;
        
        devicesScanned++;
        
        if (devicesScanned % 5 === 0) {
          setReceivedData(prev => prev + `\n📊 Scanned ${devicesScanned} devices...`);
        }

        if (bleDevice && bleDevice.id === device.id) {
          setReceivedData(prev => prev + `\n✅ Found EXACT MAC match: ${bleDevice.name} (${bleDevice.id})`);
          deviceFound = true;
          bleManager.stopDeviceScan();
          clearTimeout(scanTimeout);
          connectToBleDevice(bleDevice);
          return;
        }

        if (bleDevice && bleDevice.name && device.name && 
            bleDevice.name.toLowerCase() === device.name.toLowerCase()) {
          setReceivedData(prev => prev + `\n✅ Found exact name match: ${bleDevice.name} (${bleDevice.id})`);
          deviceFound = true;
          bleManager.stopDeviceScan();
          clearTimeout(scanTimeout);
          connectToBleDevice(bleDevice);
          return;
        }

        if (bleDevice && bleDevice.name && device.name) {
          const targetModel = extractModelNumber(device.name);
          const foundModel = extractModelNumber(bleDevice.name);
          
          if (targetModel && foundModel && targetModel === foundModel &&
              bleDevice.name.toLowerCase().includes('xiaomi')) {
            setReceivedData(prev => prev + `\n🎯 Found model match: ${bleDevice.name} (${bleDevice.id}) - Model ${foundModel}`);
            deviceFound = true;
            bleManager.stopDeviceScan();
            clearTimeout(scanTimeout);
            connectToBleDevice(bleDevice);
            return;
          }
        }

        if (bleDevice && bleDevice.name && 
            (bleDevice.name.toLowerCase().includes('xiaomi') || 
             bleDevice.name.toLowerCase().includes('band'))) {
          setReceivedData(prev => prev + `\n👁️  Found similar: ${bleDevice.name} (${bleDevice.id}) - not target`);
        }
      });

      scanTimeout = setTimeout(() => {
        bleManager.stopDeviceScan();
        if (!deviceFound) {
          setReceivedData(prev => prev + `\n⏱️  BLE scan timeout - ${device.name} not found in ${devicesScanned} devices`);
          setReceivedData(prev => prev + `\n💡 Device may not be in BLE discoverable mode`);
          
          Alert.alert(
            'BLE Scan Failed',
            `${device.name} not found via BLE scan.\n\nPossible solutions:\n• Device may be sleeping - try waking it up\n• Disconnect from Mi Fit/Zepp Life app first\n• Try manual BLE scan instead\n• Device might not support BLE discovery when paired`,
            [
              { text: 'OK' },
              { text: 'Try Manual BLE Scan', onPress: () => startBleScan() },
              { text: 'Wake Device Tips', onPress: () => showWakeDeviceTips(device) }
            ]
          );
        }
      }, 15000);

    } catch (error) {
      setReceivedData(prev => prev + `\n❌ BLE search failed: ${error.message}`);
    }
  };

  const showWakeDeviceTips = (device) => {
    Alert.alert(
      'Wake Device Tips',
      `To make ${device.name} discoverable:\n\n• Tap the screen or press the button\n• Check if it's connected to Mi Fit app (disconnect if so)\n• Try turning device off/on\n• Some devices only advertise BLE when not paired\n• Check device settings for "discoverable mode"`,
      [
        { text: 'Got it' },
        { text: 'Try Direct Connection', onPress: () => tryDirectBleConnection(device) }
      ]
    );
  };

  const tryDirectBleConnection = async (device) => {
    try {
      setReceivedData(prev => prev + `\n🔗 Attempting direct BLE connection (no scan)...`);
      setReceivedData(prev => prev + `\n🎯 Connecting directly to: ${device.id}`);
      
      const connectedDevice = await bleManager.connectToDevice(device.id, {
        requestMTU: 185,
        timeout: 10000
      });
      
      setReceivedData(prev => prev + `\n✅ Direct BLE connection successful!`);
      setConnectedBleDevice(connectedDevice);
      
      await connectedDevice.discoverAllServicesAndCharacteristics();
      const services = await connectedDevice.services();
      console.log('Available services:', services.map(s => s.uuid));
      setAvailableServices(services);
      
      Alert.alert('Success!', `Connected to ${device.name} via direct BLE connection!`);
      
    } catch (directError) {
      setReceivedData(prev => prev + `\n❌ Direct BLE connection failed: ${directError.message}`);
      Alert.alert(
        'Direct Connection Failed',
        `Could not connect directly: ${directError.message}\n\nThe device might:\n• Be out of range\n• Not support BLE connections\n• Require the official app\n• Be connected elsewhere`
      );
    }
  };

  const extractModelNumber = (deviceName) => {
    if (!deviceName) return null;
    
    const modelMatch = deviceName.match(/band\s+(\d+|pro|lite)/i);
    return modelMatch ? modelMatch[1].toLowerCase() : null;
  };

  const getDeviceSpecificAdvice = (deviceName) => {
    if (!deviceName) return "Try the official app for this device";
    
    const name = deviceName.toLowerCase();
    
    if (name.includes('xiaomi') || name.includes('mi band')) {
      return "Xiaomi devices only connect to Mi Fit or Zepp Life apps. Try using BLE instead.";
    } else if (name.includes('samsung')) {
      return "Samsung devices usually require Galaxy Wearable app. Try BLE connection.";
    } else if (name.includes('apple watch')) {
      return "Apple Watch only connects to paired iPhone. Cannot connect from other apps.";
    } else if (name.includes('fitbit')) {
      return "Fitbit devices only connect to official Fitbit app.";
    } else if (name.includes('amazfit') || name.includes('zepp')) {
      return "Amazfit/Zepp devices require Zepp app. Try BLE connection.";
    } else {
      return "This device may only accept connections from its official app. Try BLE connection.";
    }
  };

  const getConnectionHelpMessage = (errorMessage, deviceName) => {
    if (errorMessage.includes('read failed') || errorMessage.includes('timeout')) {
      return `Device rejected connection. ${getDeviceSpecificAdvice(deviceName)}`;
    } else if (errorMessage.includes('Device not found')) {
      return 'Device might be out of range or turned off';
    } else if (errorMessage.includes('Permission')) {
      return 'Check Bluetooth permissions';
    } else if (errorMessage.includes('Already connected')) {
      return 'Device might already be connected to another app';
    } else if (errorMessage.includes('Connection refused')) {
      return 'Device might not accept connections or require pairing';
    } else {
      return 'Try turning Bluetooth off/on, or re-pair the device';
    }
  };

  const exploreXiaomiAuth = async () => {
    if (!connectedBleDevice) return;
    
    try {
      setReceivedData(prev => prev + `\n🔐 Exploring Xiaomi authentication system...`);
      
      const authServiceUUID = '0000fe95-0000-1000-8000-00805f9b34fb';
      
      const services = await connectedBleDevice.services();
      const hasAuthService = services.find(s => s.uuid.toLowerCase().includes('fe95'));
      
      if (hasAuthService) {
        setReceivedData(prev => prev + `\n✅ Found Xiaomi auth service: ${hasAuthService.uuid}`);
        
        try {
          const characteristics = await connectedBleDevice.characteristicsForService(hasAuthService.uuid);
          setReceivedData(prev => prev + `\n📋 Auth service has ${characteristics.length} characteristics:`);
          
          for (let i = 0; i < characteristics.length; i++) {
            const char = characteristics[i];
            const props: string[] = [];
            if (char.isReadable) props.push('Read');
            if (char.isWritableWithResponse) props.push('Write');
            if (char.isNotifiable) props.push('Notify');
            
            setReceivedData(prev => prev + `\n   ${i+1}. ${char.uuid}`);
            setReceivedData(prev => prev + `\n      Properties: ${props.join(', ')}`);
            
            if (char.isReadable) {
              try {
                const data = await connectedBleDevice.readCharacteristicForService(hasAuthService.uuid, char.uuid);
                if (data.value) {
                  const decoded = decodeBase64Data(data.value);
                  const preview = decoded.length > 30 ? decoded.substring(0, 30) + '...' : decoded;
                  setReceivedData(prev => prev + `\n      Data: ${preview}`);
                }
              } catch (readError) {
                setReceivedData(prev => prev + `\n      Read failed: ${readError.message}`);
              }
            }
          }
          
        } catch (charError) {
          setReceivedData(prev => prev + `\n❌ Could not read auth characteristics: ${charError.message}`);
        }
        
      } else {
        setReceivedData(prev => prev + `\n❌ Xiaomi auth service (0xFE95) not found`);
        setReceivedData(prev => prev + `\n📋 Available services:`);
        services.forEach((service, i) => {
          setReceivedData(prev => prev + `\n   ${i+1}. ${service.uuid}`);
        });
      }
      
      if (connectedBleDevice.name && connectedBleDevice.name.includes('8')) {
        setReceivedData(prev => prev + `\n\n🎯 SMART BAND 8 AUTHENTICATION INFO:`);
        setReceivedData(prev => prev + `\n   • Smart Band 8 uses encrypted authentication keys`);
        setReceivedData(prev => prev + `\n   • Keys are generated when pairing with Mi Fit/Zepp Life`);
        setReceivedData(prev => prev + `\n   • Without proper keys, device shows 0% battery and blocks data`);
        setReceivedData(prev => prev + `\n   • Some open-source apps like Gadgetbridge can work with keys`);
        setReceivedData(prev => prev + `\n   • Authentication happens through 0xFE95 service characteristics`);
      }
      
      setReceivedData(prev => prev + `\n\n💡 AUTHENTICATION REQUIREMENTS:`);
      setReceivedData(prev => prev + `\n   • All modern Xiaomi Smart Bands require authentication`);
      setReceivedData(prev => prev + `\n   • Authentication uses device-specific encryption keys`);
      setReceivedData(prev => prev + `\n   • Keys are obtained through official Mi Fit or Zepp Life apps`);
      setReceivedData(prev => prev + `\n   • Without authentication, most data reads return 0 or fail`);
      setReceivedData(prev => prev + `\n   • Try disconnecting from official app and reconnecting here`);
      
    } catch (error) {
      setReceivedData(prev => prev + `\n❌ Auth exploration failed: ${error.message}`);
    }
  };

  const readXiaomiBattery = async () => {
    if (!connectedBleDevice) return;
    
    try {
      setReceivedData(prev => prev + `\n🔋 Reading Xiaomi Smart Band battery...`);
      
      const services = await connectedBleDevice.services();
      const serviceList = services.map(s => s.uuid);
      
      const hasOldBatteryService = serviceList.some(uuid => uuid.includes('fee0'));
      const hasAuthService = serviceList.some(uuid => uuid.includes('fe95'));
      
      if (!hasOldBatteryService) {
        setReceivedData(prev => prev + `\n📋 Smart Band 8/9 detected (no 0xFEE0 service)`);
        setReceivedData(prev => prev + `\n🔐 This device requires authentication before reading battery`);
      }
      
      setReceivedData(prev => prev + `\n🔍 Trying standard battery service...`);
      
      try {
        const batteryServiceUUID = '0000180f-0000-1000-8000-00805f9b34fb';
        const batteryCharUUID = '00002a19-0000-1000-8000-00805f9b34fb';
        
        const batteryData = await connectedBleDevice.readCharacteristicForService(
          batteryServiceUUID, 
          batteryCharUUID
        );
        
        if (batteryData.value) {
          const batteryLevel = atob(batteryData.value).charCodeAt(0);
          setReceivedData(prev => prev + `\n🔋 Standard battery service: ${batteryLevel}%`);
          
          if (batteryLevel === 0) {
            setReceivedData(prev => prev + `\n⚠️  0% indicates authentication required`);
            setReceivedData(prev => prev + `\n💡 Device is blocking unauthenticated battery reads`);
          } else if (batteryLevel > 0 && batteryLevel <= 100) {
            setReceivedData(prev => prev + `\n✅ Battery reading successful!`);
            return; 
          } else {
            setReceivedData(prev => prev + `\n⚠️  Invalid battery value: ${batteryLevel}`);
          }
        }
      } catch (standardError) {
        setReceivedData(prev => prev + `\n❌ Standard battery service failed: ${standardError.message}`);
      }
      
      if (hasOldBatteryService) {
        setReceivedData(prev => prev + `\n🔍 Trying legacy Xiaomi battery service...`);
        
        try {
          const xiaomiBatteryServiceUUID = '0000fee0-0000-1000-8000-00805f9b34fb';
          const xiaomiBatteryCharUUID = '0000ff0c-0000-1000-8000-00805f9b34fb';
          
          const batteryData = await connectedBleDevice.readCharacteristicForService(
            xiaomiBatteryServiceUUID, 
            xiaomiBatteryCharUUID
          );
          
          if (batteryData.value) {
            const rawBase64 = batteryData.value;
            const decodedData = atob(rawBase64);
            
            setReceivedData(prev => prev + `\n📊 Legacy battery data (${decodedData.length} bytes)`);
            
            if (decodedData.length >= 10) {
              const batteryLevel = decodedData.charCodeAt(0);
              const year = decodedData.charCodeAt(1) + 2000;
              const month = decodedData.charCodeAt(2);
              const day = decodedData.charCodeAt(3);
              const hour = decodedData.charCodeAt(4);
              const minute = decodedData.charCodeAt(5);
              const second = decodedData.charCodeAt(6);
              const charges = (decodedData.charCodeAt(7) | (decodedData.charCodeAt(8) << 8));
              const status = decodedData.charCodeAt(9);
              
              const statusText = {
                1: 'Battery Low',
                2: 'Charging', 
                3: 'Full (Charging)',
                4: 'Not Charging'
              }[status] || 'Unknown';
              
              setReceivedData(prev => prev + `\n✅ LEGACY XIAOMI BATTERY:`);
              setReceivedData(prev => prev + `\n   🔋 Level: ${batteryLevel}%`);
              setReceivedData(prev => prev + `\n   📅 Last Charged: ${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`);
              setReceivedData(prev => prev + `\n   🔄 Charges: ${charges}`);
              setReceivedData(prev => prev + `\n   ⚡ Status: ${statusText}`);
              return; 
            }
          }
        } catch (legacyError) {
          setReceivedData(prev => prev + `\n❌ Legacy battery service failed: ${legacyError.message}`);
        }
      }
      
      if (hasAuthService) {
        setReceivedData(prev => prev + `\n🔐 Attempting authentication approach...`);
        
        try {
          await attemptSmartBandAuthentication();
          
          setReceivedData(prev => prev + `\n🔄 Retrying battery read after auth attempt...`);
          
          const batteryData = await connectedBleDevice.readCharacteristicForService(
            '0000180f-0000-1000-8000-00805f9b34fb',
            '00002a19-0000-1000-8000-00805f9b34fb'
          );
          
          if (batteryData.value) {
            const batteryLevel = atob(batteryData.value).charCodeAt(0);
            if (batteryLevel > 0) {
              setReceivedData(prev => prev + `\n✅ Post-auth battery: ${batteryLevel}%`);
              return;
            }
          }
        } catch (authError) {
          setReceivedData(prev => prev + `\n❌ Authentication attempt failed: ${authError.message}`);
        }
      }
      
      setReceivedData(prev => prev + `\n\n💡 SMART BAND 8 BATTERY INFO:`);
      setReceivedData(prev => prev + `\n   • Smart Band 8 requires Mi Fit/Zepp Life authentication`);
      setReceivedData(prev => prev + `\n   • 0% reading means device is protecting battery data`);
      setReceivedData(prev => prev + `\n   • Try disconnecting from official app and reconnecting`);
      setReceivedData(prev => prev + `\n   • Some third-party apps like Gadgetbridge might work better`);
      
    } catch (error) {
      setReceivedData(prev => prev + `\n❌ Battery read failed: ${error.message}`);
    }
  };

  const attemptSmartBandAuthentication = async () => {
    try {
      setReceivedData(prev => prev + `\n🔐 Smart Band 8 authentication attempt...`);
      
      const authServiceUUID = '0000fe95-0000-1000-8000-00805f9b34fb';
      
      const characteristics = await connectedBleDevice.characteristicsForService(authServiceUUID);
      setReceivedData(prev => prev + `\n📋 Auth service has ${characteristics.length} characteristics`);
      
      for (const char of characteristics.slice(0, 3)) {
        setReceivedData(prev => prev + `\n🔍 Testing ${char.uuid}...`);
        
        if (char.isReadable) {
          try {
            const data = await connectedBleDevice.readCharacteristicForService(authServiceUUID, char.uuid);
            if (data.value) {
              const decoded = decodeBase64Data(data.value);
              setReceivedData(prev => prev + `\n   📄 Data: ${decoded.substring(0, 50)}`);
            }
          } catch (readError) {
            setReceivedData(prev => prev + `\n   ❌ Read failed: ${readError.message}`);
          }
        }
        
        if (char.isWritableWithResponse) {
          setReceivedData(prev => prev + `\n   ✏️  Writable characteristic found`);
        }
      }
      
      setReceivedData(prev => prev + `\n⚠️  Real authentication requires official app keys`);
      
    } catch (authError) {
      throw authError;
    }
  };

  const trySmartBandWakeup = async () => {
    if (!connectedBleDevice) return;
    
    try {
      setReceivedData(prev => prev + `\n⏰ Attempting to wake up Smart Band...`);

      const services = await connectedBleDevice.services();
      
      const alertService = services.find(s => 
        s.uuid.includes('1802') || 
        s.uuid.includes('fdab') || 
        s.uuid.includes('3802')    
      );
      
      if (alertService) {
        setReceivedData(prev => prev + `\n🔔 Found potential alert service: ${alertService.uuid}`);
        
        try {
          const characteristics = await connectedBleDevice.characteristicsForService(alertService.uuid);
          
          for (const char of characteristics) {
            if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
              setReceivedData(prev => prev + `\n📳 Trying to trigger vibration via ${char.uuid}...`);
              
              try {
                const vibrationCommands = [
                  btoa('\x01'), 
                  btoa('\x02'), 
                  btoa('\x01\x01'), 
                ];
                
                for (const command of vibrationCommands) {
                  await connectedBleDevice.writeCharacteristicWithResponseForService(
                    alertService.uuid,
                    char.uuid,
                    command
                  );
                  setReceivedData(prev => prev + `\n   ✅ Sent wake command`);
                  
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                break;
                
              } catch (writeError) {
                setReceivedData(prev => prev + `\n   ❌ Write failed: ${writeError.message}`);
              }
            }
          }
          
        } catch (charError) {
          setReceivedData(prev => prev + `\n❌ Could not access characteristics: ${charError.message}`);
        }
        
      } else {
        setReceivedData(prev => prev + `\n❌ No alert/vibration service found`);
      }
      
      setReceivedData(prev => prev + `\n🔍 Alternative: Reading services to wake device...`);
      
      let readCount = 0;
      for (const service of services.slice(0, 5)) {
        try {
          const chars = await connectedBleDevice.characteristicsForService(service.uuid);
          readCount++;
          setReceivedData(prev => prev + `\n   📖 Read service ${service.uuid.substring(0, 8)}... (${chars.length} chars)`);
          
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
        }
      }
      
      setReceivedData(prev => prev + `\n✅ Wake attempt complete - read ${readCount} services`);
      setReceivedData(prev => prev + `\n💡 Try reading battery again, or check if device screen is now active`);
      
    } catch (error) {
      setReceivedData(prev => prev + `\n❌ Wake attempt failed: ${error.message}`);
    }
  };

  const exploreXiaomiServices = async () => {
    if (!connectedBleDevice) return;
    
    try {
      setReceivedData(prev => prev + `\n🔍 Comprehensive Xiaomi service exploration...`);
      
      const services = await connectedBleDevice.services();
      
      const xiaomiServices = {
        '0000fe95-0000-1000-8000-00805f9b34fb': 'Authentication/Pairing',
        '0000fee0-0000-1000-8000-00805f9b34fb': 'Main Data Service',
        '0000fee1-0000-1000-8000-00805f9b34fb': 'Device Control',
        '0000fee7-0000-1000-8000-00805f9b34fb': 'Firmware Updates',
        '0000fdab-0000-1000-8000-00805f9b34fb': 'Custom Service 1',
        '00003802-0000-1000-8000-00805f9b34fb': 'Custom Service 2',
        'cc353442-be58-4ea2-876e-11d8d6976366': 'Custom Service 3'
      };
      
      setReceivedData(prev => prev + `\n📋 Found ${services.length} total services:`);
      
      for (const service of services) {
        const serviceName = xiaomiServices[service.uuid] || 
                           (service.uuid.includes('fe9') || service.uuid.includes('fee') ? 'Xiaomi-related' : 'Standard');
        
        setReceivedData(prev => prev + `\n\n🔧 ${service.uuid} - ${serviceName}`);
        
        try {
          const characteristics = await connectedBleDevice.characteristicsForService(service.uuid);
          setReceivedData(prev => prev + `\n   📊 ${characteristics.length} characteristics:`);
          
          for (let i = 0; i < Math.min(characteristics.length, 8); i++) {
            const char = characteristics[i];
            const props: string[] = [];
            if (char.isReadable) props.push('Read');
            if (char.isWritableWithResponse) props.push('Write');
            if (char.isWritableWithoutResponse) props.push('WriteNoResp');
            if (char.isNotifiable) props.push('Notify');
            if (char.isIndicatable) props.push('Indicate');
            
            setReceivedData(prev => prev + `\n   ${i+1}. ${char.uuid}`);
            setReceivedData(prev => prev + `\n      Properties: ${props.join(', ')}`);
            
            if (service.uuid.includes('fee0') && char.uuid.includes('ff0c')) {
              setReceivedData(prev => prev + `\n      🔋 BATTERY CHARACTERISTIC - Try reading this!`);
            } else if (service.uuid.includes('fe95')) {
              setReceivedData(prev => prev + `\n      🔐 AUTH SERVICE - Authentication required`);
            }
            
            if (char.isReadable && !service.uuid.includes('fe95')) {
              try {
                const data = await connectedBleDevice.readCharacteristicForService(service.uuid, char.uuid);
                if (data.value) {
                  const decoded = decodeBase64Data(data.value);
                  const preview = decoded.length > 50 ? decoded.substring(0, 50) + '...' : decoded;
                  setReceivedData(prev => prev + `\n      💾 Data: ${preview}`);
                }
              } catch (readError) {
                setReceivedData(prev => prev + `\n      ❌ Read failed: ${readError.message}`);
              }
            }
          }
          
        } catch (charError) {
          setReceivedData(prev => prev + `\n   ❌ Could not read characteristics: ${charError.message}`);
        }
      }
      
      setReceivedData(prev => prev + `\n\n🎯 RECOMMENDATIONS:`);
      const hasBatteryService = services.find(s => s.uuid.includes('fee0'));
      const hasAuthService = services.find(s => s.uuid.includes('fe95'));
      
      if (hasBatteryService) {
        setReceivedData(prev => prev + `\n✅ Battery service found - try "Read Battery" button`);
      }
      if (hasAuthService) {
        setReceivedData(prev => prev + `\n🔐 Auth service found - device supports authentication`);
      }
      setReceivedData(prev => prev + `\n💡 For full functionality, use Mi Fit/Zepp Life app first`);
      
    } catch (error) {
      setReceivedData(prev => prev + `\n❌ Service exploration failed: ${error.message}`);
    }
  };

  const tryXiaomiHeartRate = async () => {
    if (!connectedBleDevice) return;
    
    try {
      setReceivedData(prev => prev + `\n❤️  Attempting heart rate read...`);
      
      const hrServiceUUID = '0000180d-0000-1000-8000-00805f9b34fb';
      const hrMeasurementUUID = '00002a37-0000-1000-8000-00805f9b34fb';
      
      try {
        const hrData = await connectedBleDevice.readCharacteristicForService(
          hrServiceUUID, 
          hrMeasurementUUID
        );
        
        if (hrData.value) {
          const decoded = decodeBase64Data(hrData.value);
          setReceivedData(prev => prev + `\n❤️  Heart rate: ${decoded}`);
        }
      } catch (standardHrError) {
        setReceivedData(prev => prev + `\n❌ Standard HR service not accessible`);
        setReceivedData(prev => prev + `\n💡 Heart rate may require authentication or manual activation on device`);
      }
      
    } catch (error) {
      setReceivedData(prev => prev + `\n❌ Heart rate read failed: ${error.message}`);
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

  const exploreService = async (serviceUUID) => {
    if (!connectedBleDevice) return;
    
    try {
      const characteristics = await connectedBleDevice.characteristicsForService(serviceUUID);
      console.log(`Characteristics for service ${serviceUUID}:`, characteristics.map(c => c.uuid));
      setAvailableCharacteristics(characteristics);
      setServiceUUID(serviceUUID);
    } catch (error) {
      console.error('Service exploration error:', error);
    }
  };

  const setQuickUUIDs = (service, characteristic) => {
    setServiceUUID(service);
    setCharacteristicUUID(characteristic);
  };

  const getServiceName = (uuid) => {
    const serviceNames = {
      '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
      '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
      '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
      '00001812-0000-1000-8000-00805f9b34fb': 'Human Interface Device',
      '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
      '0000fe95-0000-1000-8000-00805f9b34fb': 'Xiaomi Service',
    };
    return serviceNames[uuid] || 'Unknown Service';
  };

  const decodeBase64Data = (base64Data) => {
    try {
      const decodedData = atob(base64Data);
      
      const printableChars = decodedData.split('').filter(char => {
        const code = char.charCodeAt(0);
        return code >= 32 && code <= 126;
      });
      
      if (printableChars.length / decodedData.length > 0.7) {
        return decodedData;
      } else {
        const hexString = Array.from(decodedData)
          .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(' ');
        
        if (decodedData.length === 1) {
          const value = decodedData.charCodeAt(0);
          return `Value: ${value} (0x${value.toString(16).padStart(2, '0')})`;
        } else if (decodedData.length === 2) {
          const value = (decodedData.charCodeAt(0) | (decodedData.charCodeAt(1) << 8));
          return `Value: ${value} (0x${value.toString(16).padStart(4, '0')}) | Hex: ${hexString}`;
        } else {
          return `Hex: ${hexString}`;
        }
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
        const readableData = decodeBase64Data(data);
        setReceivedData(readableData);
        console.log('Received BLE data:', readableData);
      } else {
        setReceivedData('No data received');
      }
    } catch (error) {
      console.error('BLE Read error:', error);
      Alert.alert('BLE Read Error', error.message);
    }
  };

  const writeToClassicDevice = async (data) => {
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

  const renderDevice = ({ item }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
        <Text style={styles.deviceType}>Type: {item.type}</Text>
        {item.rssi && <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>}
        {item.bonded && <Text style={styles.bondedText}>✓ Bonded</Text>}
      </View>
      <View style={styles.deviceButtons}>
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
        {(item.type === 'Classic' || item.type === 'Bonded') && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => showDeviceDebugInfo(item)}
          >
            <Text style={styles.debugButtonText}>?</Text>
          </TouchableOpacity>
        )}
        {item.type === 'Bonded' && isKnownFitnessTracker(item.name) && (
          <TouchableOpacity
            style={styles.bleButton}
            onPress={() => tryBleConnectionForTracker(item)}
          >
            <Text style={styles.debugButtonText}>BLE</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );


  const allDevices = [...bleDevices, ...classicDevices, ...bondedDevices];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Bluetooth Device Manager</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>BLE Status: {bleState}</Text>
        <Text style={styles.statusText}>Classic BT: {classicEnabled ? 'Enabled' : 'Disabled'}</Text>
        {connectedBleDevice && (
          <View>
            <Text style={styles.connectedText}>
              BLE Connected: {connectedBleDevice.name || 'Unknown'}
            </Text>
            <Text style={styles.deviceId}>MAC: {connectedBleDevice.id}</Text>
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
          <TouchableOpacity
            style={styles.button}
            onPress={loadBondedDevices}
          >
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
          🔵 BLE • 🟢 Classic • 🟡 Bonded
        </Text>
        <Text style={styles.warningText}>
          ⚠️ Some bonded devices (like watches) may only accept connections from specific apps
        </Text>
        <FlatList
          data={allDevices}
          renderItem={renderDevice}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          style={styles.deviceList}
          scrollEnabled={true}
        />
      </View>

      {connectedBleDevice && connectedBleDevice.name && 
       (connectedBleDevice.name.toLowerCase().includes('xiaomi') || 
        connectedBleDevice.name.toLowerCase().includes('mi band')) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏃 Xiaomi Smart Band Tools</Text>
          <Text style={styles.infoText}>
            {connectedBleDevice.name.includes('8') || connectedBleDevice.name.includes('9') ? 
              'Smart Band 8/9 requires authentication. These tools attempt basic operations:' :
              'Xiaomi Smart Bands use proprietary protocols. These tools attempt common operations:'
            }
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.xiaomiButton}
              onPress={() => exploreXiaomiAuth()}
            >
              <Text style={styles.buttonText}>Explore Auth</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.xiaomiButton}
              onPress={() => readXiaomiBattery()}
            >
              <Text style={styles.buttonText}>Read Battery</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.xiaomiButton}
              onPress={() => exploreXiaomiServices()}
            >
              <Text style={styles.buttonText}>Explore Services</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.xiaomiButton}
              onPress={() => trySmartBandWakeup()}
            >
              <Text style={styles.buttonText}>Wake Device</Text>
            </TouchableOpacity>
          </View>
          {connectedBleDevice.name.includes('8') || connectedBleDevice.name.includes('9') ? (
            <Text style={styles.warningText}>
              ⚠️ Smart Band 8/9: Battery shows 0% until authenticated via Mi Fit/Zepp Life app
            </Text>
          ) : (
            <Text style={styles.warningText}>
              ⚠️ Full functionality requires authentication through Mi Fit/Zepp Life app first
            </Text>
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
                <Text style={styles.serviceType}>
                  {getServiceName(service.uuid)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {connectedBleDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BLE Quick Access</Text>
          <View style={styles.quickButtonRow}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => setQuickUUIDs('0000180f-0000-1000-8000-00805f9b34fb', '00002a19-0000-1000-8000-00805f9b34fb')}
            >
              <Text style={styles.quickButtonText}>Battery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => setQuickUUIDs('0000180a-0000-1000-8000-00805f9b34fb', '00002a25-0000-1000-8000-00805f9b34fb')}
            >
              <Text style={styles.quickButtonText}>Serial</Text>
            </TouchableOpacity>
          </View>
          
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

      {(bleDevices.some(device => device.name && device.name.toLowerCase().includes('xiaomi')) ||
        bondedDevices.some(device => device.name && device.name.toLowerCase().includes('xiaomi'))) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Xiaomi Device Selection</Text>
          <Text style={styles.infoText}>
            Multiple Xiaomi devices detected. Use direct BLE connection to avoid connecting to wrong device:
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              Alert.alert(
                'Manual Connection Instructions',
                'For precise device selection:\n\n1. Use "Scan BLE" to find your specific device\n2. Look for the exact device name (e.g., "Xiaomi Smart Band 7")\n3. Connect directly to that BLE device\n4. Avoid using "Try BLE Instead" if multiple Xiaomi devices are present',
                [{ text: 'Got it' }]
              );
            }}
          >
            <Text style={styles.buttonText}>Connection Tips</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🩺 Fitness Tracker Troubleshooting</Text>
        <Text style={styles.troubleshootText}>
          <Text style={styles.troubleshootTitle}>Xiaomi Smart Band Issues:</Text>
          {'\n'}• Smart Bands reject Classic Bluetooth connections (this is normal!)
          {'\n'}• They only connect via BLE (Bluetooth Low Energy)
          {'\n'}• Full features require Mi Fit or Zepp Life app authentication
          {'\n'}• Try the "Try BLE Instead" button when connection fails
          {'\n'}
          {'\n'}<Text style={styles.troubleshootTitle}>General Fitness Tracker Issues:</Text>
          {'\n'}• Most fitness trackers only work with their official apps
          {'\n'}• They use proprietary protocols for data access
          {'\n'}• Basic info (battery, device info) might be accessible via BLE
          {'\n'}• Advanced features (heart rate, steps) usually require authentication
          {'\n'}
          {'\n'}<Text style={styles.troubleshootTitle}>What You Can Try:</Text>
          {'\n'}1. Use "Scan BLE" instead of "Scan Classic" for fitness trackers
          {'\n'}2. When Classic connection fails, tap "Try BLE Instead"
          {'\n'}3. For Xiaomi devices, use the special Xiaomi tools section
          {'\n'}4. Check if device is connected to official app (disconnect it first)
        </Text>
      </View>

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
  deviceButtons: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 2,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  bondedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  debugButton: {
    backgroundColor: '#FF9800',
    padding: 8,
    borderRadius: 4,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  bleButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    width: 35,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  warningText: {
    fontSize: 12,
    color: '#FF5722',
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
  serviceType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 2,
  },
  quickButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  quickButton: {
    backgroundColor: '#FF9800',
    padding: 8,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 3,
  },
  quickButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  xiaomiButton: {
    backgroundColor: '#FF5722',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
  },
  troubleshootText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  troubleshootTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
});

export default BluetoothApp;