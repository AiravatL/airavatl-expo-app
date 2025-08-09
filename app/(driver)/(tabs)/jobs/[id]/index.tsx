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
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { format, isPast, formatDistanceToNow } from 'date-fns';

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

interface User {
  id: string;
  email?: string;
  username?: string;
  phone_number?: string | null;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    username: string;
    phone_number: string | null;
  } | null>(null);
  const [showCancelBidModal, setShowCancelBidModal] = useState(false);
  const [isCancellingBid, setIsCancellingBid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContactInfo = useCallback(
    async (auctionData: Auction) => {
      if (
        !auctionData ||
        auctionData.status !== 'completed' ||
        !auctionData.winner_id ||
        !currentUserId
      ) {
        return;
      }

      try {
        // Driver won the job - show consigner's contact info
        if (auctionData.winner_id === currentUserId) {
          const { data: contactData, error: contactError } = await supabase
            .from('profiles')
            .select('username, phone_number')
            .eq('id', auctionData.created_by)
            .single();

          if (contactError) {
            console.error('Error fetching contact info:', contactError);
          } else {
            setContactInfo(contactData);
          }
        }
      } catch (err) {
        console.error('Error fetching contact info:', err);
      }
    },
    [currentUserId]
  );

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

      setCurrentUserId(user.id);

      // Fetch auction details
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', id)
        .single();

      if (auctionError) {
        setError('Job not found');
        setAuction(null);
        setBids([]);
        return;
      }

      setAuction(auctionData);

      // Fetch bids for this auction with profile info
      const { data: bidsData, error: bidsError } = await supabase
        .from('auction_bids')
        .select(
          `
          *,
          profiles!auction_bids_user_id_fkey (
            id,
            username
          )
        `
        )
        .eq('auction_id', id)
        .order('amount', { ascending: true }); // In driver auction, lowest bid wins

      if (bidsError) {
        console.error('Error fetching bids:', bidsError);
        setBids([]);
      } else {
        setBids(bidsData || []);
        // Find current user's bid
        const userBid = bidsData?.find(bid => bid.user_id === user.id);
        setMyBid(userBid || null);
      }

      // Fetch contact info for completed jobs
      await fetchContactInfo(auctionData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load job details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id, router, fetchContactInfo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
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
        Alert.alert('Error', 'This job has ended');
        await fetchData();
        return;
      }

      // Only create new bids - no update functionality
      const { error: bidError } = await supabase
        .from('auction_bids')
        .insert({
          auction_id: auction.id,
          user_id: currentUserId,
          amount: amount,
        })
        .select()
        .single();

      if (bidError) {
        throw new Error(bidError.message || 'Failed to place bid');
      }

      setBidAmount('');
      await fetchData();
      Alert.alert('Success', 'Your bid has been placed successfully!');
    } catch (error) {
      console.error('Error placing bid:', error);
      Alert.alert('Error', 'Failed to place bid. Please try again.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleCancelBid = async () => {
    try {
      if (!currentUserId || !myBid) return;

      setIsCancellingBid(true);

      // Use the same RPC function as the older version
      const { error } = await (supabase as any).rpc('cancel_bid_by_driver', {
        p_bid_id: myBid.id,
        p_user_id: currentUserId,
      });

      if (error) throw error;

      // Immediately clear the bid state to allow placing a new bid
      setMyBid(null);
      setBidAmount('');

      // Close the modal and refresh data
      setShowCancelBidModal(false);
      await fetchData();

      Alert.alert('Success', 'Your bid has been cancelled successfully');
    } catch (error) {
      console.error('Error cancelling bid:', error);
      Alert.alert('Error', 'Failed to cancel bid. Please try again.');
    } finally {
      setIsCancellingBid(false);
    }
  };
  const handleCallContact = () => {
    if (contactInfo?.phone_number) {
      const phoneUrl = `tel:${contactInfo.phone_number}`;
      Linking.openURL(phoneUrl).catch(err => {
        console.error('Error opening phone app:', err);
        Alert.alert('Error', 'Unable to open phone app');
      });
    }
  };

  const renderCancelBidButton = () => {
    // Only show cancel bid button for drivers who have placed a bid on an active job
    // Match the older version's logic exactly
    if (
      !auction ||
      !myBid ||
      auction.status !== 'active' ||
      isPast(new Date(auction.end_time)) ||
      myBid.is_winning_bid
    ) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.cancelBidButton}
        onPress={() => setShowCancelBidModal(true)}
      >
        <Feather name="x-circle" size={20} color="#FFFFFF" />
        <Text style={styles.cancelBidButtonText}>Cancel My Bid</Text>
      </TouchableOpacity>
    );
  };

  const renderContactInfo = () => {
    if (
      !contactInfo ||
      auction?.status !== 'completed' ||
      !auction?.winner_id
    ) {
      return null;
    }

    // Only show contact info to winner (for consigner)
    const shouldShowContact = auction.winner_id === currentUserId;

    if (!shouldShowContact) {
      return null;
    }

    return (
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Consigner Contact</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Feather name="user" size={20} color="#34C759" />
              <Text style={styles.contactName}>{contactInfo.username}</Text>
            </View>
            {contactInfo.phone_number && (
              <View style={styles.contactRow}>
                <Feather name="phone" size={20} color="#34C759" />
                <Text style={styles.contactPhone}>
                  {contactInfo.phone_number}
                </Text>
              </View>
            )}
          </View>
          {contactInfo.phone_number && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallContact}
            >
              <Feather name="phone" size={20} color="#FFFFFF" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
        {!contactInfo.phone_number && (
          <Text style={styles.noPhoneText}>Phone number not available</Text>
        )}
      </View>
    );
  };

  const renderJobStatus = () => {
    if (!auction) return null;

    let statusColor = '#6C757D';
    let statusText = 'Unknown';

    if (auction.status === 'active') {
      // Check if job should be expired
      if (isPast(new Date(auction.end_time))) {
        statusColor = '#DC3545';
        statusText = 'Expired';
      } else {
        statusColor = '#34C759';
        statusText = 'Active';
      }
    } else if (auction.status === 'completed') {
      statusColor = '#007AFF';
      statusText = 'Completed';
    } else if (auction.status === 'cancelled') {
      statusColor = '#DC3545';
      statusText = 'Cancelled';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    );
  };

  const renderBidsList = () => {
    if (!bids.length) {
      return (
        <View style={styles.noBidsContainer}>
          <Text style={styles.noBidsText}>No bids yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.bidsContainer}>
        <Text style={styles.bidsTitle}>Bids ({bids.length})</Text>
        {bids.map((bid, index) => (
          <View key={bid.id} style={styles.bidItem}>
            <View style={styles.bidderInfo}>
              <Text style={styles.bidderName}>
                {bid.user_id === currentUserId ? 'You' : 'Driver'}
              </Text>
              <Text style={styles.bidAmount}>
                ₹{formatIndianNumber(bid.amount)}
              </Text>
            </View>
            {bid.is_winning_bid && (
              <View style={styles.winningBadge}>
                <Feather name="award" size={16} color="#FFD700" />
                <Text style={styles.winningText}>Winner</Text>
              </View>
            )}
            <Text style={styles.bidTime}>
              {format(new Date(bid.created_at), 'MMM d, h:mm a')}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderWinnerSection = () => {
    if (!auction || auction.status !== 'completed' || !auction.winner_id)
      return null;

    const winningBid = bids.find(bid => bid.is_winning_bid);
    if (!winningBid) {
      return (
        <View style={styles.noWinnerSection}>
          <Text style={styles.noWinnerText}>No winning bid was found</Text>
        </View>
      );
    }

    return (
      <View style={styles.winnerSection}>
        <View style={styles.winnerHeader}>
          <Feather name="award" size={24} color="#FFD700" />
          <Text style={styles.winnerTitle}>Job Winner</Text>
        </View>
        <View style={styles.winnerCard}>
          <Text style={styles.winnerName}>
            {winningBid.user_id === currentUserId ? 'You Won!' : 'Driver'}
          </Text>
          <View style={styles.winningBidAmount}>
            <Text style={styles.winningBidText}>
              ₹{formatIndianNumber(winningBid.amount)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTimeInfo = () => {
    if (!auction) return null;

    const endTime = new Date(auction.end_time);
    const isExpired = isPast(endTime);

    if (auction.status === 'active') {
      if (isExpired) {
        return (
          <View style={styles.timeWarning}>
            <Feather name="clock" size={16} color="#DC3545" />
            <Text style={[styles.timeText, { color: '#DC3545' }]}>
              Job has expired - closing soon
            </Text>
          </View>
        );
      } else {
        return (
          <View style={styles.timeInfo}>
            <Feather name="clock" size={16} color="#6C757D" />
            <Text style={styles.timeText}>
              Ends {formatDistanceToNow(endTime, { addSuffix: true })}
            </Text>
          </View>
        );
      }
    } else {
      return (
        <View style={styles.timeInfo}>
          <Feather name="clock" size={16} color="#6C757D" />
          <Text style={styles.timeText}>
            Ended {formatDistanceToNow(endTime, { addSuffix: true })}
          </Text>
        </View>
      );
    }
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

  const canBid =
    auction.status === 'active' && !isPast(new Date(auction.end_time));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{auction.title}</Text>
        {renderJobStatus()}
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{auction.description}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Feather name="users" size={16} color="#6C757D" />
          <Text style={styles.statText}>{bids.length} bids</Text>
        </View>
        {renderTimeInfo()}
      </View>

      {/* Vehicle and Job Info */}
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

      {renderCancelBidButton()}
      {renderWinnerSection()}
      {renderContactInfo()}
      {renderBidsList()}

      {/* Show bid input only for drivers who don't have an existing bid */}
      {canBid && !myBid && (
        <View style={styles.bidSection}>
          <Text style={styles.bidSectionTitle}>Place Your Bid</Text>
          <View style={styles.bidInputContainer}>
            <TextInput
              style={styles.bidInput}
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
              placeholder="Enter bid amount"
              placeholderTextColor="#6C757D"
              editable={!isPlacingBid}
            />
            <TouchableOpacity
              style={[
                styles.bidButton,
                isPlacingBid && styles.bidButtonDisabled,
              ]}
              onPress={handlePlaceBid}
              disabled={isPlacingBid}
            >
              {isPlacingBid ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.bidButtonText}>Place Bid</Text>
                  <Feather name="arrow-right" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {myBid && canBid && (
        <View style={styles.currentBidSection}>
          <Text style={styles.currentBidTitle}>Your Current Bid</Text>
          <View style={styles.currentBidCard}>
            <Text style={styles.currentBidAmount}>
              ₹{formatIndianNumber(myBid.amount)}
            </Text>
            <Text style={styles.currentBidStatus}>
              {myBid.is_winning_bid ? 'Winning Bid' : 'Active Bid'}
            </Text>
          </View>
        </View>
      )}

      {!canBid && auction.status === 'active' && (
        <View style={styles.expiredNotice}>
          <Text style={styles.expiredText}>This job has ended</Text>
        </View>
      )}

      {/* Cancel Bid Modal */}
      <Modal
        visible={showCancelBidModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelBidModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Bid</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel your bid of ₹
              {myBid?.amount ? formatIndianNumber(myBid.amount) : '0'}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelBidModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Keep Bid</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCancelBid}
                disabled={isCancellingBid}
              >
                {isCancellingBid ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Cancel Bid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 16,
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
  descriptionContainer: {
    padding: 16,
    paddingTop: 0,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  cancelBidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  contactSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  contactTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  contactInfo: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  contactPhone: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#34C759',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  noPhoneText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    fontStyle: 'italic',
    marginTop: 8,
  },
  winnerSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  winnerTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  winnerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  winnerName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  winningBidAmount: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  winningBidText: {
    color: '#34C759',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  noWinnerSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
  },
  noWinnerText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  bidsContainer: {
    padding: 16,
  },
  bidsTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  bidItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bidderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bidderName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  bidAmount: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#34C759',
  },
  bidTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  winningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  winningText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFB100',
  },
  noBidsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noBidsText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
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
  bidSection: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderColor: '#E5E5E5',
  },
  bidSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  bidInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  bidInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  bidButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidButtonDisabled: {
    opacity: 0.7,
  },
  bidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  currentBidSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E1F0FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  currentBidTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#34C759',
    marginBottom: 8,
  },
  currentBidCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentBidAmount: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#34C759',
  },
  currentBidStatus: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#34C759',
  },
  expiredNotice: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  expiredText: {
    color: '#DC2626',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 25,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  modalCancelButtonText: {
    color: '#6C757D',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
});
