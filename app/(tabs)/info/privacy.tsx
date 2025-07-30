import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.text}>
            We collect information that you provide directly to us, including:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Name and contact information</Text>
            <Text style={styles.listItem}>• Account credentials</Text>
            <Text style={styles.listItem}>• Profile information</Text>
            <Text style={styles.listItem}>• Transaction data</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.text}>
            We use the information we collect to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Provide and maintain our services</Text>
            <Text style={styles.listItem}>• Process your transactions</Text>
            <Text style={styles.listItem}>• Send you service-related communications</Text>
            <Text style={styles.listItem}>• Improve our services</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.text}>
            We do not sell your personal information. We may share your information with:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Service providers</Text>
            <Text style={styles.listItem}>• Legal authorities when required</Text>
            <Text style={styles.listItem}>• Business partners with your consent</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.text}>
            We implement appropriate security measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.text}>
            You have the right to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Access your personal information</Text>
            <Text style={styles.listItem}>• Correct inaccurate information</Text>
            <Text style={styles.listItem}>• Request deletion of your information</Text>
            <Text style={styles.listItem}>• Opt-out of marketing communications</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact us at privacy@airavatl.com
          </Text>
        </View>

        <Text style={styles.lastUpdated}>
          Last updated: May 24, 2025
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 12,
  },
  list: {
    marginLeft: 8,
  },
  listItem: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginTop: 24,
    textAlign: 'center',
  },
});