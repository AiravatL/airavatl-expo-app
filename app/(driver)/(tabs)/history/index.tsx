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

// Utility function for Indian numbering system
const formatIndianNumber = (num: number): string => {
  const numStr = num.toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);
  if (otherNumbers !== '') {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    return lastThree;
  }
};

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

interface Bid {
  id: string;
  amount: number;
  status: string;
  created_at: string | null;
  is_winning_bid: boolean | null;
  auction: Auction | null;
  user_id: string;
  auction_id: string;
}

export default function DriverHistoryScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
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

      // Fetch user's bids with auction data
      const { data: userBids, error: bidsError } = await supabase
        .from('auction_bids')
        .select(
          `
          *,
          auction:auctions!auction_id (*)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bidsError) {
        throw bidsError;
      }

      // Convert the bid data to match our interface
      const convertedBids: Bid[] = (userBids || []).map((bid: any) => ({
        id: bid.id,
        amount: bid.amount,
        status: 'active', // Default status for bids
        created_at: bid.created_at,
        is_winning_bid: bid.is_winning_bid,
        user_id: bid.user_id,
        auction_id: bid.auction_id,
        auction: bid.auction
          ? {
              id: bid.auction.id,
              title: bid.auction.title,
              description: bid.auction.description,
              status: bid.auction.status,
              end_time: bid.auction.end_time,
              vehicle_type: bid.auction.vehicle_type,
              created_by: bid.auction.created_by,
              winner_id: bid.auction.winner_id,
              start_time: bid.auction.start_time,
              consignment_date: bid.auction.consignment_date,
              created_at: bid.auction.created_at,
            }
          : null,
      }));

      // Filter bids to only show those with non-active auctions (completed, cancelled, expired)
      const historyBids = convertedBids.filter(bid => {
        if (!bid.auction) return false;

        const endTime = new Date(bid.auction.end_time);
        const isExpired = isPast(endTime);

        return (
          bid.auction.status === 'completed' ||
          bid.auction.status === 'cancelled' ||
          (bid.auction.status === 'active' && isExpired)
        );
      });

      setBids(historyBids);
    } catch {
      setError('Failed to load bid history. Please try again.');
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
      return '#34C759'; // Green for active (shouldn't happen in history)
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

  const getStatusDescription = (bid: Bid) => {
    if (!bid.auction) return 'Unknown status';

    const auction = bid.auction;

    if (auction.status === 'completed') {
      if (bid.is_winning_bid) {
        return 'You won this job!';
      } else if (auction.winner_id) {
        return 'Job completed - another driver won';
      } else {
        return 'Job completed - no winner selected';
      }
    } else if (auction.status === 'cancelled') {
      return 'Job cancelled by consigner';
    } else if (
      auction.status === 'active' &&
      isPast(new Date(auction.end_time))
    ) {
      if (bid.is_winning_bid) {
        return 'Expired - you had the winning bid';
      } else if (auction.winner_id) {
        return 'Expired - another driver won';
      } else {
        return 'Expired - no bids selected';
      }
    }
    return '';
  };

  const renderHistoryBids = () => {
    if (bids.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="archive" size={48} color="#6C757D" />
          <Text style={styles.emptyStateTitle}>No Bid History</Text>
          <Text style={styles.emptyStateText}>
            Your completed, cancelled, and expired bids will appear here
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(driver)/(tabs)/jobs')}
          >
            <Text style={styles.browseButtonText}>Browse Jobs</Text>
            <Feather name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    return bids.map(bid => {
      // Skip rendering if auction data is missing
      if (!bid.auction) {
        return null;
      }

      return (
        <TouchableOpacity
          key={bid.id}
          style={styles.card}
          onPress={() => {
            if (bid.auction) {
              router.push(`/(driver)/(tabs)/jobs/${bid.auction.id}`);
            }
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{bid.auction.title}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getAuctionStatusColor(bid.auction) },
              ]}
            >
              <Text style={styles.statusText}>
                {getAuctionStatusText(bid.auction)}
              </Text>
            </View>
          </View>

          {bid.is_winning_bid && (
            <View style={styles.winnerBadge}>
              <Feather name="award" size={16} color="#FFD700" />
              <Text style={styles.winnerText}>You Won!</Text>
            </View>
          )}

          <Text style={styles.description} numberOfLines={2}>
            {bid.auction.description}
          </Text>

          <View style={styles.vehicleInfo}>
            <Feather name="truck" size={16} color="#6C757D" />
            <Text style={styles.vehicleType}>
              {bid.auction.vehicle_type
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </Text>
          </View>

          <View style={styles.bidInfo}>
            <View style={styles.bidAmount}>
              <Feather name="credit-card" size={16} color="#34C759" />
              <Text style={styles.bidAmountText}>
                ₹{formatIndianNumber(bid.amount)}
              </Text>
            </View>
            <Text style={styles.bidTime}>
              {bid.created_at
                ? format(new Date(bid.created_at), 'MMM d, h:mm a')
                : 'Unknown date'}
            </Text>
          </View>

          <View style={styles.statusInfo}>
            <Feather name="info" size={16} color="#6C757D" />
            <Text style={styles.statusDescription}>
              {getStatusDescription(bid)}
            </Text>
          </View>

          <View style={styles.timeInfo}>
            <Feather name="clock" size={16} color="#6C757D" />
            <Text style={styles.timeText}>
              {bid.auction.status === 'completed'
                ? `Completed ${format(
                    new Date(bid.auction.end_time),
                    'MMM d, h:mm a'
                  )}`
                : bid.auction.status === 'cancelled'
                ? `Cancelled ${format(
                    new Date(bid.auction.end_time),
                    'MMM d, h:mm a'
                  )}`
                : `Expired ${format(
                    new Date(bid.auction.end_time),
                    'MMM d, h:mm a'
                  )}`}
            </Text>
          </View>
        </TouchableOpacity>
      );
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
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
      {renderHistoryBids()}
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
    backgroundColor: '#34C759',
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
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  winnerText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFB100',
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
  bidInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidAmountText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#34C759',
  },
  bidTime: {
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
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
});
