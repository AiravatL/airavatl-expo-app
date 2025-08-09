import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

type HistoryAuction = {
  id: string;
  title: string;
  description: string;
  consignment_date: string;
  end_time: string;
  vehicle_type: string;
  status: string;
  created_at: string;
  winner_id: string | null;
  winning_bid_id: string | null;
  auction_bids: {
    id: string;
    amount: number;
    user_id: string;
    profiles: {
      username: string;
      phone_number: string;
    };
  }[];
  winner_profile?: {
    username: string;
    phone_number: string;
  };
  winning_bid?: {
    amount: number;
  };
};

export default function ConsignerHistoryScreen() {
  const [auctions, setAuctions] = useState<HistoryAuction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>(
    'all'
  );

  const fetchHistory = async () => {
    try {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/sign-in');
        return;
      }

      let query = supabase
        .from('auctions')
        .select(
          `
          *,
          auction_bids(
            id,
            amount,
            user_id,
            profiles(username, phone_number)
          ),
          winner_profile:profiles!auctions_winner_id_fkey(username, phone_number),
          winning_bid:auction_bids!auctions_winning_bid_id_fkey(amount)
        `
        )
        .eq('created_by', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('end_time', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAuctions(data || []);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#059669';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const FilterButton = ({
    value,
    label,
  }: {
    value: typeof filter;
    label: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.activeFilterButton,
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[styles.filterText, filter === value && styles.activeFilterText]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Failed to Load History</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Auction History</Text>
      </View>

      <View style={styles.filterContainer}>
        <FilterButton value="all" label="All" />
        <FilterButton value="completed" label="Completed" />
        <FilterButton value="cancelled" label="Cancelled" />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {auctions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="clock" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>
              Your completed and cancelled auctions will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.auctionsList}>
            {auctions.map(auction => (
              <View key={auction.id} style={styles.auctionCard}>
                <View style={styles.auctionHeader}>
                  <Text style={styles.auctionTitle} numberOfLines={1}>
                    {auction.title}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(auction.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {auction.status.charAt(0).toUpperCase() +
                        auction.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.auctionDescription} numberOfLines={2}>
                  {auction.description}
                </Text>

                <View style={styles.detailsContainer}>
                  <View style={styles.detailItem}>
                    <Feather name="truck" size={14} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {getVehicleTypeLabel(auction.vehicle_type)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="calendar" size={14} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {format(
                        new Date(auction.consignment_date),
                        'MMM dd, yyyy'
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.bidsContainer}>
                  <View style={styles.bidsSummary}>
                    <Feather name="users" size={16} color="#3B82F6" />
                    <Text style={styles.bidsText}>
                      {auction.auction_bids.length} bid
                      {auction.auction_bids.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {auction.status === 'completed' && auction.winning_bid && (
                    <View style={styles.winningBid}>
                      <Text style={styles.winnerLabel}>Won by:</Text>
                      <Text style={styles.winnerAmount}>
                        ₹{auction.winning_bid.amount.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                {auction.status === 'completed' && auction.winner_profile && (
                  <View style={styles.winnerInfo}>
                    <Feather name="award" size={16} color="#F59E0B" />
                    <Text style={styles.winnerText}>
                      Winner: {auction.winner_profile.username}
                    </Text>
                    {auction.winner_profile.phone_number && (
                      <Text style={styles.winnerPhone}>
                        {auction.winner_profile.phone_number}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.footerContainer}>
                  <Text style={styles.endDate}>
                    Ended {format(new Date(auction.end_time), 'MMM dd, yyyy')}
                  </Text>
                  <Text style={styles.createdDate}>
                    Created {format(new Date(auction.created_at), 'MMM dd')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
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
  },
  auctionsList: {
    padding: 20,
    gap: 16,
  },
  auctionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  auctionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  auctionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
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
    color: 'white',
  },
  auctionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  bidsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bidsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidsText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  winningBid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  winnerLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  winnerAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  winnerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    flex: 1,
  },
  winnerPhone: {
    fontSize: 12,
    color: '#92400E',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  endDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  createdDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
