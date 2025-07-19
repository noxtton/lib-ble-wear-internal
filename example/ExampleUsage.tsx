import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import {
  BLEManager,
  DeviceCandidate,
  DeviceEventCallbacks,
  HealthMetrics,
  DeviceState,
  BLEError,
  BLEErrorType,
  DeviceConnection
} from 'ble-wearables';

interface ConnectionInfo {
  device: DeviceCandidate;
  connection: DeviceConnection;
  state: DeviceState;
  batteryLevel?: number;
}

export default function BLEWearablesExample() {
  // BLE Manager state
  const [bleManager] = useState(() => new BLEManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<DeviceCandidate[]>([]);
  const [allScannedDevices, setAllScannedDevices] = useState<any[]>([]);
  const [probedDevices, setProbedDevices] = useState<any[]>([]);

  // Connection state
  const [connectedDevices, setConnectedDevices] = useState<Map<string, ConnectionInfo>>(new Map());
  const [authToken, setAuthToken] = useState('1234567890abcdef1234567890abcdef');

  // Health data state
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics[]>([]);
  const [latestHeartRate, setLatestHeartRate] = useState<number | null>(null);
  const [latestSteps, setLatestSteps] = useState<number | null>(null);
  const [latestCalories, setLatestCalories] = useState<number | null>(null);


  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showHealthDataModal, setShowHealthDataModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const logRef = useRef<string[]>([]);

  // Logging helper
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    logRef.current = [logMessage, ...logRef.current.slice(0, 99)];
    setLogs([...logRef.current]);
    console.info(logMessage);
  };

  // Setup BLE callbacks
  useEffect(() => {
    const callbacks: DeviceEventCallbacks = {
      onConnectionStateChange: (connected, deviceAddress) => {
        addLog(`Device ${deviceAddress} ${connected ? 'connected' : 'disconnected'}`);
        if (!connected) {
          setConnectedDevices(prev => {
            const newMap = new Map(prev);
            newMap.delete(deviceAddress);
            return newMap;
          });
        }
      },

      onHealthMetrics: (metrics) => {
        addLog(`Health metrics: HR:${metrics.heartRate} Steps:${metrics.steps} Cal:${metrics.calories}`);
        setHealthMetrics(prev => [metrics, ...prev.slice(0, 49)]); // Keep last 50 readings
      },

      onHeartRate: (heartRate, deviceAddress) => {
        addLog(`Heart rate: ${heartRate} BPM from ${deviceAddress}`);
        setLatestHeartRate(heartRate);
      },

      onSteps: (steps, deviceAddress) => {
        addLog(`Steps: ${steps} from ${deviceAddress}`);
        setLatestSteps(steps);
      },

      onCalories: (calories, deviceAddress) => {
        addLog(`Calories: ${calories} from ${deviceAddress}`);
        setLatestCalories(calories);
      },

      onError: (error, deviceAddress) => {
        const errorMsg = `Error${deviceAddress ? ` from ${deviceAddress}` : ''}: ${error.message}`;
        addLog(errorMsg);
        
        if (error instanceof BLEError) {
          switch (error.type) {
            case BLEErrorType.PERMISSIONS_DENIED:
              Alert.alert('Permissions Error', 'Bluetooth permissions are required to use this app.');
              break;
            case BLEErrorType.AUTHENTICATION_FAILED:
              Alert.alert('Authentication Failed', 'Please check your auth token. Mi Band devices require a valid 16-byte hex key.');
              break;
            case BLEErrorType.CONNECTION_FAILED:
              Alert.alert('Connection Failed', 'Could not connect to the device. Make sure it\'s nearby and not connected to another app.');
              break;
            default:
              Alert.alert('BLE Error', error.message);
          }
        } else {
          Alert.alert('Error', error.message);
        }
      }
    };

    bleManager.callbacks = callbacks;
  }, [bleManager]);

  // Initialize BLE Manager
  useEffect(() => {
    const initializeBLE = async () => {
      try {
        addLog('Initializing BLE Manager...');
        await bleManager.waitUntilReady(15000);
        
        const permissionsGranted = await bleManager.requestPermissions();
        if (!permissionsGranted) {
          throw new Error('Bluetooth permissions not granted');
        }

        setIsInitialized(true);
        addLog('BLE Manager initialized successfully');
      } catch (error) {
        addLog(`BLE initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        Alert.alert('Initialization Failed', 'Could not initialize Bluetooth. Please check your device settings.');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeBLE();
  }, []);

  // Scan for devices
  const startScan = async () => {
    if (!isInitialized) {
      Alert.alert('Not Ready', 'BLE Manager is not initialized yet');
      return;
    }

    if (isScanning) {
      bleManager.stopScan();
      setIsScanning(false);
      addLog('Scan stopped');
      return;
    }

    try {
      setIsScanning(true);
      setScannedDevices([]);
      addLog('Starting device scan...');

      const devices = await bleManager.startScan(15000);
      
      setScannedDevices(devices);
      setAllScannedDevices(bleManager.getAllScannedDevices());
      setProbedDevices(bleManager.getProbedDevices());
      
      addLog(`Scan completed. Found ${devices.length} compatible devices`);
    } catch (error) {
      addLog(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Connect to device
  const connectToDevice = async (device: DeviceCandidate) => {
    try {
      addLog(`Connecting to ${device.name} (${device.address})...`);
      
      const connection = await bleManager.pairDevice(device.address, {
        authToken: authToken.trim() || undefined,
        timeout: 30000
      });

      const connectionInfo: ConnectionInfo = {
        device,
        connection,
        state: connection.getDeviceState(),
      };

      setConnectedDevices(prev => new Map(prev.set(device.address, connectionInfo)));
      addLog(`Successfully connected to ${device.name}`);

      // Get battery level
      try {
        const batteryLevel = await connection.getBatteryLevel();
        if (batteryLevel !== null) {
          setConnectedDevices(prev => {
            const newMap = new Map(prev);
            const info = newMap.get(device.address);
            if (info) {
              (info as ConnectionInfo).batteryLevel = batteryLevel;
              newMap.set(device.address, info);
            }
            return newMap;
          });
          addLog(`Battery level: ${batteryLevel}%`);
        }
      } catch (error) {
        addLog(`Could not read battery level: ${error instanceof Error ? error.message : String(error)}`);
      }

    } catch (error) {
      addLog(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Disconnect from device
  const disconnectDevice = async (deviceAddress: string) => {
    try {
      await bleManager.disconnectDevice(deviceAddress);
      setConnectedDevices(prev => {
        const newMap = new Map(prev);
        newMap.delete(deviceAddress);
        return newMap;
      });
      addLog(`Disconnected from ${deviceAddress}`);
    } catch (error) {
      addLog(`Disconnect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Trigger measurements
  const triggerMeasurement = async (deviceAddress: string, type: 'heartRate' | 'steps' | 'calories') => {
    const connectionInfo = connectedDevices.get(deviceAddress);
    if (!connectionInfo) {
      Alert.alert('Error', 'Device not connected');
      return;
    }

    try {
      let success = false;
      let measurementType = '';

      switch (type) {
        case 'heartRate':
          success = await connectionInfo.connection.triggerHeartRateMeasurement();
          measurementType = 'heart rate';
          break;
        case 'steps':
          success = await connectionInfo.connection.triggerStepsMeasurement();
          measurementType = 'steps';
          break;
        case 'calories':
          success = await connectionInfo.connection.triggerCaloriesMeasurement();
          measurementType = 'calories';
          break;
      }

      if (success) {
        addLog(`${measurementType} measurement triggered successfully`);
      } else {
        addLog(`Failed to trigger ${measurementType} measurement`);
      }
    } catch (error) {
      addLog(`Measurement trigger failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderDeviceItem = ({ item }: { item: DeviceCandidate }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceDetails}>
          {item.deviceType} • {item.rssi ? `${item.rssi} dBm` : 'Unknown RSSI'}
        </Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
      </View>
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => connectToDevice(item)}
      >
        <Text style={styles.connectButtonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConnectedDevice = (connectionInfo: ConnectionInfo) => (
    <View key={connectionInfo.device.address} style={styles.connectedDeviceCard}>
      <View style={styles.connectedDeviceHeader}>
        <Text style={styles.connectedDeviceName}>{connectionInfo.device.name}</Text>
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={() => disconnectDevice(connectionInfo.device.address)}
        >
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.deviceStateText}>State: {connectionInfo.state}</Text>
      {connectionInfo.batteryLevel !== undefined && (
        <Text style={styles.batteryText}>Battery: {connectionInfo.batteryLevel}%</Text>
      )}

      <View style={styles.measurementButtons}>
        <TouchableOpacity
          style={styles.measurementButton}
          onPress={() => triggerMeasurement(connectionInfo.device.address, 'heartRate')}
        >
          <Text style={styles.measurementButtonText}>Heart Rate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.measurementButton}
          onPress={() => triggerMeasurement(connectionInfo.device.address, 'steps')}
        >
          <Text style={styles.measurementButtonText}>Steps</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.measurementButton}
          onPress={() => triggerMeasurement(connectionInfo.device.address, 'calories')}
        >
          <Text style={styles.measurementButtonText}>Calories</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing Bluetooth...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
       <View style={styles.header}>
        <Text style={styles.headerTitle}>BLE Wearables Example</Text>
        <Text style={styles.headerSubtitle}>
          Status: {isInitialized ? 'Ready' : 'Not Ready'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Token</Text>
          <TextInput
            style={styles.authTokenInput}
            value={authToken}
            onChangeText={setAuthToken}
            placeholder="Enter 16-byte hex auth token for Mi Band"
            placeholderTextColor="#999"
          />
          <Text style={styles.authTokenHelp}>
            Required for Mi Band devices. Get this from Mi Fit app or device pairing.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Device Scanning</Text>
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonActive]}
              onPress={startScan}
              disabled={!isInitialized}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.scanButtonText}>
                  {scannedDevices.length > 0 ? 'Scan Again' : 'Start Scan'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {scannedDevices.length > 0 && (
            <View>
              <Text style={styles.deviceCount}>
                Found {scannedDevices.length} compatible device(s)
              </Text>
              <FlatList
                data={scannedDevices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>

        {connectedDevices.size > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Devices</Text>
            {Array.from<ConnectionInfo>(connectedDevices.values()).map(renderConnectedDevice)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Health Data</Text>
          <View style={styles.healthDataGrid}>
            <View style={styles.healthDataItem}>
              <Text style={styles.healthDataLabel}>Heart Rate</Text>
              <Text style={styles.healthDataValue}>
                {latestHeartRate ? `${latestHeartRate} BPM` : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.healthDataItem}>
              <Text style={styles.healthDataLabel}>Steps</Text>
              <Text style={styles.healthDataValue}>
                {latestSteps ? latestSteps.toLocaleString() : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.healthDataItem}>
              <Text style={styles.healthDataLabel}>Calories</Text>
              <Text style={styles.healthDataValue}>
                {latestCalories ? `${latestCalories} cal` : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug & Information</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowHealthDataModal(true)}
            >
              <Text style={styles.actionButtonText}>📊 Health History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowDebugModal(true)}
            >
              <Text style={styles.actionButtonText}>🐛 Debug Logs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowDeviceModal(true)}
            >
              <Text style={styles.actionButtonText}>🔍 All Devices</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showHealthDataModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Health Data History</Text>
            <TouchableOpacity onPress={() => setShowHealthDataModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={healthMetrics}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.healthMetricItem}>
                <Text style={styles.healthMetricTime}>
                  {item.timestamp.toLocaleTimeString()}
                </Text>
                <Text style={styles.healthMetricData}>
                  HR: {item.heartRate || 'N/A'} | 
                  Steps: {item.steps || 'N/A'} | 
                  Cal: {item.calories || 'N/A'}
                </Text>
                <Text style={styles.healthMetricDevice}>
                  Device: {item.deviceAddress}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No health data recorded yet</Text>
            }
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showDebugModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Debug Logs</Text>
            <TouchableOpacity onPress={() => setShowDebugModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={logs}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Text style={styles.logItem}>{item}</Text>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No logs yet</Text>
            }
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showDeviceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Scanned Devices</Text>
            <TouchableOpacity onPress={() => setShowDeviceModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            <Text style={styles.deviceSectionTitle}>Compatible Devices ({scannedDevices.length})</Text>
            {scannedDevices.map((device, index) => (
              <View key={device.id} style={styles.debugDeviceItem}>
                <Text style={styles.debugDeviceName}>{device.name}</Text>
                <Text>Type: {device.deviceType}</Text>
                <Text>Address: {device.address}</Text>
                <Text>RSSI: {device.rssi} dBm</Text>
              </View>
            ))}
            
            <Text style={styles.deviceSectionTitle}>All Scanned ({allScannedDevices.length})</Text>
            {allScannedDevices.map((device, index) => (
              <View key={`all-${index}`} style={styles.debugDeviceItem}>
                <Text style={styles.debugDeviceName}>
                  {device.name || device.localName || 'Unnamed Device'}
                </Text>
                <Text>ID: {device.id}</Text>
                <Text>RSSI: {device.rssi} dBm</Text>
                <Text>Services: {device.serviceUUIDs?.length || 0}</Text>
              </View>
            ))}
            
            <Text style={styles.deviceSectionTitle}>Probed Devices ({probedDevices.length})</Text>
            {probedDevices.map((device, index) => (
              <View key={`probed-${index}`} style={styles.debugDeviceItem}>
                <Text style={styles.debugDeviceName}>
                  {device.name || 'Unnamed Device'}
                </Text>
                <Text>ID: {device.id}</Text>
                <Text>Services: {device.services?.length || 0}</Text>
                <Text>Mi Band: {device.isMiBand ? 'Yes' : 'No'}</Text>
                <Text>Probed: {device.probedAt?.toLocaleTimeString()}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  authTokenInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  authTokenHelp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  scanButtonActive: {
    backgroundColor: '#FF3B30',
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    marginBottom: 8,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  deviceDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceAddress: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  connectedDeviceCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 12,
  },
  connectedDeviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectedDeviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  disconnectButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deviceStateText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  batteryText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  measurementButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  measurementButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  healthDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthDataItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  healthDataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  healthDataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  healthMetricItem: {
    backgroundColor: '#FFF',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 6,
  },
  healthMetricTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  healthMetricData: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  healthMetricDevice: {
    fontSize: 10,
    color: '#999',
  },
  logItem: {
    fontSize: 11,
    color: '#000',
    padding: 8,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 40,
  },
  deviceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    margin: 16,
    marginBottom: 8,
  },
  debugDeviceItem: {
    backgroundColor: '#FFF',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 6,
  },
  debugDeviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
});