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
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

import { supabase } from '@/lib/supabase';

interface Bid {
  id: string;
  amount: number;
  created_at: string | null;
  is_winning_bid: boolean | null;
  auction: {
    id: string;
    title: string;
    description: string;
    status: string;
    end_time: string;
    vehicle_type: string;
    consignment_date: string;
  } | null;
}

const VEHICLE_TYPES = [
  { id: 'three_wheeler', label: '3 Wheeler' },
  { id: 'pickup_truck', label: 'Pickup Truck' },
  { id: 'mini_truck', label: 'Mini Truck' },
  { id: 'medium_truck', label: 'Medium Truck' },
  { id: 'large_truck', label: 'Large Truck' },
];

export default function DriverHistoryScreen() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) return;

      setUser(currentUser);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, []);

  const fetchDriverHistory = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      // Fetch driver's bids with auction details
      const { data: userBids, error: bidsError } = await supabase
        .from('auction_bids')
        .select(
          `
          id,
          amount,
          created_at,
          is_winning_bid,
          auction:auctions(
            id,
            title,
            description,
            status,
            end_time,
            vehicle_type,
            consignment_date
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bidsError) throw bidsError;

      setBids(userBids || []);
    } catch (err) {
      console.error('Error fetching driver history:', err);
      setError('Failed to load your bid history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (user) {
      fetchDriverHistory();
    }
  }, [user, fetchDriverHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDriverHistory();
  }, [fetchDriverHistory]);

  const getVehicleTypeLabel = (vehicleType: string) => {
    const type = VEHICLE_TYPES.find(t => t.id === vehicleType);
    return type ? type.label : vehicleType;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22C55E';
      case 'cancelled':
        return '#EF4444';
      case 'active':
        return '#3B82F6';
      case 'expired':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'x-circle';
      case 'active':
        return 'clock';
      case 'expired':
        return 'alert-circle';
      default:
        return 'circle';
    }
  };

  const renderBidCard = (bid: Bid) => {
    if (!bid.auction) return null;

    return (
      <View key={bid.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.auctionTitle} numberOfLines={1}>
              {bid.auction.title}
            </Text>
            <Text style={styles.vehicleType}>
              {getVehicleTypeLabel(bid.auction.vehicle_type)}
            </Text>
          </View>
          <View style={styles.badgeContainer}>
            {bid.is_winning_bid && (
              <View style={styles.winnerBadge}>
                <Feather name="award" size={12} color="white" />
                <Text style={styles.winnerText}>Won</Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(bid.auction.status) },
              ]}
            >
              <Feather
                name={getStatusIcon(bid.auction.status) as any}
                size={12}
                color="white"
              />
              <Text style={styles.statusText}>
                {bid.auction.status.charAt(0).toUpperCase() +
                  bid.auction.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {bid.auction.description}
        </Text>

        <View style={styles.bidDetails}>
          <View style={styles.bidAmountContainer}>
            <Feather name="dollar-sign" size={16} color="#22C55E" />
            <Text style={styles.bidLabel}>Your Bid:</Text>
            <Text style={styles.bidAmount}>₹{bid.amount.toLocaleString()}</Text>
          </View>
          <Text style={styles.bidTime}>
            {bid.created_at &&
              format(new Date(bid.created_at), 'MMM dd, yyyy HH:mm')}
          </Text>
        </View>

        <View style={styles.auctionDetails}>
          <View style={styles.detailItem}>
            <Feather name="calendar" size={14} color="#6B7280" />
            <Text style={styles.detailLabel}>Consignment:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(bid.auction.consignment_date), 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="clock" size={14} color="#6B7280" />
            <Text style={styles.detailLabel}>End Time:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(bid.auction.end_time), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bid history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Bid History</Text>
          <Text style={styles.subtitle}>
            Your bidding activity and job history
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {bids.length === 0 && !error ? (
          <View style={styles.emptyContainer}>
            <Feather name="briefcase" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Bid History</Text>
            <Text style={styles.emptyText}>
              Your completed bids will appear here once you start bidding on
              auctions
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>{bids.map(renderBidCard)}</View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: 'white',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  auctionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 14,
    color: '#6B7280',
  },
  badgeContainer: {
    gap: 8,
    alignItems: 'flex-end',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    gap: 4,
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  bidDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bidAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22C55E',
  },
  bidTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  auctionDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
