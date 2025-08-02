import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { performanceService } from '@/lib/performanceService';
import { formatDistanceToNow } from 'date-fns';

interface OptimizedAuction {
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
}

interface User {
  id: string;
  role: string;
  vehicle_type?: string | null;
}

const OptimizedAuctionsList = () => {
  const [auctions, setAuctions] = useState<OptimizedAuction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<'all' | 'my_vehicle_type'>('all');

  const router = useRouter();

  // Get current user efficiently
  useEffect(() => {
    async function fetchUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, vehicle_type')
            .eq('id', user.id)
            .single();

          if (profile) {
            setCurrentUser({
              id: user.id,
              role: profile.role,
              vehicle_type: profile.vehicle_type,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }
    fetchUser();
  }, []);

  // Optimized auction fetching
  const fetchAuctions = useCallback(
    async (showLoading = true) => {
      if (!currentUser) return;

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const vehicleTypeFilter =
          filter === 'my_vehicle_type' && currentUser.vehicle_type
            ? currentUser.vehicle_type
            : undefined;

        // Use optimized service
        const auctionsList =
          await performanceService.getAvailableAuctionsOptimized(
            currentUser.role,
            vehicleTypeFilter
          );

        setAuctions(auctionsList);
      } catch (error) {
        console.error('Error fetching auctions:', error);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser, filter]
  );

  useEffect(() => {
    if (currentUser) {
      fetchAuctions();
    }
  }, [currentUser, fetchAuctions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAuctions(false);
  }, [fetchAuctions]);

  const handleAuctionPress = (auctionId: string) => {
    router.push(`/auctions/${auctionId}-optimized`);
  };

  const getAuctionStatus = (auction: OptimizedAuction) => {
    if (auction.status === 'completed') return 'Completed';
    if (auction.status === 'cancelled') return 'Cancelled';

    const endTime = new Date(auction.end_time);
    const now = new Date();

    if (endTime <= now) {
      return 'Expired';
    }

    return 'Active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return '#34C759';
      case 'Completed':
        return '#007AFF';
      case 'Expired':
        return '#FF9500';
      default:
        return '#FF3B30';
    }
  };

  const renderAuctionItem = ({ item }: { item: OptimizedAuction }) => {
    const status = getAuctionStatus(item);
    const isActive = status === 'Active';

    return (
      <TouchableOpacity
        style={styles.auctionCard}
        onPress={() => handleAuctionPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.auctionHeader}>
          <Text style={styles.auctionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(status) },
            ]}
          >
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <Text style={styles.auctionDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.auctionDetails}>
          <View style={styles.detailRow}>
            <Feather name="truck" size={16} color="#666" />
            <Text style={styles.detailText}>{item.vehicle_type}</Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="clock" size={16} color="#666" />
            <Text style={styles.detailText}>
              {isActive
                ? `Ends ${formatDistanceToNow(new Date(item.end_time), {
                    addSuffix: true,
                  })}`
                : `Ended ${formatDistanceToNow(new Date(item.end_time), {
                    addSuffix: true,
                  })}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Available Auctions</Text>

      {currentUser?.role === 'driver' && currentUser.vehicle_type && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'all' && styles.filterTextActive,
              ]}
            >
              All Auctions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'my_vehicle_type' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('my_vehicle_type')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'my_vehicle_type' && styles.filterTextActive,
              ]}
            >
              My Vehicle Type
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="package" size={48} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No auctions available</Text>
      <Text style={styles.emptySubtitle}>
        {currentUser?.role === 'driver'
          ? 'New delivery opportunities will appear here'
          : 'Create your first auction to get started'}
      </Text>
    </View>
  );

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={auctions}
        renderItem={renderAuctionItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        contentContainerStyle={
          auctions.length === 0 ? styles.emptyListContainer : undefined
        }
        showsVerticalScrollIndicator={false}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    backgroundColor: '#FFF',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFF',
  },
  auctionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  auctionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  auctionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  auctionDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  auctionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default OptimizedAuctionsList;
