import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, isPast } from 'date-fns';

import { supabase } from '../../../../../lib/supabase';

interface Auction {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  winner_id: string | null;
  winning_bid_id: string | null;
  created_at: string | null;
  created_by: string;
  vehicle_type: string;
  consignment_date: string;
  pickup_location?: string;
  delivery_location?: string;
  minimum_bid?: number;
  winner?: {
    username: string;
  } | null;
}

interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string | null;
  is_winning_bid: boolean | null;
  bidder?: any;
}

interface User {
  id: string;
  email?: string;
  username?: string;
  phone_number?: string | null;
}

const JobDetailsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    username: string;
    phone_number: string | null;
  } | null>(null);
  const [showCancelBidModal, setShowCancelBidModal] = useState(false);
  const [isCancellingBid, setIsCancellingBid] = useState(false);
  const [userBid, setUserBid] = useState<Bid | null>(null);
  const params = useLocalSearchParams();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    fetchUser();
  }, []);

  const fetchContactInfo = useCallback(
    async (auction: Auction) => {
      if (!auction || auction.status !== 'completed' || !auction.winner_id) {
        setContactInfo(null);
        return;
      }

      // Only fetch contact info if user is the winner or the consigner
      const shouldFetch =
        (currentUser && auction.winner_id === currentUser.id) ||
        (currentUser && auction.created_by === currentUser.id);

      if (!shouldFetch) {
        setContactInfo(null);
        return;
      }

      try {
        // Determine which contact to fetch based on user role
        const contactUserId =
          auction.winner_id === currentUser?.id
            ? auction.created_by // If user is winner, get consigner contact
            : auction.winner_id; // If user is consigner, get winner contact

        const { data: contactData, error: contactError } = await supabase
          .from('profiles')
          .select('username, phone_number')
          .eq('id', contactUserId)
          .single();

        if (contactError) {
          console.error('Error fetching contact info:', contactError);
          return;
        }

        setContactInfo(contactData);
      } catch (error) {
        console.error('Error fetching contact info:', error);
      }
    },
    [currentUser]
  );

  const fetchAuctionDetails = useCallback(async () => {
    if (!params.id || Array.isArray(params.id)) return;

    try {
      setIsLoading(true);

      // Fetch auction details
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', params.id)
        .single();

      if (auctionError) {
        throw new Error('Failed to load job details');
      }

      // Fetch bids with profile information
      const { data: bidsData, error: bidsError } = await supabase
        .from('auction_bids')
        .select(
          `
          *,
          profiles (username)
        `
        )
        .eq('auction_id', params.id)
        .order('amount', { ascending: true }); // Lower bids first for transport auctions

      if (bidsError) {
        console.error('Error fetching bids:', bidsError);
      }

      // Convert bids data
      let convertedBids: Bid[] = [];
      if (bidsData && bidsData.length > 0) {
        convertedBids = bidsData.map((bid: any) => ({
          id: bid.id,
          auction_id: bid.auction_id,
          user_id: bid.user_id,
          amount: bid.amount,
          created_at: bid.created_at,
          is_winning_bid: bid.is_winning_bid,
          bidder: { username: (bid.profiles as any)?.username || 'Anonymous' },
        }));
        setBids(convertedBids);
      }

      // Set auction data
      const convertedAuction: Auction = {
        id: auctionData.id,
        title: auctionData.title,
        description: auctionData.description,
        start_time: auctionData.start_time,
        end_time: auctionData.end_time,
        status: auctionData.status,
        created_by: auctionData.created_by,
        vehicle_type: auctionData.vehicle_type,
        consignment_date: auctionData.consignment_date,
        pickup_location: (auctionData as any).pickup_location || undefined,
        delivery_location: (auctionData as any).delivery_location || undefined,
        minimum_bid: (auctionData as any).minimum_bid || undefined,
        created_at: auctionData.start_time,
        winner_id: auctionData.winner_id,
        winning_bid_id: null,
        winner: auctionData.winner_id ? { username: 'Winner' } : null,
      };

      setAuction(convertedAuction);

      // Find user's bid if exists
      if (currentUser && bidsData) {
        const userBidData = bidsData.find(
          (bid: any) => bid.user_id === currentUser.id
        );
        if (userBidData) {
          setUserBid({
            id: userBidData.id,
            auction_id: userBidData.auction_id,
            user_id: userBidData.user_id,
            amount: userBidData.amount,
            created_at: userBidData.created_at,
            is_winning_bid: userBidData.is_winning_bid,
            bidder: {
              username: (userBidData.profiles as any)?.username || 'Anonymous',
            },
          });
        } else {
          setUserBid(null);
        }
      }

      // Fetch contact info for completed auctions
      await fetchContactInfo(convertedAuction);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load job details'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [params.id, fetchContactInfo, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchAuctionDetails();
    }
  }, [fetchAuctionDetails, currentUser]);

  const handleSubmitBid = async () => {
    if (!auction || !currentUser || !bidAmount.trim()) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if auction is still active
      if (auction.status !== 'active' || isPast(new Date(auction.end_time))) {
        Alert.alert('Error', 'This job is no longer available for bidding');
        return;
      }

      // For transport auctions, lower bids win (competitive pricing)
      // Check if there's already a lower bid
      const lowestBid =
        bids.length > 0 ? Math.min(...bids.map(b => b.amount)) : Infinity;
      if (amount >= lowestBid) {
        Alert.alert(
          'Higher Bid Exists',
          `There's already a lower bid of ₹${lowestBid}. Transport jobs go to the lowest bidder.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Update existing bid or create new one
      let result;
      if (userBid) {
        // Update existing bid
        result = await supabase
          .from('auction_bids')
          .update({
            amount: amount,
            created_at: new Date().toISOString(),
          })
          .eq('id', userBid.id);
      } else {
        // Create new bid
        result = await supabase.from('auction_bids').insert({
          auction_id: auction.id,
          user_id: currentUser.id,
          amount: amount,
        });
      }

      if (result.error) {
        throw result.error;
      }

      setBidAmount('');
      await fetchAuctionDetails();
    } catch {
      Alert.alert('Error', 'Failed to place bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBid = async () => {
    if (!userBid) return;

    try {
      setIsCancellingBid(true);

      const { error } = await supabase
        .from('auction_bids')
        .delete()
        .eq('id', userBid.id);

      if (error) {
        throw error;
      }

      setShowCancelBidModal(false);
      await fetchAuctionDetails();
    } catch {
      Alert.alert('Error', 'Failed to cancel bid');
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
    // Only show cancel bid button for drivers who have placed a bid on an active auction
    if (
      !auction ||
      !userBid ||
      auction.status !== 'active' ||
      isPast(new Date(auction.end_time)) ||
      userBid.is_winning_bid
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

    // Only show contact info to winner (for consigner) or consigner (for winner)
    const shouldShowContact =
      auction.created_by === currentUser?.id ||
      auction.winner_id === currentUser?.id;

    if (!shouldShowContact) {
      return null;
    }

    const contactTitle =
      auction.winner_id === currentUser?.id
        ? 'Consigner Contact'
        : 'Winner Contact';

    return (
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>{contactTitle}</Text>
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

  const renderAuctionStatus = () => {
    if (!auction) return null;

    let statusColor = '#6C757D';
    let statusText = 'Unknown';

    if (auction.status === 'active') {
      // Check if auction should be expired
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
        {bids.map(bid => (
          <View key={bid.id} style={styles.bidItem}>
            <View style={styles.bidderInfo}>
              <Text style={styles.bidderName}>
                {bid.bidder?.username || 'Anonymous'}
              </Text>
              <Text style={styles.bidAmount}>₹{bid.amount}</Text>
            </View>
            {bid.is_winning_bid && (
              <View style={styles.winningBadge}>
                <Feather name="award" size={16} color="#FFD700" />
                <Text style={styles.winningText}>Winner</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderWinnerSection = () => {
    if (!auction || auction.status === 'active') return null;
    const winningBid = bids.find(bid => bid.is_winning_bid);

    if (!winningBid) return null;

    return (
      <View style={styles.winnerSection}>
        <Text style={styles.winnerSectionTitle}>Job Winner</Text>
        <View style={styles.winnerCard}>
          <View style={styles.winnerInfo}>
            <Feather name="award" size={24} color="#FFD700" />
            <View style={styles.winnerDetails}>
              <Text style={styles.winnerName}>
                {winningBid.bidder?.username || 'Anonymous'}
              </Text>
              <Text style={styles.winnerBid}>₹{winningBid.amount}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTimeInfo = () => {
    if (!auction) return null;

    const endTime = new Date(auction.end_time);

    if (auction.status === 'active') {
      if (isPast(endTime)) {
        return (
          <View style={styles.timeInfo}>
            <Feather name="clock" size={16} color="#DC3545" />
            <Text style={[styles.timeText, { color: '#DC3545' }]}>
              Expired {formatDistanceToNow(endTime, { addSuffix: true })}
            </Text>
          </View>
        );
      } else {
        return (
          <View style={styles.timeInfo}>
            <Feather name="clock" size={16} color="#34C759" />
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
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchAuctionDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!auction) return <Text>Job not found</Text>;

  const canBid =
    auction.status === 'active' && !isPast(new Date(auction.end_time));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAuctionDetails();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{auction.title}</Text>
        {renderAuctionStatus()}
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{auction.description}</Text>
      </View>

      <View style={styles.jobDetails}>
        {auction.pickup_location && (
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={16} color="#34C759" />
            <Text style={styles.detailLabel}>Pickup:</Text>
            <Text style={styles.detailValue}>{auction.pickup_location}</Text>
          </View>
        )}

        {auction.delivery_location && (
          <View style={styles.detailRow}>
            <Feather name="navigation" size={16} color="#34C759" />
            <Text style={styles.detailLabel}>Delivery:</Text>
            <Text style={styles.detailValue}>{auction.delivery_location}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Feather name="truck" size={16} color="#34C759" />
          <Text style={styles.detailLabel}>Vehicle:</Text>
          <Text style={styles.detailValue}>
            {auction.vehicle_type
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="calendar" size={16} color="#34C759" />
          <Text style={styles.detailLabel}>Transport Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(auction.consignment_date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Feather name="users" size={16} color="#6C757D" />
          <Text style={styles.statText}>{bids.length} bids</Text>
        </View>
        {renderTimeInfo()}
      </View>

      {renderCancelBidButton()}
      {renderWinnerSection()}
      {renderContactInfo()}
      {renderBidsList()}

      {canBid && !userBid && (
        <View style={styles.bidSection}>
          <Text style={styles.bidSectionTitle}>Place Your Bid</Text>
          <Text style={styles.bidHint}>
            Lower bids win transport jobs. Be competitive!
          </Text>
          <View style={styles.bidInputContainer}>
            <TextInput
              style={styles.bidInput}
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
              placeholder="Enter bid amount"
              placeholderTextColor="#6C757D"
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={[
                styles.bidButton,
                isSubmitting && styles.bidButtonDisabled,
              ]}
              onPress={handleSubmitBid}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
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

      {userBid && canBid && (
        <View style={styles.currentBidSection}>
          <Text style={styles.currentBidTitle}>Your Current Bid</Text>
          <View style={styles.currentBidCard}>
            <Text style={styles.currentBidAmount}>₹{userBid.amount}</Text>
            <Text style={styles.currentBidStatus}>
              {userBid.is_winning_bid ? 'Winning Bid' : 'Active Bid'}
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
            <Text style={styles.modalDescription}>
              Are you sure you want to cancel your bid? This action cannot be
              undone.
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
};

export default JobDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    lineHeight: 24,
  },
  jobDetails: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1C1C1E',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6C757D',
    marginLeft: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6C757D',
    marginLeft: 8,
  },
  cancelBidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 16,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  contactTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  contactPhone: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6C757D',
    marginLeft: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
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
  bidsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  bidsTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  noBidsContainer: {
    margin: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  noBidsText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  bidItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  bidderInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidderName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1C1C1E',
  },
  bidAmount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#34C759',
  },
  winningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  winningText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#856404',
  },
  winnerSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  winnerSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  winnerCard: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerDetails: {
    marginLeft: 16,
    flex: 1,
  },
  winnerName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#856404',
  },
  winnerBid: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#856404',
  },
  bidSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  bidSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  bidHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginBottom: 16,
  },
  bidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#1C1C1E',
    marginRight: 12,
  },
  bidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bidButtonDisabled: {
    backgroundColor: '#A3A3A3',
  },
  bidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  currentBidSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  currentBidTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  currentBidCard: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentBidAmount: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#34C759',
    marginBottom: 4,
  },
  currentBidStatus: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#34C759',
  },
  expiredNotice: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    alignItems: 'center',
  },
  expiredText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#DC3545',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#DC3545',
    marginLeft: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
