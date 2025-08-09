import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
  pickup_location?: string;
  delivery_location?: string;
  minimum_bid?: number;
  created_at?: string;
}

interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  is_winning_bid: boolean | null;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)/sign-in');
        return;
      }

      setCurrentUserId(user.id);

      // Fetch auction details
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', id)
        .single();

      if (auctionError) {
        console.error('Error fetching auction:', auctionError);
        return;
      }

      setAuction(auctionData);

      // Fetch all bids for this auction
      const { data: bidsData, error: bidsError } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('auction_id', id)
        .order('amount', { ascending: false });

      if (bidsError) {
        console.error('Error fetching bids:', bidsError);
      } else {
        setBids(bidsData || []);
        // Find current user's bid
        const userBid = bidsData?.find(bid => bid.user_id === user.id);
        setMyBid(userBid || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handlePlaceBid = async () => {
    if (!auction || !bidAmount || !currentUserId) return;

    try {
      setIsPlacingBid(true);
      const amount = parseFloat(bidAmount);

      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid bid amount');
        return;
      }

      // Check if auction is still active before placing bid
      if (auction.status !== 'active' || isPast(new Date(auction.end_time))) {
        Alert.alert('Error', 'This auction has ended');
        await fetchData();
        return;
      }

      if (myBid) {
        // Update existing bid
        const { error } = await supabase
          .from('auction_bids')
          .update({ amount: amount })
          .eq('id', myBid.id);

        if (error) {
          throw new Error(error.message || 'Failed to update bid');
        }

        Alert.alert('Success', 'Your bid has been updated successfully!');
      } else {
        // Create new bid
        const { error } = await supabase.from('auction_bids').insert({
          auction_id: auction.id,
          user_id: currentUserId,
          amount: amount,
        });

        if (error) {
          throw new Error(error.message || 'Failed to place bid');
        }

        Alert.alert('Success', 'Your bid has been placed successfully!');
      }

      setBidAmount('');
      await fetchData();
    } catch (error) {
      console.error('Error placing bid:', error);
      Alert.alert('Error', 'Failed to place bid. Please try again.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleWithdrawBid = async () => {
    if (!myBid) return;

    Alert.alert(
      'Withdraw Bid',
      'Are you sure you want to withdraw your bid? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsPlacingBid(true);

              const { error } = await supabase
                .from('auction_bids')
                .delete()
                .eq('id', myBid.id);

              if (error) {
                throw error;
              }

              Alert.alert(
                'Success',
                'Your bid has been withdrawn successfully'
              );
              setBidAmount('');
              await fetchData();
            } catch (error) {
              console.error('Error withdrawing bid:', error);
              Alert.alert('Error', 'Failed to withdraw bid. Please try again.');
            } finally {
              setIsPlacingBid(false);
            }
          },
        },
      ]
    );
  };

  const getAuctionStatus = () => {
    if (!auction) return { text: 'Unknown', color: '#6C757D' };

    if (auction.status === 'active') {
      if (isPast(new Date(auction.end_time))) {
        return { text: 'Expired', color: '#DC3545' };
      }
      return { text: 'Active', color: '#28A745' };
    } else if (auction.status === 'completed') {
      return { text: 'Completed', color: '#007AFF' };
    } else if (auction.status === 'cancelled') {
      return { text: 'Cancelled', color: '#DC3545' };
    }
    return { text: auction.status, color: '#6C757D' };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getAuctionStatus();
  const isActive =
    auction.status === 'active' && !isPast(new Date(auction.end_time));
  const highestBid =
    bids.length > 0 ? bids[0].amount : auction.minimum_bid || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{auction.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Description</Text>
        <Text style={styles.description}>{auction.description}</Text>
      </View>

      {/* Job Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Job Details</Text>

        <View style={styles.detailRow}>
          <Feather name="truck" size={20} color="#6C757D" />
          <Text style={styles.detailLabel}>Vehicle Type:</Text>
          <Text style={styles.detailValue}>
            {auction.vehicle_type
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="calendar" size={20} color="#6C757D" />
          <Text style={styles.detailLabel}>Consignment Date:</Text>
          <Text style={styles.detailValue}>
            {format(new Date(auction.consignment_date), 'MMM d, yyyy')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="clock" size={20} color="#6C757D" />
          <Text style={styles.detailLabel}>Bidding Ends:</Text>
          <Text style={styles.detailValue}>
            {format(new Date(auction.end_time), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>

        {auction.pickup_location && (
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={20} color="#6C757D" />
            <Text style={styles.detailLabel}>Pickup:</Text>
            <Text style={styles.detailValue}>{auction.pickup_location}</Text>
          </View>
        )}

        {auction.delivery_location && (
          <View style={styles.detailRow}>
            <Feather name="navigation" size={20} color="#6C757D" />
            <Text style={styles.detailLabel}>Delivery:</Text>
            <Text style={styles.detailValue}>{auction.delivery_location}</Text>
          </View>
        )}
      </View>

      {/* Bidding Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Bidding</Text>

        <View style={styles.bidInfo}>
          <Text style={styles.bidLabel}>
            {bids.length > 0 ? 'Highest Bid' : 'Minimum Bid'}:
          </Text>
          <Text style={styles.bidAmount}>${highestBid.toFixed(2)}</Text>
        </View>

        {myBid && (
          <View style={styles.myBidInfo}>
            <Text style={styles.myBidLabel}>Your Bid:</Text>
            <Text style={styles.myBidAmount}>${myBid.amount.toFixed(2)}</Text>
          </View>
        )}

        {isActive && (
          <View style={styles.bidForm}>
            <Text style={styles.bidFormLabel}>
              {myBid ? 'Update Your Bid' : 'Place Your Bid'}
            </Text>
            <Text style={styles.bidHint}>
              {myBid
                ? `Current bid: $${myBid.amount.toFixed(
                    2
                  )} - Enter a higher amount to update`
                : `Minimum bid: $${(highestBid + 1).toFixed(2)}`}
            </Text>
            <View style={styles.bidInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.bidInput}
                value={bidAmount}
                onChangeText={text => {
                  // Allow only numbers and decimal point
                  const cleanText = text.replace(/[^0-9.]/g, '');
                  setBidAmount(cleanText);
                }}
                placeholder={`${(highestBid + 1).toFixed(2)}`}
                keyboardType="decimal-pad"
                editable={!isPlacingBid}
                maxLength={10}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.bidButton,
                myBid ? styles.updateBidButton : styles.placeBidButton,
                { opacity: isPlacingBid ? 0.6 : 1 },
              ]}
              onPress={handlePlaceBid}
              disabled={isPlacingBid}
            >
              {isPlacingBid ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather
                    name={myBid ? 'edit-2' : 'plus'}
                    size={20}
                    color="#FFFFFF"
                    style={styles.bidButtonIcon}
                  />
                  <Text style={styles.bidButtonText}>
                    {myBid ? 'Update Bid' : 'Place Bid'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {myBid && (
              <TouchableOpacity
                style={styles.withdrawBidButton}
                onPress={handleWithdrawBid}
                disabled={isPlacingBid}
              >
                <Feather name="x-circle" size={16} color="#DC3545" />
                <Text style={styles.withdrawBidText}>Withdraw Bid</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isActive && (
          <View style={styles.inactiveBidding}>
            <Text style={styles.inactiveBiddingText}>
              {auction.status === 'completed'
                ? 'This job has been completed'
                : auction.status === 'cancelled'
                ? 'This job has been cancelled'
                : 'Bidding has ended for this job'}
            </Text>
          </View>
        )}
      </View>

      {/* Bid History */}
      {bids.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bid History</Text>
          {bids.slice(0, 5).map((bid, index) => (
            <View key={bid.id} style={styles.bidHistoryItem}>
              <View style={styles.bidRank}>
                <Text style={styles.bidRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.bidHistoryContent}>
                <Text style={styles.bidHistoryAmount}>
                  ${bid.amount.toFixed(2)}
                </Text>
                <Text style={styles.bidHistoryTime}>
                  {format(new Date(bid.created_at), 'MMM d, h:mm a')}
                </Text>
              </View>
              {bid.user_id === currentUserId && (
                <View style={styles.yourBidBadge}>
                  <Text style={styles.yourBidText}>You</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
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
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  header: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#6C757D',
    marginLeft: 12,
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    flex: 1,
  },
  bidInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bidLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#6C757D',
  },
  bidAmount: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#34C759',
  },
  myBidInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  myBidLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#0369A1',
  },
  myBidAmount: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#0369A1',
  },
  bidForm: {
    marginTop: 16,
  },
  bidFormLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  bidHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginBottom: 12,
  },
  bidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
    marginRight: 8,
  },
  bidInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: '#1C1C1E',
    paddingVertical: 12,
  },
  bidButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeBidButton: {
    backgroundColor: '#34C759',
  },
  updateBidButton: {
    backgroundColor: '#007AFF',
  },
  bidButtonIcon: {
    marginRight: 8,
  },
  bidButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  withdrawBidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  withdrawBidText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#DC3545',
    marginLeft: 6,
  },
  inactiveBidding: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  inactiveBiddingText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#6C757D',
    textAlign: 'center',
  },
  bidHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bidRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bidRankText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
  },
  bidHistoryContent: {
    flex: 1,
  },
  bidHistoryAmount: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  bidHistoryTime: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  yourBidBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yourBidText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
