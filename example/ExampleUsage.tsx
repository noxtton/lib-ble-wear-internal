import { BLEManager, DeviceCandidate } from 'ble-wearables';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DebugDevice {
  id: string;
  name?: string;
  localName?: string;
  rssi?: number;
  serviceUUIDs?: string[];
  manufacturerData?: number[];
  identified: boolean;
  deviceType?: string;
}
 const MiBandDebugComponent: React.FC = () => {
  const [bleManager] = useState(() => new BLEManager({} )); 
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<DebugDevice[]>([]);
  const [bondedDevices, setBondedDevices] = useState<DeviceCandidate[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    initializeBLE();
    return () => {
      bleManager.destroy();
    };
  }, []);

  const initializeBLE = async () => {
    try {
      addLog('Initializing BLE Manager...');
      await bleManager.waitUntilReady();
      addLog('BLE Manager ready');
      await loadBondedDevices();
    } catch (error) {
      addLog(`BLE initialization failed: ${error}`);
    }
  };

  const loadBondedDevices = async () => {
    try {
      addLog('Loading bonded devices...');
      const bonded = await bleManager.getBondedDevices();
      setBondedDevices(bonded);
      addLog(`Found ${bonded.length} bonded devices`);
    } catch (error) {
      addLog(`Failed to load bonded devices: ${error}`);
    }
  };

  const startScan = async () => {
    if (isScanning) return;

    try {
      setIsScanning(true);
      setDevices([]);
      addLog('Starting device scan...');
      
      const foundDevices = await bleManager.startScan(15000, false); 
      
      const allScanned = bleManager.getAllScannedDevices();
      const debugDevices: DebugDevice[] = allScanned.map(device => ({
        id: device.id,
        name: device.name || undefined,
        localName: device.localName || undefined,
        rssi: device.rssi || undefined,
        serviceUUIDs: device.serviceUUIDs || [],
        identified: foundDevices.some(fd => fd.id === device.id),
        deviceType: foundDevices.find(fd => fd.id === device.id)?.deviceType
      }));

      setDevices(debugDevices);
      addLog(`Scan completed. Found ${allScanned.length} total devices, ${foundDevices.length} identified as compatible`);
      
    } catch (error) {
      addLog(`Scan failed: ${error}`);
    } finally {
      setIsScanning(false);
    }
  };

  const probeDevice = async (deviceId: string) => {
    try {
      addLog(`Probing device ${deviceId}...`);
      // No getDeviceDebugInfo method exists; show basic info instead
      const device = devices.find(d => d.id === deviceId);
      Alert.alert(
        'Device Info',
        JSON.stringify(device, null, 2),
        [{ text: 'OK' }]
      );
      addLog(`Probe completed for ${deviceId}`);
    } catch (error) {
      addLog(`Probe failed for ${deviceId}: ${error}`);
    }
  };

  const connectToDevice = async (deviceId: string) => {
    try {
      addLog(`Attempting to connect to ${deviceId}...`);
      await bleManager.pairDevice(deviceId);
      addLog(`Successfully connected to ${deviceId}`);
    } catch (error) {
      addLog(`Connection failed for ${deviceId}: ${error}`);
    }
  };

  const renderDevice = (device: DebugDevice) => (
    <View key={device.id} style={[styles.deviceCard, device.identified && styles.identifiedDevice]}>
      <Text style={styles.deviceName}>
        {device.name || device.localName || 'Unnamed Device'}
      </Text>
      <Text style={styles.deviceId}>ID: {device.id}</Text>
      {device.rssi && <Text style={styles.deviceInfo}>RSSI: {device.rssi} dBm</Text>}
      
      {device.identified && (
        <Text style={styles.deviceType}>Type: {device.deviceType}</Text>
      )}
      
      {device.serviceUUIDs && device.serviceUUIDs.length > 0 && (
        <Text style={styles.deviceInfo}>
          Services: {device.serviceUUIDs.slice(0, 3).join(', ')}
          {device.serviceUUIDs.length > 3 && '...'}
        </Text>
      )}
      
      {device.manufacturerData && device.manufacturerData.length > 0 && (
        <Text style={styles.deviceInfo}>
          Manufacturer: {device.manufacturerData.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join(' ')}
        </Text>
      )}
      
      <View style={styles.deviceActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => probeDevice(device.id)}
        >
          <Text style={styles.actionButtonText}>Debug</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.connectButton]} 
          onPress={() => connectToDevice(device.id)}
        >
          <Text style={styles.actionButtonText}>Connect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBondedDevice = (device: DeviceCandidate) => (
    <View key={device.id} style={[styles.deviceCard, styles.bondedDevice]}>
      <Text style={styles.deviceName}>{device.name} (BONDED)</Text>
      <Text style={styles.deviceId}>ID: {device.id}</Text>
      <Text style={styles.deviceType}>Type: {device.deviceType}</Text>
      {device.rssi && <Text style={styles.deviceInfo}>RSSI: {device.rssi} dBm</Text>}
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.connectButton]} 
        onPress={() => connectToDevice(device.id)}
      >
        <Text style={styles.actionButtonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mi Band Debug Tool</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controls</Text>
        <TouchableOpacity 
          style={[styles.button, isScanning && styles.buttonDisabled]} 
          onPress={startScan}
          disabled={isScanning}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={loadBondedDevices}
        >
          <Text style={styles.buttonText}>Refresh Bonded Devices</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setLogs([])}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      {bondedDevices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bonded Devices ({bondedDevices.length})</Text>
          {bondedDevices.map(renderBondedDevice)}
        </View>
      )}
      
      {devices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Scanned Devices ({devices.length}) - Identified: {devices.filter(d => d.identified).length}
          </Text>
          {devices.map(renderDevice)}
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Logs</Text>
        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deviceCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  identifiedDevice: {
    borderLeftColor: '#4CAF50',
  },
  bondedDevice: {
    borderLeftColor: '#FF9800',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deviceInfo: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  deviceActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    maxHeight: 200,
  },
  logText: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});


export default MiBandDebugComponent;