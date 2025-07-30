import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons'; // ✅ Feather icon set

export default function PaymentInfoModal() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Payment Information</Text>
        
        <View style={styles.infoSection}>
          <Feather name="dollar-sign" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            Please make payment to:
          </Text>
          <Text style={styles.accountInfo}>
            bsp.sparton@sbi
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Feather name="phone" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            For further details, call:
          </Text>
          <Text style={styles.phoneNumber}>
            7099220645
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginTop: 8,
    marginBottom: 4,
  },
  accountInfo: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
  },
  phoneNumber: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
});
