import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: 'https://images.pexels.com/photos/2199293/pexels-photo-2199293.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
        style={styles.headerImage}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>About AiravatL</Text>
        
        <Text style={styles.description}>
          AiravatL is revolutionizing logistics in Guwahati through our innovative auction-based delivery platform. We connect businesses and individuals with reliable delivery partners, ensuring efficient and cost-effective transportation solutions.
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Feather name="truck" size={32} color="#007AFF" />
            <Text style={styles.statNumber}>2,500+</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>

          <View style={styles.statCard}>
            <Feather name="users" size={32} color="#34C759" />
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Partners</Text>
          </View>

          <View style={styles.statCard}>
            <Feather name="shield" size={32} color="#5856D6" />
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            To transform logistics in Northeast India by creating a transparent, efficient, and reliable delivery ecosystem that empowers businesses and delivery partners alike.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Vision</Text>
          <Text style={styles.sectionText}>
            To become the most trusted logistics platform in Northeast India, known for innovation, reliability, and exceptional service quality.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Values</Text>
          
          <View style={styles.valueCard}>
            <Text style={styles.valueTitle}>Transparency</Text>
            <Text style={styles.valueDescription}>
              We believe in complete transparency in our operations, pricing, and communication.
            </Text>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valueTitle}>Reliability</Text>
            <Text style={styles.valueDescription}>
              We are committed to providing consistent and dependable service to all our stakeholders.
            </Text>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valueTitle}>Innovation</Text>
            <Text style={styles.valueDescription}>
              We continuously innovate to improve our services and solve logistics challenges.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  sectionText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    lineHeight: 24,
  },
  valueCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  valueTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  valueDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    lineHeight: 24,
  },
});