import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { dataService } from '@/lib/services';
import { formatDistanceToNow } from 'date-fns';

interface Auction {
  id: string;
  title: string;
  description: string;
  status: string;
  end_time: string;
  vehicle_type: string;
  created_by: string;
  winner_id: string | null;
  start_time: string;
  consignment_date: string;
}

interface User {
  id: string;
  role: string;
  vehicle_type?: string;
}

interface AuctionsListProps {
  vehicleTypeFilter?: string;
}

export default function AuctionsList({ vehicleTypeFilter }: AuctionsListProps) {
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const loadData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);

      // Check for expired auctions first
      await dataService.checkExpiredAuctions();

      // Get current user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace('/sign-in');
        return;
      }

      // Get user profile
      const profile = await dataService.getUserProfile(authUser.id);
      if (profile) {
        setUser({
          id: authUser.id,
          role: profile.role,
          vehicle_type: profile.vehicle_type || undefined,
        });

        // Load auctions based on user role
        let auctionsData: Auction[] = [];

        if (profile.role === 'driver') {
          // Load available auctions for drivers
          auctionsData = await dataService.getAvailableAuctions(
            vehicleTypeFilter
          );
        } else {
          // Load user's own auctions for consigners
          auctionsData = await dataService.getUserAuctions(authUser.id);
        }

        setAuctions(auctionsData);
      }
    } catch (err) {
      console.error('Error loading auctions:', err);
      setError('Failed to load auctions');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [vehicleTypeFilter]);

  const handleRefresh = () => {
    loadData(true);
  };

  const getStatusColor = (auction: Auction) => {
    if (auction.status === 'active') {
      return new Date(auction.end_time) > new Date() ? '#28A745' : '#DC3545';
    }
    return auction.status === 'completed' ? '#007AFF' : '#6C757D';
  };

  const getStatusText = (auction: Auction) => {
    if (auction.status === 'active') {
      return new Date(auction.end_time) > new Date() ? 'Active' : 'Expired';
    }
    return auction.status.charAt(0).toUpperCase() + auction.status.slice(1);
  };

  const renderAuction = ({ item: auction }: { item: Auction }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/auctions/${auction.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {auction.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(auction) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(auction)}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {auction.description}
      </Text>

      <View style={styles.infoRow}>
        <Feather name="truck" size={16} color="#6C757D" />
        <Text style={styles.infoText}>
          {auction.vehicle_type
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Feather name="clock" size={16} color="#6C757D" />
        <Text style={styles.infoText}>
          Ends{' '}
          {formatDistanceToNow(new Date(auction.end_time), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading auctions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#DC3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (auctions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="inbox" size={48} color="#6C757D" />
        <Text style={styles.emptyTitle}>No Auctions Found</Text>
        <Text style={styles.emptyText}>
          {user?.role === 'driver'
            ? 'No active auctions available at the moment'
            : "You haven't created any auctions yet"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={auctions}
      renderItem={renderAuction}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#007AFF']}
        />
      }
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6C757D',
  },
});
