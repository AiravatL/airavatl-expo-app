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
import { supabase } from '@/lib/supabase';
import { performanceService } from '@/lib/performanceService';
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

const AuctionDetailsScreen = () => {
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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

        // Determine whose contact info to fetch based on user role
        if (
          userRole === 'consigner' &&
          auctionData.created_by === currentUser.id
        ) {
          // Consigner viewing their auction - show winner's contact info
          contactUserId = auctionData.winner_id;
        } else if (
          userRole === 'driver' &&
          auctionData.winner_id === currentUser.id
        ) {
          // Winner driver viewing auction - show consigner's contact info
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // currentUser and userRole are stable during component lifecycle
  );

  const fetchAuctionDetails = useCallback(async () => {
    try {
      if (!params.id) {
        setError('Auction ID is missing');
        return;
      }

      // Use optimized performance service for faster loading
      const result = await performanceService.getOptimizedAuctionDetails(
        String(params.id)
      );

      if (!result.auction) {
        setError('Auction not found');
        setAuction(null);
        setBids([]);
        return;
      }

      // Convert OptimizedAuction to Auction interface
      const convertedAuction: Auction = {
        ...result.auction,
        created_at: result.auction.start_time,
        winning_bid_id: null, // Will be updated by database triggers
        winner: result.auction.winner_id ? { username: 'Winner' } : null,
      };

      setAuction(convertedAuction);

      // Convert OptimizedBid to Bid interface
      const convertedBids: Bid[] = result.bids.map((bid) => ({
        ...bid,
        bidder: { username: bid.bidder_username || 'Anonymous' },
      }));

      setBids(convertedBids);

      // Set user's bid if exists
      setUserBid(result.userBid);

      // Fetch contact info for completed auctions
      await fetchContactInfo(convertedAuction);
      setError(null);

      // Simple status check - let database triggers handle auction closure
      // Remove expensive manual auction closure checking
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load auction details'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [params.id, fetchContactInfo]);

  useEffect(() => {
    fetchAuctionDetails();

    // Simple refresh interval - let database handle auction closure automatically
    const interval = setInterval(() => {
      if (auction?.status === 'active') {
        fetchAuctionDetails(); // Just refetch data, no expensive operations
      }
    }, 60000); // Increased to 60 seconds for better performance

    return () => clearInterval(interval);
  }, [fetchAuctionDetails, auction?.status]);

  const handleCancelAuction = async () => {
    try {
      if (!currentUser || !auction) return;

      setIsCancelling(true);

      // Call the cancellation function based on user role with correct parameter name
      const method =
        auction.created_by === currentUser.id
          ? 'handle_consigner_cancellation'
          : 'handle_winner_cancellation';
      const paramName =
        auction.created_by === currentUser.id
          ? 'auction_id_param'
          : 'auction_id';
      const { error } = await (supabase as any).rpc(method, {
        [paramName]: String(params.id),
      });

      if (error) throw error;

      // Close the modal and refresh data
      setShowCancelModal(false);
      await fetchAuctionDetails();

      Alert.alert('Success', 'Auction cancelled successfully');
    } catch {
      Alert.alert('Error', 'Failed to cancel auction. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelBid = async () => {
    try {
      if (!currentUser || !userBid) return;

      setIsCancellingBid(true);

      const { error } = await (supabase as any).rpc('cancel_bid', {
        bid_id_param: userBid.id,
      });

      if (error) throw error;

      // Close the modal and refresh data
      setShowCancelBidModal(false);
      await fetchAuctionDetails();

      Alert.alert('Success', 'Your bid has been cancelled successfully');
    } catch {
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
        Alert.alert('Invalid bid amount');
        return;
      }

      // Check if auction is still active before placing bid
      if (auction.status !== 'active' || isPast(new Date(auction.end_time))) {
        Alert.alert('Error', 'This auction has ended');
        await fetchAuctionDetails();
        return;
      }

      // Use optimized bid creation for faster performance
      const result = await performanceService.createBidOptimized(
        auction.id,
        amount,
        currentUser.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to place bid');
      }

      // Send notifications in background (non-blocking)
      setTimeout(async () => {
        try {
          const { auctionNotificationService } = await import(
            '@/lib/auctionNotifications'
          );

          // Get previous bidders who are now outbid (since lower bids win in this auction format)
          // Anyone who bid higher than the new bid amount is now outbid
          const outbidUsers = bids.filter(
            (bid) => bid.user_id !== currentUser.id && bid.amount > amount
          );

          // Notify auction creator about new bid
          if (auction.created_by !== currentUser.id) {
            await auctionNotificationService.notifyNewBid(
              auction.id,
              auction.created_by,
              auction.title,
              amount
            );
          }

          // Notify outbid users
          for (const bid of outbidUsers) {
            await auctionNotificationService.notifyOutbid(
              auction.id,
              bid.user_id,
              auction.title,
              amount
            );
          }
        } catch {
          // Silently handle notification errors in production
        }
      }, 100);

      setBidAmount('');
      await fetchAuctionDetails();
    } catch {
      Alert.alert('Error', 'Failed to place bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallContact = () => {
    if (contactInfo?.phone_number) {
      const phoneUrl = `tel:${contactInfo.phone_number}`;
      Linking.openURL(phoneUrl).catch((err) => {
        console.error('Error opening phone app:', err);
        Alert.alert('Error', 'Unable to open phone app');
      });
    }
  };

  const renderCancelButton = () => {
    // Only show cancel button for consigners on their own active auctions
    if (
      !auction ||
      userRole !== 'consigner' ||
      auction.created_by !== currentUser?.id ||
      auction.status !== 'active' ||
      isPast(new Date(auction.end_time))
    ) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setShowCancelModal(true)}
      >
        <Feather name="x-circle" size={20} color="#FFFFFF" />
        <Text style={styles.cancelButtonText}>Cancel Auction</Text>
      </TouchableOpacity>
    );
  };

  const renderCancelBidButton = () => {
    // Only show cancel bid button for drivers who have placed a bid on an active auction
    if (
      !auction ||
      !userBid ||
      userRole !== 'driver' ||
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

  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCancelModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Feather name="alert-triangle" size={24} color="#DC3545" />
            <Text style={styles.modalTitle}>Cancel Auction</Text>
          </View>

          <Text style={styles.modalMessage}>
            Are you sure you want to cancel this auction? This action cannot be
            undone.
          </Text>

          {bids.length > 0 && (
            <Text style={styles.modalWarning}>
              This auction has {bids.length} bid{bids.length > 1 ? 's' : ''}.
              All bidders will be notified of the cancellation.
            </Text>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCancelModal(false)}
              disabled={isCancelling}
            >
              <Text style={styles.modalCancelButtonText}>Keep Auction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                isCancelling && styles.modalConfirmButtonDisabled,
              ]}
              onPress={handleCancelAuction}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="x-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.modalConfirmButtonText}>
                    Cancel Auction
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCancelBidModal = () => (
    <Modal
      visible={showCancelBidModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCancelBidModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Feather name="alert-triangle" size={24} color="#DC3545" />
            <Text style={styles.modalTitle}>Cancel Bid</Text>
          </View>

          <Text style={styles.modalMessage}>
            Are you sure you want to cancel your bid of ₹{userBid?.amount}? This
            action cannot be undone.
          </Text>

          <Text style={styles.modalWarning}>
            The consigner will be notified of your bid cancellation.
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCancelBidModal(false)}
              disabled={isCancellingBid}
            >
              <Text style={styles.modalCancelButtonText}>Keep Bid</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                isCancellingBid && styles.modalConfirmButtonDisabled,
              ]}
              onPress={handleCancelBid}
              disabled={isCancellingBid}
            >
              {isCancellingBid ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="x-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.modalConfirmButtonText}>Cancel Bid</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderContactInfo = () => {
    if (
      !contactInfo ||
      auction?.status !== 'completed' ||
      !auction?.winner_id
    ) {
      return null;
    }

    // Only show contact info to consigner (for winner) or winner (for consigner)
    const shouldShowContact =
      (userRole === 'consigner' && auction.created_by === currentUser?.id) ||
      (userRole === 'driver' && auction.winner_id === currentUser?.id);

    if (!shouldShowContact) {
      return null;
    }

    const contactTitle =
      userRole === 'consigner' ? 'Winner Contact' : 'Consigner Contact';

    return (
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>{contactTitle}</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Feather name="user" size={20} color="#007AFF" />
              <Text style={styles.contactName}>{contactInfo.username}</Text>
            </View>
            {contactInfo.phone_number && (
              <View style={styles.contactRow}>
                <Feather name="phone" size={20} color="#007AFF" />
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
        statusColor = '#28A745';
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
        {bids.map((bid) => (
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
    const winningBid = bids.find((bid) => bid.is_winning_bid);
    if (!winningBid || !auction.winner) {
      return (
        <View style={styles.noWinnerSection}>
          <Text>No winning bid was found</Text>
        </View>
      );
    }
    return (
      <View style={styles.winnerSection}>
        <View style={styles.winnerHeader}>
          <Feather name="award" size={24} color="#FFD700" />
          <Text style={styles.winnerTitle}>Auction Winner</Text>
        </View>
        <View style={styles.winnerCard}>
          <Text style={styles.winnerName}>
            {auction.winner.username || 'Unknown Winner'}
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
              Auction has expired - closing soon
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
        <ActivityIndicator size="large" color="#007AFF" />
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

  if (!auction) return <Text>Auction not found</Text>;

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

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Feather name="users" size={16} color="#6C757D" />
          <Text style={styles.statText}>{bids.length} bids</Text>
        </View>
        {renderTimeInfo()}
      </View>

      {renderCancelButton()}
      {renderCancelBidButton()}
      {renderWinnerSection()}
      {renderContactInfo()}
      {renderBidsList()}

      {canBid && userRole === 'driver' && !userBid && (
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
          <Text style={styles.expiredText}>This auction has ended</Text>
        </View>
      )}

      {renderCancelModal()}
      {renderCancelBidModal()}
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
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
    marginBottom: 16,
  },
  modalWarning: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#DC3545',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
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
  modalConfirmButtonDisabled: {
    opacity: 0.7,
  },
  modalConfirmButtonText: {
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
    color: '#007AFF',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
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
    color: '#28A745',
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
  },
  bidderName: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  bidAmount: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#28A745',
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
    backgroundColor: '#007AFF',
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
    borderColor: '#007AFF',
  },
  currentBidTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
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
    color: '#007AFF',
  },
  currentBidStatus: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#007AFF',
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
});

export default AuctionDetailsScreen;
