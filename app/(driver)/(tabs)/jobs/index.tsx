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
import { useRouter, useFocusEffect } from 'expo-router';
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

export default function JobsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'available' | 'mybids'>('available');

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

      // Fetch all ACTIVE auctions for drivers to see and bid on
      const { data: availableAuctions, error: auctionsError } = await supabase
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .gt('end_time', new Date().toISOString()) // Only non-expired auctions
        .neq('created_by', user.id) // Exclude user's own auctions
        .order('created_at', { ascending: false });

      if (auctionsError) {
        throw auctionsError;
      }

      setAuctions(availableAuctions || []);

      // Fetch user's bids with auction data
      const { data: userBids, error: bidsError } = await supabase
        .from('auction_bids')
        .select(`
          *,
          auction:auctions!auction_id (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bidsError) {
        throw bidsError;
      }

      // Convert the bid data to match our interface
      const convertedBids: Bid[] = (userBids || []).map((bid: any) => ({
        id: bid.id,
        amount: bid.amount,
        status: 'active', // Default status for bids
        created_at: bid.created_at,
        is_winning_bid: bid.is_winning_bid,
        user_id: bid.user_id,
        auction_id: bid.auction_id,
        auction: bid.auction ? {
          id: bid.auction.id,
          title: bid.auction.title,
          description: bid.auction.description,
          status: bid.auction.status,
          end_time: bid.auction.end_time,
          vehicle_type: bid.auction.vehicle_type,
          created_by: bid.auction.created_by,
          winner_id: bid.auction.winner_id,
          start_time: bid.auction.start_time,
          consignment_date: bid.auction.consignment_date,
          created_at: bid.auction.created_at,
        } : null,
      }));

      setBids(convertedBids);
    } catch {
      setError('Failed to load available jobs. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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

  // Filter auctions by vehicle type
  useEffect(() => {
    if (selectedVehicleType === 'all') {
      setFilteredAuctions(auctions);
    } else {
      setFilteredAuctions(
        auctions.filter((auction) => auction.vehicle_type === selectedVehicleType)
      );
    }
  }, [auctions, selectedVehicleType]);

  const getAuctionStatusColor = (auction: Auction) => {
    if (auction.status === 'active') {
      if (isPast(new Date(auction.end_time))) {
        return '#DC3545'; // Red for expired
      }
      return '#34C759'; // Green for active (driver color)
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

  const renderVehicleFilter = () => {
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

  const renderTabBar = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            Available Jobs ({filteredAuctions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mybids' && styles.activeTab]}
          onPress={() => setActiveTab('mybids')}
        >
          <Text style={[styles.tabText, activeTab === 'mybids' && styles.activeTabText]}>
            My Bids ({bids.length})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAvailableJobs = () => {
    if (filteredAuctions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="briefcase" size={48} color="#6C757D" />
          <Text style={styles.emptyStateTitle}>No Jobs Available</Text>
          <Text style={styles.emptyStateText}>
            {selectedVehicleType === 'all' 
              ? 'No active transport jobs are available at the moment. Check back later!'
              : `No jobs available for ${VEHICLE_TYPES.find(v => v.id === selectedVehicleType)?.label}. Try a different filter.`
            }
          </Text>
        </View>
      );
    }

    return filteredAuctions.map(auction => (
      <TouchableOpacity
        key={auction.id}
        style={styles.card}
        onPress={() => router.push(`/(driver)/(tabs)/jobs/${auction.id}`)}
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

  const renderMyBids = () => {
    if (bids.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="briefcase" size={48} color="#6C757D" />
          <Text style={styles.emptyStateTitle}>No Bids Yet</Text>
          <Text style={styles.emptyStateText}>
            Start bidding on available jobs to track them here
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
                router.push(`/(driver)/(tabs)/jobs/${bid.auction.id}`);
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
                <Feather name="credit-card" size={16} color="#34C759" />
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
      <TouchableOpacity
        key={auction.id}
        style={styles.card}
        onPress={() => router.push(`/(driver)/(tabs)/jobs/${auction.id}`)}
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
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Text>
        </View>

        <View style={styles.timeInfo}>
          <Feather name="clock" size={16} color="#6C757D" />
          <Text style={styles.timeText}>
            Bidding ends {format(new Date(auction.end_time), 'MMM d, h:mm a')}
          </Text>
        </View>

        <View style={styles.jobInfo}>
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Driver Jobs</Text>
      </View>

      {renderVehicleFilter()}
      {renderTabBar()}

      <View style={styles.tabContent}>
        {activeTab === 'available' ? renderAvailableJobs() : renderMyBids()}
      </View>
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
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobText: {
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
