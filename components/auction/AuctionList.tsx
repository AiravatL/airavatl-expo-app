import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Auction } from '@/hooks/useAuctions';
import { VEHICLE_TYPES } from '@/constants/vehicleTypes';
import { COLORS } from '@/constants/colors';

interface AuctionCardProps {
  auction: Auction;
  onPress: (auction: Auction) => void;
  showStatus?: boolean;
}

export function AuctionCard({
  auction,
  onPress,
  showStatus = false,
}: AuctionCardProps) {
  const vehicleType = VEHICLE_TYPES.find(vt => vt.id === auction.vehicle_type);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(auction)}>
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {auction.title}
        </Text>
        {showStatus && (
          <View style={[styles.statusBadge, getStatusStyle(auction.status)]}>
            <Text style={styles.statusText}>{auction.status}</Text>
          </View>
        )}
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {auction.description}
      </Text>

      <View style={styles.routeContainer}>
        <Feather name="map-pin" size={14} color={COLORS.primary[500]} />
        <Text style={styles.routeText} numberOfLines={1}>
          {/* TODO: Get actual route info from auction */}
          Route info
        </Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.vehicleTypeContainer}>
          <Text style={styles.vehicleIcon}>{vehicleType?.icon || '🚛'}</Text>
          <Text style={styles.vehicleText}>
            {vehicleType?.title || auction.vehicle_type}
          </Text>
        </View>

        <View style={styles.timeContainer}>
          <Feather name="clock" size={14} color={COLORS.text.secondary} />
          <Text style={styles.timeText}>
            {new Date(auction.end_time).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface AuctionListProps {
  auctions: Auction[];
  onAuctionPress: (auction: Auction) => void;
  isLoading?: boolean;
  showStatus?: boolean;
  emptyMessage?: string;
}

export function AuctionList({
  auctions,
  onAuctionPress,
  isLoading = false,
  showStatus = false,
  emptyMessage = 'No auctions available',
}: AuctionListProps) {
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading auctions...</Text>
      </View>
    );
  }

  if (auctions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="inbox" size={48} color={COLORS.text.secondary} />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={auctions}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <AuctionCard
          auction={item}
          onPress={onAuctionPress}
          showStatus={showStatus}
        />
      )}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'active':
      return { backgroundColor: COLORS.success[500] };
    case 'completed':
      return { backgroundColor: COLORS.primary[500] };
    case 'cancelled':
      return { backgroundColor: COLORS.error[500] };
    default:
      return { backgroundColor: COLORS.text.secondary };
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
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
    fontWeight: '500',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 6,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  vehicleText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 16,
  },
  listContainer: {
    padding: 16,
  },
});
