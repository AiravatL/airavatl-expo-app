import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
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
  created_by: string;
}

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  user_id: string;
  is_winning_bid: boolean | null;
  profiles: {
    username: string;
    phone_number: string | null;
  };
}

export default function AuctionDetailScreen() {
  const params = useLocalSearchParams();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [auctionHasBids, setAuctionHasBids] = useState(false);
  const [checkingBids, setCheckingBids] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchAuctionDetails = useCallback(async () => {
    try {
      setError(null);

      if (!params.id) {
        setError('Auction ID is missing');
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)/sign-in');
        return;
      }

      setCurrentUser(user);

      // Fetch auction details
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', String(params.id))
        .single();

      if (auctionError || !auctionData) {
        setError('Auction not found');
        setAuction(null);
        setBids([]);
        return;
      }

      setAuction(auctionData);

      // Fetch bids for this auction
      const { data: bidsData, error: bidsError } = await supabase
        .from('auction_bids')
        .select(
          `
          id,
          amount,
          created_at,
          user_id,
          is_winning_bid,
          profiles(username, phone_number)
        `
        )
        .eq('auction_id', String(params.id))
        .order('amount', { ascending: false });

      if (bidsError) {
        console.error('Error fetching bids:', bidsError);
        setBids([]);
      } else {
        setBids(bidsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching auction details:', err);
      setError(err.message || 'Failed to load auction details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [params.id]);

  // Check if auction has bids
  const checkAuctionHasBids = useCallback(async () => {
    if (!auction?.id) return false;

    try {
      setCheckingBids(true);
      const { data: bids, error } = await supabase
        .from('auction_bids')
        .select('id')
        .eq('auction_id', auction.id)
        .limit(1);

      if (error) {
        console.error('Error checking bids:', error);
        return false;
      }

      const hasBids = bids && bids.length > 0;
      setAuctionHasBids(hasBids);
      return hasBids;
    } catch (error) {
      console.error('Error checking auction bids:', error);
      return false;
    } finally {
      setCheckingBids(false);
    }
  }, [auction?.id]);

  useEffect(() => {
    fetchAuctionDetails();
  }, [fetchAuctionDetails]);

  // Check for bids when auction data is loaded
  useEffect(() => {
    if (auction?.id && currentUser && auction.created_by === currentUser.id) {
      checkAuctionHasBids();
    }
  }, [auction?.id, auction?.created_by, currentUser, checkAuctionHasBids]);

  // Refresh data when screen comes into focus (e.g., after editing auction)
  useFocusEffect(
    useCallback(() => {
      if (params.id) {
        fetchAuctionDetails();
      }
    }, [fetchAuctionDetails, params.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuctionDetails();
  };

  const handleEditAuction = async () => {
    if (!auction) return;

    // Check for bids before allowing edit
    const hasBids = await checkAuctionHasBids();
    if (hasBids) {
      Alert.alert(
        'Cannot Edit Auction',
        'This auction cannot be edited because it already has bids from drivers. You can cancel the auction instead.',
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Cancel Auction',
            style: 'destructive',
            onPress: () => setShowCancelModal(true),
          },
        ]
      );
      return;
    }

    // Navigate to edit screen
    router.push({
      pathname: `/(consigner)/(tabs)/auctions/[id]/edit-auction`,
      params: {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        vehicleType: auction.vehicle_type,
        endTime: auction.end_time,
      },
    });
  };

  const handleCancelAuction = async () => {
    try {
      if (!currentUser || !auction) return;

      setIsCancelling(true);

      // Call the auction cancellation function
      const { error } = await (supabase as any).rpc(
        'cancel_auction_by_consigner',
        {
          p_auction_id: String(params.id),
          p_user_id: currentUser.id,
        }
      );

      if (error) throw error;

      // Close the modal and redirect to auctions list
      setShowCancelModal(false);

      Alert.alert('Success', 'Auction cancelled successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Use replace to prevent back navigation to cancelled auction
            router.replace('/(consigner)/(tabs)/auctions');
          },
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to cancel auction. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getAuctionStatusColor = (auction: Auction) => {
    if (auction.status === 'active') {
      if (isPast(new Date(auction.end_time))) {
        return '#DC3545'; // Red for expired
      }
      return '#28A745'; // Green for active
    } else if (auction.status === 'completed') {
      return '#007AFF'; // Blue for completed
    } else if (auction.status === 'cancelled') {
      return '#DC3545'; // Red for cancelled
    }
    return '#6C757D'; // Gray for unknown
  };

  const getAuctionStatusText = (auction: Auction) => {
    if (auction.status === 'active') {
      if (isPast(new Date(auction.end_time))) {
        return 'Expired';
      }
      return 'Active';
    }
    return auction.status.charAt(0).toUpperCase() + auction.status.slice(1);
  };

  const renderAuctionStatus = () => {
    if (!auction) return null;

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getAuctionStatusColor(auction) },
        ]}
      >
        <Text style={styles.statusText}>{getAuctionStatusText(auction)}</Text>
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
            <Feather name="alert-circle" size={16} color="#DC3545" />
            <Text style={styles.timeText}>
              Expired {format(endTime, 'MMM d, h:mm a')}
            </Text>
          </View>
        );
      } else {
        return (
          <View style={styles.timeInfo}>
            <Feather name="clock" size={16} color="#6C757D" />
            <Text style={styles.timeText}>
              Ends {format(endTime, 'MMM d, h:mm a')}
            </Text>
          </View>
        );
      }
    } else {
      return (
        <View style={styles.timeInfo}>
          <Feather name="calendar" size={16} color="#6C757D" />
          <Text style={styles.timeText}>
            {auction.status === 'completed' ? 'Completed' : 'Cancelled'}{' '}
            {format(endTime, 'MMM d, h:mm a')}
          </Text>
        </View>
      );
    }
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
                {bid.profiles?.username || 'Anonymous'}
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

  const renderActionButtons = () => {
    if (
      !auction ||
      !currentUser ||
      auction.created_by !== currentUser.id ||
      auction.status !== 'active'
    ) {
      return null;
    }

    const isExpired = isPast(new Date(auction.end_time));
    if (isExpired) return null;

    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.editButton,
            (checkingBids || auctionHasBids) && styles.editButtonDisabled,
          ]}
          onPress={handleEditAuction}
          disabled={checkingBids}
        >
          {checkingBids ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : auctionHasBids ? (
            <Feather name="lock" size={20} color="#6C757D" />
          ) : (
            <Feather name="edit-2" size={20} color="#007AFF" />
          )}
          <Text
            style={[
              styles.editButtonText,
              auctionHasBids && { color: '#6C757D' },
            ]}
          >
            {checkingBids
              ? 'Checking...'
              : auctionHasBids
              ? 'Cannot Edit (Has Bids)'
              : 'Edit Auction'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCancelButton}
          onPress={() => setShowCancelModal(true)}
        >
          <Feather name="x-circle" size={20} color="#FFFFFF" />
          <Text style={styles.actionCancelButtonText}>Cancel Auction</Text>
        </TouchableOpacity>
      </View>
    );
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

  if (!auction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Auction not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

      {renderActionButtons()}
      {renderBidsList()}

      {/* Cancel Auction Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Auction</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this auction? This action cannot
              be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Keep Auction</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCancelAuction}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    Cancel Auction
                  </Text>
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
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonDisabled: {
    opacity: 0.6,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  actionCancelButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
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
  modalMessage: {
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
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
