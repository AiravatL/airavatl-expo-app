import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';

const VEHICLE_TYPE_MAPPING = {
  Truck: 'large_truck',
  Pickup: 'pickup_truck',
  '3 Wheeler': 'three_wheeler',
  'Mini Truck': 'mini_truck',
  'Large Truck': 'large_truck',
  LCV: 'pickup_truck',
  Tempo: 'mini_truck',
  'Medium Truck': 'medium_truck',
};

export default function FixDriverVehicleTypes() {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const fixDriverVehicleTypes = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setLogs([]);
    addLog('🔧 Starting driver vehicle type migration...');

    try {
      // Get all drivers with NULL vehicle_type
      const { data: drivers, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username, bio, vehicle_type')
        .eq('role', 'driver')
        .is('vehicle_type', null);

      if (fetchError) {
        addLog(`❌ Error fetching drivers: ${fetchError.message}`);
        return;
      }

      if (!drivers || drivers.length === 0) {
        addLog('✅ No drivers with NULL vehicle_type found');
        return;
      }

      addLog(`📋 Found ${drivers.length} drivers with NULL vehicle_type`);

      let successCount = 0;
      let skipCount = 0;

      for (const driver of drivers) {
        let vehicleType: string | null = null;

        // Parse vehicle type from bio
        if (driver.bio) {
          for (const [bioText, dbValue] of Object.entries(
            VEHICLE_TYPE_MAPPING
          )) {
            if (driver.bio.includes(`Vehicle Type: ${bioText}`)) {
              vehicleType = dbValue;
              break;
            }
          }
        }

        if (!vehicleType) {
          addLog(
            `⚠️  Could not determine vehicle type for ${driver.username}, setting to pickup_truck`
          );
          vehicleType = 'pickup_truck'; // Default fallback
        }

        // Update the driver's vehicle_type
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ vehicle_type: vehicleType })
          .eq('id', driver.id);

        if (updateError) {
          addLog(
            `❌ Failed to update ${driver.username}: ${updateError.message}`
          );
          skipCount++;
        } else {
          addLog(`✅ Updated ${driver.username}: ${vehicleType}`);
          successCount++;
        }
      }

      addLog(`\n📊 Migration Results:`);
      addLog(`✅ Successfully updated: ${successCount} drivers`);
      addLog(`❌ Failed to update: ${skipCount} drivers`);
      addLog(`📋 Total processed: ${drivers.length} drivers`);

      Alert.alert(
        'Migration Complete',
        `Successfully updated ${successCount} drivers. Check logs for details.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      addLog(`❌ Migration failed: ${error}`);
      Alert.alert('Error', 'Migration failed. Check logs for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fix Driver Vehicle Types</Text>
        <Text style={styles.subtitle}>
          This will update missing vehicle types for drivers based on their bio
          information
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={fixDriverVehicleTypes}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Processing...' : 'Fix Vehicle Types'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Activity Log:</Text>
        <View style={styles.logsBox}>
          {logs.length === 0 ? (
            <Text style={styles.noLogsText}>
              No activity yet. Click the button to start.
            </Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  logsContainer: {
    margin: 20,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  logsBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
  },
  noLogsText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
  logText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
