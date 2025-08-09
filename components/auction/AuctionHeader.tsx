import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Auction } from '@/hooks/useAuctions';
import { VEHICLE_TYPES } from '@/constants/vehicleTypes';
import { COLORS } from '@/constants/colors';

interface AuctionHeaderProps {
  auction: Auction;
  currentHighestBid?: number;
  onEdit?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
  isOwner?: boolean;
}

export function AuctionHeader({
  auction,
  currentHighestBid,
  onEdit,
  onCancel,
  showActions = false,
  isOwner = false,
}: AuctionHeaderProps) {
  const vehicleType = VEHICLE_TYPES.find(vt => vt.id === auction.vehicle_type);
  const isActive = auction.status === 'active';
  const endDate = new Date(auction.end_time);
  const isExpired = endDate < new Date();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{auction.title}</Text>
          <View style={[styles.statusBadge, getStatusStyle(auction.status)]}>
            <Text style={styles.statusText}>{auction.status}</Text>
          </View>
        </View>

        {showActions && isOwner && isActive && !isExpired && (
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
                <Feather name="edit-2" size={16} color={COLORS.primary[500]} />
              </TouchableOpacity>
            )}
            {onCancel && (
              <TouchableOpacity style={styles.actionButton} onPress={onCancel}>
                <Feather name="x" size={16} color={COLORS.error[500]} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Text style={styles.description}>{auction.description}</Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Feather name="truck" size={16} color={COLORS.primary[500]} />
          <Text style={styles.detailLabel}>Vehicle Type:</Text>
          <Text style={styles.detailValue}>
            {vehicleType?.icon} {vehicleType?.title || auction.vehicle_type}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="clock" size={16} color={COLORS.primary[500]} />
          <Text style={styles.detailLabel}>Ends:</Text>
          <Text style={[styles.detailValue, isExpired && styles.expiredText]}>
            {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString()}
          </Text>
        </View>

        {currentHighestBid !== undefined && (
          <View style={styles.detailRow}>
            <Feather name="trending-up" size={16} color={COLORS.success[500]} />
            <Text style={styles.detailLabel}>Current Highest Bid:</Text>
            <Text style={[styles.detailValue, styles.bidValue]}>
              ₹{currentHighestBid.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface AuctionActionsProps {
  auction: Auction;
  onEdit?: () => void;
  onCancel?: () => void;
  onViewBids?: () => void;
  isOwner?: boolean;
}

export function AuctionActions({
  auction,
  onEdit,
  onCancel,
  onViewBids,
  isOwner = false,
}: AuctionActionsProps) {
  const isActive = auction.status === 'active';
  const isExpired = new Date(auction.end_time) < new Date();

  if (!isOwner) return null;

  return (
    <View style={styles.actionsContainer}>
      {onViewBids && (
        <TouchableOpacity style={styles.secondaryButton} onPress={onViewBids}>
          <Feather name="eye" size={16} color={COLORS.primary[500]} />
          <Text style={styles.secondaryButtonText}>View Bids</Text>
        </TouchableOpacity>
      )}

      {isActive && !isExpired && (
        <>
          {onEdit && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onEdit}>
              <Feather name="edit-2" size={16} color={COLORS.primary[500]} />
              <Text style={styles.secondaryButtonText}>Edit Auction</Text>
            </TouchableOpacity>
          )}

          {onCancel && (
            <TouchableOpacity style={styles.dangerButton} onPress={onCancel}>
              <Feather name="x" size={16} color={COLORS.white} />
              <Text style={styles.dangerButtonText}>Cancel Auction</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
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
  container: {
    backgroundColor: COLORS.background.primary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    flex: 1,
  },
  bidValue: {
    color: COLORS.success[700],
    fontWeight: '600',
  },
  expiredText: {
    color: COLORS.error[500],
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background.secondary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.error[500],
    borderRadius: 8,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
