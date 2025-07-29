import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MiBand,  DeviceCandidate } from 'ble-wearables';

interface HealthData {
  heartRate?: number;
  steps?: number;
  calories?: number;
  standingHours?: number;
  timestamp: Date;
}

export const MiBandExample: React.FC = () => {
  const [devices, setDevices] = useState<DeviceCandidate[]>([]);
  const [bondedDevices, setBondedDevices] = useState<DeviceCandidate[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthData>({
    timestamp: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribePairingSuccess = MiBand.addListener('PairingSuccess', (event) => {
      console.log('Device paired successfully:', event.deviceAddress);
      setConnectedDevice(event.deviceAddress);
      setIsLoading(false);
      Alert.alert('Success', 'Device paired successfully!');
    });

    const unsubscribePairingError = MiBand.addListener('PairingError', (event) => {
      console.error('Pairing error:', event.error);
      setIsLoading(false);
      Alert.alert('Error', `Pairing failed: ${event.error}`);
    });

    const unsubscribeHeartRate = MiBand.addListener('onXiaomiHeartRateData', (event) => {
      console.log('Heart rate update:', event.heartRate);
      setHealthData(prev => ({
        ...prev,
        heartRate: event.heartRate,
        timestamp: new Date(),
      }));
    });

    const unsubscribeSteps = MiBand.addListener('onXiaomiStepsData', (event) => {
      console.log('Steps update:', event.steps);
      setHealthData(prev => ({
        ...prev,
        steps: event.steps,
        timestamp: new Date(),
      }));
    });

    const unsubscribeCalories = MiBand.addListener('onXiaomiCaloriesData', (event) => {
      console.log('Calories update:', event.calories);
      setHealthData(prev => ({
        ...prev,
        calories: event.calories,
        timestamp: new Date(),
      }));
    });

    const unsubscribeStandingHours = MiBand.addListener('onXiaomiStandingHoursData', (event) => {
      console.log('Standing hours update:', event.standingHours);
      setHealthData(prev => ({
        ...prev,
        standingHours: event.standingHours,
        timestamp: new Date(),
      }));
    });

    const unsubscribeConnection = MiBand.addListener('GattConnectionState', (event) => {
      console.log('Connection state changed:', event.status, event.deviceAddress);
      if (event.status === 'disconnected') {
        setConnectedDevice(null);
      }
    });

    loadBondedDevices();

    return () => {
      unsubscribePairingSuccess();
      unsubscribePairingError();
      unsubscribeHeartRate();
      unsubscribeSteps();
      unsubscribeCalories();
      unsubscribeStandingHours();
      unsubscribeConnection();
    };
  }, []);

  const loadBondedDevices = useCallback(async () => {
    try {
      const bonded = await MiBand.getBondedDevices();
      setBondedDevices(bonded);
      console.log(`Found ${bonded.length} bonded devices`);
    } catch (error) {
      console.error('Failed to load bonded devices:', error);
    }
  }, []);

  const startScan = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setDevices([]);

    try {
      const foundDevices = await MiBand.scanForDevices(15000, true);
      setDevices(foundDevices);
      console.log(`Found ${foundDevices.length} compatible devices`);
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Error', `Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  const stopScan = useCallback(() => {
    MiBand.stopScan();
    setIsScanning(false);
  }, []);

  const connectToDevice = useCallback(async (device: DeviceCandidate) => {
    setIsLoading(true);

    try {
      const authToken = 'your_auth_token_here'; 

      await MiBand.startPairing(device.address, authToken);
      console.log('Pairing initiated for device:', device.name);
    } catch (error) {
      console.error('Connection failed:', error);
      setIsLoading(false);
      Alert.alert('Error', `Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const disconnectDevice = useCallback(async () => {
    if (!connectedDevice) return;

    try {
      await MiBand.stopPairing();
      setConnectedDevice(null);
      Alert.alert('Success', 'Device disconnected');
    } catch (error) {
      console.error('Disconnect failed:', error);
      Alert.alert('Error', `Disconnect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [connectedDevice]);

  const triggerHeartRate = useCallback(async () => {
    if (!connectedDevice) return;

    try {
      const result = await MiBand.triggerXiaomiHrMeasure();
      console.log('Heart rate trigger result:', result);
    } catch (error) {
      console.error('Heart rate trigger failed:', error);
      Alert.alert('Error', `Heart rate measurement failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [connectedDevice]);

  const triggerSteps = useCallback(async () => {
    if (!connectedDevice) return;

    try {
      const result = await MiBand.triggerXiaomiStepsMeasure();
      console.log('Steps trigger result:', result);
    } catch (error) {
      console.error('Steps trigger failed:', error);
      Alert.alert('Error', `Steps measurement failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [connectedDevice]);

  const triggerCalories = useCallback(async () => {
    if (!connectedDevice) return;

    try {
      const result = await MiBand.triggerXiaomiCaloriesMeasure();
      console.log('Calories trigger result:', result);
    } catch (error) {
      console.error('Calories trigger failed:', error);
      Alert.alert('Error', `Calories measurement failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [connectedDevice]);

  const triggerStandingHours = useCallback(async () => {
    if (!connectedDevice) return;

    try {
      const result = await MiBand.triggerXiaomiStandingHoursMeasure();
      console.log('Standing hours trigger result:', result);
    } catch (error) {
      console.error('Standing hours trigger failed:', error);
      Alert.alert('Error', `Standing hours measurement failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [connectedDevice]);

  const renderDevice = ({ item }: { item: DeviceCandidate }) => {
    const isBonded = bondedDevices.some(d => d.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isBonded && styles.bondedDevice]}
        onPress={() => connectToDevice(item)}
        disabled={isLoading}
      >
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceAddress}>{item.address}</Text>
          <Text style={styles.deviceDetails}>
            Type: {item.deviceType} | RSSI: {item.rssi}dBm
            {isBonded && ' | BONDED'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Band React Native Demo</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {connectedDevice ? `Connected to ${connectedDevice}` : 'Not connected'}
        </Text>
        {isLoading && <ActivityIndicator size="small" color="#007AFF" />}
      </View>

      {connectedDevice && (
        <View style={styles.healthDataContainer}>
          <Text style={styles.sectionTitle}>Health Data</Text>
          <Text style={styles.healthData}>Heart Rate: {healthData.heartRate || 'N/A'} bpm</Text>
          <Text style={styles.healthData}>Steps: {healthData.steps || 'N/A'}</Text>
          <Text style={styles.healthData}>Calories: {healthData.calories || 'N/A'}</Text>
          <Text style={styles.healthData}>Standing Hours: {healthData.standingHours || 'N/A'}</Text>
          <Text style={styles.healthData}>Last Update: {healthData.timestamp.toLocaleTimeString()}</Text>
        </View>
      )}

      <View style={styles.controlsContainer}>
        {!connectedDevice ? (
          <>
            <TouchableOpacity
              style={[styles.button, isScanning && styles.buttonDisabled]}
              onPress={isScanning ? stopScan : startScan}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isScanning ? 'Stop Scan' : 'Start Scan'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={loadBondedDevices}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Refresh Bonded Devices</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.button} onPress={disconnectDevice}>
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>

            <View style={styles.measurementButtons}>
              <TouchableOpacity style={styles.smallButton} onPress={triggerHeartRate}>
                <Text style={styles.buttonText}>Heart Rate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={triggerSteps}>
                <Text style={styles.buttonText}>Steps</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={triggerCalories}>
                <Text style={styles.buttonText}>Calories</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={triggerStandingHours}>
                <Text style={styles.buttonText}>Standing</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {!connectedDevice && (
        <View style={styles.deviceListContainer}>
          <Text style={styles.sectionTitle}>
            Available Devices ({devices.length})
            {bondedDevices.length > 0 && ` | Bonded: ${bondedDevices.length}`}
          </Text>
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={(item) => item.id}
            style={styles.deviceList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  healthDataContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  healthData: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  controlsContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  measurementButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  smallButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    width: '48%',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceListContainer: {
    flex: 1,
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  bondedDevice: {
    borderLeftColor: '#34C759',
    backgroundColor: '#f0fff4',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 12,
    color: '#999',
  },
});

export default MiBandExample;