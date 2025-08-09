import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';

// Use Feather icons instead of lucide-react-native for compatibility
const FEATURES = [
  {
    icon: <Feather name="package" size={24} color="#007AFF" />,
    title: 'Smart Logistics',
    description:
      'Efficient routing and real-time tracking for all your shipments',
    highlight: '2,500+ Deliveries',
  },
  {
    icon: <Feather name="users" size={24} color="#34C759" />,
    title: 'Trusted Partners',
    description: 'Network of verified delivery partners across Guwahati',
    highlight: '500+ Partners',
  },
  {
    icon: <Feather name="check-circle" size={24} color="#5856D6" />,
    title: 'Reliable Service',
    description: 'Consistent and dependable delivery performance',
    highlight: '98% Success Rate',
  },
];

export default function ConsignerHomeScreen() {
  useEffect(() => {
    async function checkUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          console.log('User authenticated:', user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    checkUser();
  }, []);

  const handleCreateAuction = () => {
    router.push('./create');
  };

  const handleViewAuctions = () => {
    router.push('./auctions');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.subtitle}>
            Your trusted logistics partner in Guwahati
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateAuction}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Create Auction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewAuctions}
            >
              <Feather name="list" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>View My Auctions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Choose Us?</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureHeader}>
                {feature.icon}
                <Text style={styles.highlightText}>{feature.highlight}</Text>
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={handleCreateAuction}
          >
            <Feather name="plus-circle" size={32} color="#007AFF" />
            <Text style={styles.quickActionTitle}>Create New Auction</Text>
            <Text style={styles.quickActionDescription}>
              Start a new delivery auction
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={handleViewAuctions}
          >
            <Feather name="clock" size={32} color="#34C759" />
            <Text style={styles.quickActionTitle}>Active Auctions</Text>
            <Text style={styles.quickActionDescription}>
              View your ongoing auctions
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 40,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 24,
  },
  headerContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 24,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    gap: 8,
    width: '100%',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: Platform.OS === 'web' ? 'wrap' : 'nowrap',
    gap: 16,
  },
  featureCard: {
    width: Platform.OS === 'web' ? (width >= 768 ? '31%' : '100%') : '100%',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  highlightText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
  },
  featureTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    lineHeight: 20,
  },
  quickActionsSection: {
    padding: 24,
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  quickActionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  quickActionDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    textAlign: 'center',
  },
});
