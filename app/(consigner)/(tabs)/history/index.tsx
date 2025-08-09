import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';

import { supabase } from '@/lib/supabase';

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
  created_at?: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)/sign-in');
        return;
      }

      // Fetch user's non-active auctions (completed, cancelled) and expired active auctions
      const { data: userAuctions, error: auctionsError } = await supabase
        .from('auctions')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (auctionsError) {
        throw auctionsError;
      }

      // Filter for completed, cancelled, or expired auctions
      const historyAuctions =
        (userAuctions as Auction[])?.filter(auction => {
          const endTime = new Date(auction.end_time);
          const isExpired = isPast(endTime);

          return (
            auction.status === 'completed' ||
            auction.status === 'cancelled' ||
            (auction.status === 'active' && isExpired)
          );
        }) || [];

      setAuctions(historyAuctions);
    } catch {
      setError('Failed to load auction history. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const getAuctionStatusColor = (auction: Auction) => {
    if (auction.status === 'active') {
      // Check if auction is expired
      if (isPast(new Date(auction.end_time))) {
        return '#DC3545'; // Red for expired
      }
      return '#28A745'; // Green for active (shouldn't happen in history)
    } else if (auction.status === 'completed') {
      return '#007AFF'; // Blue for completed
    } else if (auction.status === 'cancelled') {
      return '#DC3545'; // Red for cancelled
    }
    return '#6C757D'; // Gray for unknown
  };

  const getAuctionStatusText = (auction: Auction) => {
    if (auction.status === 'active') {
      // Check if auction is expired
      if (isPast(new Date(auction.end_time))) {
        return 'Expired';
      }
      return 'Active';
    }
    return auction.status.charAt(0).toUpperCase() + auction.status.slice(1);
  };

  const getStatusDescription = (auction: Auction) => {
    if (auction.status === 'completed') {
      return auction.winner_id ? 'Sold successfully' : 'Completed without sale';
    } else if (auction.status === 'cancelled') {
      return 'Cancelled by consigner';
    } else if (
      auction.status === 'active' &&
      isPast(new Date(auction.end_time))
    ) {
      return auction.winner_id ? 'Expired - had bids' : 'Expired - no bids';
    }
    return '';
  };

  const renderHistoryAuctions = () => {
    if (auctions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="archive" size={48} color="#6C757D" />
          <Text style={styles.emptyStateTitle}>No Auction History</Text>
          <Text style={styles.emptyStateText}>
            Your completed, cancelled, and expired auctions will appear here
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(consigner)/(tabs)/create')}
          >
            <Text style={styles.createButtonText}>Create Auction</Text>
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    return auctions.map(auction => (
      <TouchableOpacity
        key={auction.id}
        style={styles.card}
        onPress={() =>
          router.push(`/(consigner)/(tabs)/auctions/${auction.id}`)
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{auction.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getAuctionStatusColor(auction) },
            ]}
          >
            <Text style={styles.statusText}>
              {getAuctionStatusText(auction)}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {auction.description}
        </Text>

        <View style={styles.vehicleInfo}>
          <Feather name="truck" size={16} color="#6C757D" />
          <Text style={styles.vehicleType}>
            {auction.vehicle_type
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Text>
        </View>

        <View style={styles.statusInfo}>
          <Feather name="info" size={16} color="#6C757D" />
          <Text style={styles.statusDescription}>
            {getStatusDescription(auction)}
          </Text>
        </View>

        <View style={styles.timeInfo}>
          <Feather name="clock" size={16} color="#6C757D" />
          <Text style={styles.timeText}>
            {auction.status === 'completed'
              ? `Completed ${format(
                  new Date(auction.end_time),
                  'MMM d, h:mm a'
                )}`
              : auction.status === 'cancelled'
              ? `Cancelled ${format(
                  new Date(auction.end_time),
                  'MMM d, h:mm a'
                )}`
              : `Expired ${format(
                  new Date(auction.end_time),
                  'MMM d, h:mm a'
                )}`}
          </Text>
        </View>
      </TouchableOpacity>
    ));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {renderHistoryAuctions()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginBottom: 12,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleType: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDescription: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
});
