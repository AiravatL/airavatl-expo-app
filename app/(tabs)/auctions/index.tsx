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
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { format, isPast } from 'date-fns';

type UserRole = 'consigner' | 'driver';

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

const VEHICLE_TYPES = [
  { id: 'all', label: 'All Vehicles', icon: 'grid' },
  { id: 'three_wheeler', label: '3 Wheeler', icon: 'truck' },
  { id: 'pickup_truck', label: 'Pickup Truck', icon: 'truck' },
  { id: 'mini_truck', label: 'Mini Truck', icon: 'truck' },
  { id: 'medium_truck', label: 'Medium Truck', icon: 'truck' },
  { id: 'large_truck', label: 'Large Truck', icon: 'truck' },
];

export default function AuctionsScreen() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Remove expensive checkExpiredAuctions() call
      // Let database triggers handle auction closure automatically

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/sign-in');
        return;
      }

      // Get user profile to determine role and vehicle type
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, vehicle_type')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      setUserRole(profile.role as UserRole);

      if (profile.role === 'driver') {
        // Fetch available auctions for drivers directly
        let query = supabase
          .from('auctions')
          .select('*')
          .eq('status', 'active')
          .gt('end_time', new Date().toISOString())
          .order('created_at', { ascending: false });

        // Add vehicle type filter if specified
        if (selectedVehicleType !== 'all') {
          query = query.eq('vehicle_type', selectedVehicleType);
        } else if (profile.vehicle_type) {
          query = query.eq('vehicle_type', profile.vehicle_type);
        }

        const { data: auctionsData, error: auctionsError } = await query;

        if (auctionsError) {
          throw auctionsError;
        }

        // Convert to expected format
        const convertedAuctions: Auction[] = (auctionsData || []).map(
          (auction) => ({
            id: auction.id,
            title: auction.title,
            description: auction.description,
            status: auction.status,
            end_time: auction.end_time,
            vehicle_type: auction.vehicle_type,
            created_by: auction.created_by,
            winner_id: auction.winner_id,
            start_time: auction.start_time,
            consignment_date: auction.consignment_date,
            created_at: auction.start_time, // Use start_time as created_at fallback
          })
        );

        setAuctions(convertedAuctions);

        // Fetch driver's bids
        const { data: userBids } = await supabase
          .from('auction_bids')
          .select(
            `
            id,
            amount,
            created_at,
            is_winning_bid,
            auction_id,
            user_id,
            auction:auctions(*)
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Map to proper Bid format
        const mappedBids: Bid[] = (userBids || []).map((bid) => ({
          id: bid.id,
          amount: bid.amount,
          status: 'active', // Default status
          created_at: bid.created_at,
          is_winning_bid: bid.is_winning_bid,
          auction:
            bid.auction &&
            typeof bid.auction === 'object' &&
            !('message' in bid.auction)
              ? bid.auction
              : null,
          user_id: bid.user_id,
          auction_id: bid.auction_id,
        }));

        setBids(mappedBids);
      } else {
        // Fetch user's own auctions for consigners
        const { data: userAuctions, error: auctionsError } = await supabase
          .from('auctions')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (auctionsError) {
          throw auctionsError;
        }

        setAuctions((userAuctions as Auction[]) || []);
      }
    } catch {
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [router, selectedVehicleType]);

  // Filter auctions based on selected vehicle type
  useEffect(() => {
    if (selectedVehicleType === 'all') {
      setFilteredAuctions(auctions);
    } else {
      const filtered = auctions.filter(
        (auction) => auction.vehicle_type === selectedVehicleType
      );
      setFilteredAuctions(filtered);
    }
  }, [auctions, selectedVehicleType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();

    // Simplified interval - just refresh data, let database handle closures
    const interval = setInterval(async () => {
      await fetchData(); // Simple data refresh, no expensive operations
    }, 120000); // Increased to 2 minutes for better performance

    return () => clearInterval(interval);
  }, [fetchData]);

  const getAuctionStatusColor = (auction: Auction) => {
    if (auction.status === 'active') {
      // Check if auction is expired
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
      // Check if auction is expired
      if (isPast(new Date(auction.end_time))) {
        return 'Expired';
      }
      return 'Active';
    }
    return auction.status.charAt(0).toUpperCase() + auction.status.slice(1);
  };

  const renderVehicleFilter = () => {
    if (userRole !== 'driver') return null;

    return (
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Filter by Vehicle Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContainer}
        >
          {VEHICLE_TYPES.map((vehicleType) => (
            <TouchableOpacity
              key={vehicleType.id}
              style={[
                styles.filterChip,
                selectedVehicleType === vehicleType.id &&
                  styles.filterChipSelected,
              ]}
              onPress={() => setSelectedVehicleType(vehicleType.id)}
            >
              <Feather
                name={vehicleType.icon as any}
                size={16}
                color={
                  selectedVehicleType === vehicleType.id ? '#FFFFFF' : '#6C757D'
                }
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedVehicleType === vehicleType.id &&
                    styles.filterChipTextSelected,
                ]}
              >
                {vehicleType.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderDriverAuctions = () => {
    if (filteredAuctions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="clock" size={48} color="#6C757D" />
          <Text style={styles.emptyStateTitle}>
            {selectedVehicleType === 'all'
              ? 'No Active Auctions'
              : 'No Jobs for Selected Vehicle Type'}
          </Text>
          <Text style={styles.emptyStateText}>
            {selectedVehicleType === 'all'
              ? 'No active auctions available at the moment'
              : `No active auctions for ${
                  VEHICLE_TYPES.find((v) => v.id === selectedVehicleType)?.label
                }`}
          </Text>
          {selectedVehicleType !== 'all' && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setSelectedVehicleType('all')}
            >
              <Text style={styles.clearFilterButtonText}>Show All Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return filteredAuctions.map((auction) => (
      <TouchableOpacity
        key={auction.id}
        style={styles.card}
        onPress={() => router.push(`/auctions/${auction.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{auction.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getAuctionStatusColor(auction) },
            ]}
          >
            <Text style={styles.statusText}>
              {getAuctionStatusText(auction)}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {auction.description}
        </Text>

        <View style={styles.vehicleInfo}>
          <Feather name="truck" size={16} color="#6C757D" />
          <Text style={styles.vehicleType}>
            {auction.vehicle_type
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Text>
        </View>

        <View style={styles.timeInfo}>
          <Feather name="clock" size={16} color="#6C757D" />
          <Text style={styles.timeText}>
            {auction.status === 'active' && isPast(new Date(auction.end_time))
              ? `Expired ${format(new Date(auction.end_time), 'MMM d, h:mm a')}`
              : auction.status === 'cancelled'
              ? `Cancelled ${format(
                  new Date(auction.end_time),
                  'MMM d, h:mm a'
                )}`
              : `Ends ${format(new Date(auction.end_time), 'MMM d, h:mm a')}`}
          </Text>
        </View>
      </TouchableOpacity>
    ));
  };

  const renderDriverJobs = () => {
    if (bids.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="briefcase" size={48} color="#6C757D" />
          <Text style={styles.emptyStateTitle}>No Jobs Yet</Text>
          <Text style={styles.emptyStateText}>
            Start bidding on available auctions to get jobs
          </Text>
        </View>
      );
    }

    return bids
      .map((bid) => {
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
                router.push(`/auctions/${bid.auction.id}`);
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
                <Text style={styles.winnerText}>Winning Bid</Text>
              </View>
            )}

            <Text style={styles.description} numberOfLines={2}>
              {bid.auction.description}
            </Text>

            <View style={styles.bidInfo}>
              <View style={styles.bidAmount}>
                <Feather name="credit-card" size={16} color="#28A745" />
                <Text style={styles.bidAmountText}>₹{bid.amount}</Text>
              </View>
              <Text style={styles.bidTime}>
                {bid.created_at
                  ? format(new Date(bid.created_at), 'MMM d, h:mm a')
                  : 'Unknown date'}
              </Text>
            </View>

            <View style={styles.vehicleInfo}>
              <Feather name="truck" size={16} color="#6C757D" />
              <Text style={styles.vehicleType}>
                {bid.auction.vehicle_type
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })
      .filter(Boolean); // Remove null entries from the rendered list
  };

  const renderConsignerAuctions = () => {
    if (auctions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="package" size={48} color="#6C757D" />
          <Text style={styles.emptyStateTitle}>No Auctions Yet</Text>
          <Text style={styles.emptyStateText}>
            Create your first auction to start receiving bids
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/auctions/create')}
          >
            <Text style={styles.createButtonText}>Create Auction</Text>
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    return auctions.map((auction) => (
      <TouchableOpacity
        key={auction.id}
        style={styles.card}
        onPress={() => router.push(`/auctions/${auction.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{auction.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getAuctionStatusColor(auction) },
            ]}
          >
            <Text style={styles.statusText}>
              {getAuctionStatusText(auction)}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {auction.description}
        </Text>

        <View style={styles.vehicleInfo}>
          <Feather name="truck" size={16} color="#6C757D" />
          <Text style={styles.vehicleType}>
            {auction.vehicle_type
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Text>
        </View>

        <View style={styles.timeInfo}>
          <Feather name="clock" size={16} color="#6C757D" />
          <Text style={styles.timeText}>
            {auction.status === 'active' && isPast(new Date(auction.end_time))
              ? `Expired ${format(new Date(auction.end_time), 'MMM d, h:mm a')}`
              : auction.status === 'cancelled'
              ? `Cancelled ${format(
                  new Date(auction.end_time),
                  'MMM d, h:mm a'
                )}`
              : `Ends ${format(new Date(auction.end_time), 'MMM d, h:mm a')}`}
          </Text>
        </View>
      </TouchableOpacity>
    ));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {userRole === 'driver' ? 'Available Jobs' : 'My Auctions'}
        </Text>
        {userRole === 'consigner' && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/auctions/create')}
          >
            <Text style={styles.createButtonText}>Create Auction</Text>
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {userRole === 'driver' ? (
        <>
          {renderVehicleFilter()}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Available Jobs ({filteredAuctions.length})
              {selectedVehicleType !== 'all' && (
                <Text style={styles.filterIndicator}>
                  {' '}
                  •{' '}
                  {
                    VEHICLE_TYPES.find((v) => v.id === selectedVehicleType)
                      ?.label
                  }
                </Text>
              )}
            </Text>
          </View>
          {renderDriverAuctions()}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Jobs ({bids.length})</Text>
          </View>
          {renderDriverJobs()}
        </>
      ) : (
        renderConsignerAuctions()
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
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
  },
  filterContainer: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  filterTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  filterScrollContainer: {
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  filterIndicator: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#007AFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  clearFilterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  clearFilterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginBottom: 12,
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
    marginLeft: 4,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#28A745',
  },
  bidTime: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
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
  },
});
