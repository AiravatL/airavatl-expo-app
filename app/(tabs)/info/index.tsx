import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function InfoScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push('/info/privacy')}>
          <Feather name="shield" size={24} color="#007AFF" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Privacy Policy</Text>
            <Text style={styles.cardDescription}>
              Learn about how we protect your data and privacy
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push('/info/about')}>
          <Feather name="info" size={24} color="#34C759" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>About Us</Text>
            <Text style={styles.cardDescription}>
              Learn more about AiravatL and our mission
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push('/info/contact')}>
          <Feather name="mail" size={24} color="#5856D6" />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Contact Us</Text>
            <Text style={styles.cardDescription}>
              Get in touch with our support team
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
});