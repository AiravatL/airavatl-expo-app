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

type Auction = {
  id: string;
  title: string;
  description: string;
  consignment_date: string;
  start_time: string;
  end_time: string;
  vehicle_type: string;
  status: string;
  created_at: string;
  created_by: string;
  auction_bids: {
    id: string;
    amount: number;
    user_id: string;
    profiles: {
      username: string;
      phone_number: string;
    };
  }[];
};

export default function ConsignerAuctionsScreen() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctions = async () => {
    try {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/sign-in');
        return;
      }

      const { data, error } = await supabase
        .from('auctions')
        .select(
          `
          *,
          auction_bids(
            id,
            amount,
            user_id,
            profiles(username, phone_number)
          )
        `
        )
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuctions(data || []);
    } catch (err: any) {
      console.error('Error fetching auctions:', err);
      setError(err.message || 'Failed to load auctions');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuctions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#3B82F6';
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

  const handleAuctionPress = (auctionId: string) => {
    router.push(`./${auctionId}`);
  };

  const handleCreateAuction = () => {
    router.push('./create');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading auctions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Failed to Load Auctions</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAuctions}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Auctions</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateAuction}
        >
          <Feather name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {auctions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="package" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Auctions Yet</Text>
            <Text style={styles.emptyText}>
              Create your first shipping auction to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreateAuction}
            >
              <Feather name="plus" size={16} color="white" />
              <Text style={styles.emptyButtonText}>Create Auction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.auctionsList}>
            {auctions.map(auction => (
              <TouchableOpacity
                key={auction.id}
                style={styles.auctionCard}
                onPress={() => handleAuctionPress(auction.id)}
              >
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

                <View style={styles.locationContainer}>
                  <View style={styles.locationRow}>
                    <Feather name="calendar" size={14} color="#059669" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      Consignment:{' '}
                      {format(
                        new Date(auction.consignment_date),
                        'MMM dd, yyyy'
                      )}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <Feather name="clock" size={14} color="#3B82F6" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      Bidding: {format(new Date(auction.start_time), 'MMM dd')}{' '}
                      - {format(new Date(auction.end_time), 'MMM dd')}
                    </Text>
                  </View>
                </View>

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
                      {format(new Date(auction.consignment_date), 'MMM dd')}
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
                  {auction.auction_bids.length > 0 && (
                    <View style={styles.highestBid}>
                      <Text style={styles.bidLabel}>Highest:</Text>
                      <Text style={styles.bidAmount}>
                        ₹
                        {Math.max(
                          ...auction.auction_bids.map(b => b.amount)
                        ).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.footerContainer}>
                  <Text style={styles.createdDate}>
                    Created{' '}
                    {format(new Date(auction.created_at), 'MMM dd, yyyy')}
                  </Text>
                  <Feather name="chevron-right" size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
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
  locationContainer: {
    marginBottom: 12,
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
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
  highestBid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bidLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  bidAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
