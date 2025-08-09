import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';

import { supabase } from '@/lib/supabase';

interface Auction {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  winner_id: string | null;
  vehicle_type: string;
  consignment_date: string;
  created_at: string;
}

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    phone_number: string;
  };
}

export default function AuctionDetailScreen() {
  const params = useLocalSearchParams();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctionDetails = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch auction details
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', params.id)
        .single();

      if (auctionError) throw auctionError;
      setAuction(auctionData);

      // Fetch bids for this auction
      const { data: bidsData, error: bidsError } = await supabase
        .from('auction_bids')
        .select(`
          id,
          amount,
          created_at,
          user_id,
          profiles(username, phone_number)
        `)
        .eq('auction_id', params.id)
        .order('amount', { ascending: false });

      if (bidsError) throw bidsError;
      setBids(bidsData || []);

    } catch (err: any) {
      console.error('Error fetching auction details:', err);
      setError(err.message || 'Failed to load auction details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAuctionDetails();
  }, [params.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuctionDetails();
  };

  const handleEditAuction = () => {
    if (!auction) return;
    
    router.push({
      pathname: `./edit-auction`,
      params: {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        vehicleType: auction.vehicle_type,
      },
    });
  };

  const handleCancelAuction = () => {
    Alert.alert(
      'Cancel Auction',
      'Are you sure you want to cancel this auction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: cancelAuction },
      ]
    );
  };

  const cancelAuction = async () => {
    try {
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'cancelled' })
        .eq('id', params.id);

      if (error) throw error;

      Alert.alert('Success', 'Auction cancelled successfully');
      router.back();
    } catch (error) {
      console.error('Error cancelling auction:', error);
      Alert.alert('Error', 'Failed to cancel auction');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#34C759';
      case 'completed':
        return '#007AFF';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading auction details...</Text>
      </View>
    );
  }

  if (error || !auction) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorTitle}>Failed to Load Auction</Text>
        <Text style={styles.errorText}>{error || 'Auction not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAuctionDetails}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAuctionActive = auction.status === 'active' && !isPast(new Date(auction.end_time));
  const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.amount)) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auction Details</Text>
        {isAuctionActive && (
          <TouchableOpacity onPress={handleEditAuction} style={styles.editButton}>
            <Feather name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.auctionCard}>
          <View style={styles.auctionHeader}>
            <Text style={styles.auctionTitle}>{auction.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(auction.status) }]}>
              <Text style={styles.statusText}>
                {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={styles.auctionDescription}>{auction.description}</Text>

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Feather name="truck" size={16} color="#8E8E93" />
              <Text style={styles.detailLabel}>Vehicle Type:</Text>
              <Text style={styles.detailValue}>{getVehicleTypeLabel(auction.vehicle_type)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Feather name="calendar" size={16} color="#8E8E93" />
              <Text style={styles.detailLabel}>Consignment Date:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(auction.consignment_date), 'MMM dd, yyyy')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Feather name="clock" size={16} color="#8E8E93" />
              <Text style={styles.detailLabel}>Bidding Period:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(auction.start_time), 'MMM dd')} - {format(new Date(auction.end_time), 'MMM dd')}
              </Text>
            </View>
          </View>

          {isAuctionActive && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelAuction}>
              <Feather name="x-circle" size={16} color="#FF3B30" />
              <Text style={styles.cancelButtonText}>Cancel Auction</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bidsSection}>
          <View style={styles.bidsHeader}>
            <Text style={styles.bidsTitle}>Bids ({bids.length})</Text>
            {highestBid > 0 && (
              <Text style={styles.highestBidText}>
                Highest: ₹{highestBid.toLocaleString()}
              </Text>
            )}
          </View>

          {bids.length === 0 ? (
            <View style={styles.noBidsContainer}>
              <Feather name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.noBidsTitle}>No bids yet</Text>
              <Text style={styles.noBidsText}>
                Bids will appear here when drivers start bidding
              </Text>
            </View>
          ) : (
            <View style={styles.bidsList}>
              {bids.map((bid, index) => (
                <View key={bid.id} style={styles.bidCard}>
                  <View style={styles.bidHeader}>
                    <View style={styles.bidderInfo}>
                      <Feather name="user" size={16} color="#007AFF" />
                      <Text style={styles.bidderName}>{bid.profiles.username}</Text>
                      {index === 0 && (
                        <View style={styles.topBidBadge}>
                          <Text style={styles.topBidText}>TOP BID</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bidAmount}>₹{bid.amount.toLocaleString()}</Text>
                  </View>
                  
                  <View style={styles.bidFooter}>
                    <Text style={styles.bidTime}>
                      {format(new Date(bid.created_at), 'MMM dd, yyyy h:mm a')}
                    </Text>
                    <Text style={styles.bidderPhone}>{bid.profiles.phone_number}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F8F9FA',
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
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  auctionCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  auctionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  auctionTitle: {
    flex: 1,
    fontSize: 20,
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
    color: 'white',
  },
  auctionDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    width: 120,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
  },
  bidsSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bidsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bidsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  highestBidText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  noBidsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noBidsTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  noBidsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  bidsList: {
    padding: 16,
  },
  bidCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bidderName: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  topBidBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  topBidText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
  },
  bidFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  bidderPhone: {
    fontSize: 12,
    color: '#6B7280',
  },
});
