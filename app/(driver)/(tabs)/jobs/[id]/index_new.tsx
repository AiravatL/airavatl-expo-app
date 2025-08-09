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
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, isPast } from 'date-fns';

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
  const [userRole, setUserRole] = useState<string | null>(null);
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

        // Get user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUser();
  }, []);

  const fetchContactInfo = useCallback(
    async (auctionData: Auction) => {
      if (
        !auctionData ||
        auctionData.status !== 'completed' ||
        !auctionData.winner_id ||
        !currentUser
      ) {
        return;
      }

      try {
        let contactUserId = null;

        // Driver viewing completed auction they won - show consigner's contact info
        if (userRole === 'driver' && auctionData.winner_id === currentUser.id) {
          contactUserId = auctionData.created_by;
        }

        if (contactUserId) {
          const { data: contactData, error: contactError } = await supabase
            .from('profiles')
            .select('username, phone_number')
            .eq('id', contactUserId)
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
    [currentUser, userRole]
  );

  const fetchAuctionDetails = useCallback(async () => {
    try {
      if (!params.id) {
        setError('Job ID is missing');
        return;
      }

      // Fetch auction details
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', String(params.id))
        .single();

      if (auctionError || !auctionData) {
        setError('Job not found');
        setAuction(null);
        setBids([]);
        return;
      }

      // Fetch bids for this auction
      const { data: bidsData, error: bidsError } = await supabase
        .from('auction_bids')
        .select(
          `
          id,
          amount,
          created_at,
          is_winning_bid,
          user_id,
          auction_id,
          profiles!auction_bids_user_id_fkey (
            id,
            username
          )
        `
        )
        .eq('auction_id', String(params.id))
        .order('amount', { ascending: true });

      if (bidsError) {
        console.error('Error fetching bids:', bidsError);
        setBids([]);
      } else {
        // Convert to expected Bid format
        const convertedBids: Bid[] = (bidsData || []).map(bid => ({
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
        created_at: auctionData.start_time,
        winner_id: auctionData.winner_id,
        winning_bid_id: null,
        winner: auctionData.winner_id ? { username: 'Winner' } : null,
      };

      setAuction(convertedAuction);

      // Find user's bid if exists
      if (currentUser && bidsData) {
        const userBidData = bidsData.find(
          bid => bid.user_id === currentUser.id
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
    fetchAuctionDetails();

    // Real-time updates for active auctions
    const interval = setInterval(() => {
      if (auction?.status === 'active') {
        fetchAuctionDetails();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchAuctionDetails, auction?.status]);

  const handleCancelBid = async () => {
    try {
      if (!currentUser || !userBid) return;

      setIsCancellingBid(true);

      const { error } = await supabase
        .from('auction_bids')
        .delete()
        .eq('id', userBid.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setShowCancelBidModal(false);
      await fetchAuctionDetails();

      Alert.alert('Success', 'Your bid has been cancelled successfully');
    } catch (error) {
      console.error('Error cancelling bid:', error);
      Alert.alert('Error', 'Failed to cancel bid. Please try again.');
    } finally {
      setIsCancellingBid(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!auction || !bidAmount || !currentUser) return;

    try {
      setIsSubmitting(true);
      const amount = parseFloat(bidAmount);

      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Bid', 'Please enter a valid bid amount');
        return;
      }

      // Check if auction is still active before placing bid
      if (auction.status !== 'active' || isPast(new Date(auction.end_time))) {
        Alert.alert('Error', 'This job has ended');
        await fetchAuctionDetails();
        return;
      }

      if (userBid) {
        // Update existing bid
        const { error } = await supabase
          .from('auction_bids')
          .update({ amount: amount })
          .eq('id', userBid.id);

        if (error) {
          throw new Error(error.message || 'Failed to update bid');
        }

        Alert.alert('Success', 'Your bid has been updated successfully!');
      } else {
        // Create new bid
        const { error } = await supabase.from('auction_bids').insert({
          auction_id: auction.id,
          user_id: currentUser.id,
          amount: amount,
        });

        if (error) {
          throw new Error(error.message || 'Failed to place bid');
        }

        Alert.alert('Success', 'Your bid has been placed successfully!');
      }

      setBidAmount('');
      await fetchAuctionDetails();
    } catch (error) {
      console.error('Error placing bid:', error);
      Alert.alert('Error', 'Failed to place bid. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      userRole !== 'driver' ||
      auction.status !== 'active' ||
      isPast(new Date(auction.end_time))
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

    // Only show contact info to winner for consigner contact
    const shouldShowContact =
      userRole === 'driver' && auction.winner_id === currentUser?.id;

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
      statusColor = '#34C759';
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
        <Text style={styles.bidsTitle}>Current Bids ({bids.length})</Text>
        {bids.map(bid => (
          <View key={bid.id} style={styles.bidItem}>
            <View style={styles.bidderInfo}>
              <Text style={styles.bidderName}>
                {bid.bidder?.username || 'Anonymous'}
                {bid.user_id === currentUser?.id && ' (You)'}
              </Text>
              <Text style={styles.bidAmount}>₹{bid.amount}</Text>
            </View>
            {bid.is_winning_bid && (
              <View style={styles.winningBadge}>
                <Feather name="award" size={16} color="#FFD700" />
                <Text style={styles.winningText}>Current Winner</Text>
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
            {winningBid.bidder?.username || 'Winner'}
            {winningBid.user_id === currentUser?.id && ' (You)'}
          </Text>
          <View style={styles.winningBidAmount}>
            <Text style={styles.winningBidText}>₹{winningBid.amount}</Text>
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
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#DC3545" />
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
          colors={['#34C759']}
          tintColor="#34C759"
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

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Feather name="truck" size={16} color="#6C757D" />
          <Text style={styles.detailText}>Vehicle: {auction.vehicle_type}</Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="calendar" size={16} color="#6C757D" />
          <Text style={styles.detailText}>
            Pickup: {new Date(auction.consignment_date).toLocaleDateString()}
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

      {canBid && userRole === 'driver' && !userBid && (
        <View style={styles.bidSection}>
          <Text style={styles.bidSectionTitle}>Place Your Bid</Text>
          <Text style={styles.bidSectionSubtitle}>
            Enter your competitive quote for this transport job
          </Text>
          <View style={styles.bidInputContainer}>
            <View style={styles.currencyInput}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.bidInput}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#6C757D"
                editable={!isSubmitting}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.bidButton,
                isSubmitting && styles.bidButtonDisabled,
              ]}
              onPress={handleSubmitBid}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
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
              {userBid.is_winning_bid ? '🏆 Leading Bid' : '📋 Active Bid'}
            </Text>
          </View>
          <View style={styles.updateBidContainer}>
            <Text style={styles.updateBidLabel}>Update your bid:</Text>
            <View style={styles.bidInputContainer}>
              <View style={styles.currencyInput}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.bidInput}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                  placeholder={userBid.amount.toString()}
                  placeholderTextColor="#6C757D"
                  editable={!isSubmitting}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.updateBidButton,
                  isSubmitting && styles.bidButtonDisabled,
                ]}
                onPress={handleSubmitBid}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.bidButtonText}>Update</Text>
                    <Feather name="edit-2" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {!canBid && auction.status === 'active' && (
        <View style={styles.expiredNotice}>
          <Feather name="clock" size={24} color="#DC2626" />
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
            <View style={styles.modalHeader}>
              <Feather name="alert-triangle" size={24} color="#FF6B35" />
              <Text style={styles.modalTitle}>Cancel Bid</Text>
            </View>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel your bid of ₹{userBid?.amount}?
              This action cannot be undone.
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
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="x-circle" size={18} color="#fff" />
                    <Text style={styles.modalConfirmButtonText}>
                      Cancel Bid
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
    fontFamily: 'Inter_400Regular',
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
    marginTop: 16,
    marginBottom: 24,
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
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 16,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    lineHeight: 24,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
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
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
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
    backgroundColor: '#FFF8E5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  bidderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bidderName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1C1C1E',
  },
  bidAmount: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#34C759',
  },
  winningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
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
  bidSection: {
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderTopWidth: 1,
    borderColor: '#E5E5E5',
  },
  bidSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  bidSectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginBottom: 16,
  },
  bidInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#34C759',
    marginRight: 4,
  },
  bidInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  bidButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  updateBidButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  currentBidAmount: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#34C759',
  },
  currentBidStatus: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#34C759',
  },
  updateBidContainer: {
    borderTopWidth: 1,
    borderTopColor: '#B3E5FC',
    paddingTop: 16,
  },
  updateBidLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6C757D',
    marginBottom: 8,
  },
  expiredNotice: {
    padding: 20,
    backgroundColor: '#FEE2E2',
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  expiredText: {
    color: '#DC2626',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
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
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 25,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginLeft: 12,
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
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});

export default JobDetailsScreen;
