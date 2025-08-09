import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Bid } from '@/hooks/useAuctions';
import { COLORS } from '@/constants/colors';

interface BidListProps {
  bids: Bid[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function BidList({
  bids,
  isLoading = false,
  emptyMessage = 'No bids yet',
}: BidListProps) {
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading bids...</Text>
      </View>
    );
  }

  if (bids.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="dollar-sign" size={32} color={COLORS.text.secondary} />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={bids}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => (
        <BidItem bid={item} isHighest={index === 0} />
      )}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

interface BidItemProps {
  bid: Bid;
  isHighest?: boolean;
}

function BidItem({ bid, isHighest = false }: BidItemProps) {
  return (
    <View style={[styles.bidItem, isHighest && styles.highestBid]}>
      <View style={styles.bidHeader}>
        <View style={styles.bidAmount}>
          <Text
            style={[styles.amountText, isHighest && styles.highestAmountText]}
          >
            ₹{bid.amount.toLocaleString()}
          </Text>
          {isHighest && (
            <View style={styles.highestBadge}>
              <Text style={styles.highestBadgeText}>Highest</Text>
            </View>
          )}
        </View>
        <Text style={styles.bidTime}>
          {new Date(bid.created_at).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
}

interface BidFormProps {
  onSubmitBid: (amount: number) => Promise<void>;
  isLoading?: boolean;
  minimumBid?: number;
  disabled?: boolean;
}

export function BidForm({
  onSubmitBid,
  isLoading = false,
  minimumBid = 0,
  disabled = false,
}: BidFormProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amount = parseFloat(bidAmount);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Bid', 'Please enter a valid bid amount');
      return;
    }

    if (amount <= minimumBid) {
      Alert.alert(
        'Bid Too Low',
        `Your bid must be higher than ₹${minimumBid.toLocaleString()}`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmitBid(amount);
      setBidAmount('');
    } catch (error) {
      Alert.alert(
        'Bid Failed',
        error instanceof Error ? error.message : 'Failed to place bid'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.bidForm}>
      <Text style={styles.formLabel}>Your Bid Amount</Text>
      {minimumBid > 0 && (
        <Text style={styles.minimumBidText}>
          Minimum bid: ₹{minimumBid.toLocaleString()}
        </Text>
      )}

      <View style={styles.bidInputContainer}>
        <View style={styles.inputWrapper}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.bidInput}
            value={bidAmount}
            onChangeText={setBidAmount}
            placeholder="Enter your bid"
            keyboardType="numeric"
            editable={!disabled && !isSubmitting}
            placeholderTextColor={COLORS.text.disabled}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.bidButton,
            (disabled || isSubmitting || !bidAmount) &&
              styles.bidButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={disabled || isSubmitting || !bidAmount}
        >
          {isSubmitting ? (
            <Text style={styles.bidButtonText}>Placing...</Text>
          ) : (
            <>
              <Feather name="trending-up" size={16} color={COLORS.white} />
              <Text style={styles.bidButtonText}>Place Bid</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 120,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
  },
  bidItem: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.border.light,
  },
  highestBid: {
    backgroundColor: COLORS.success[50],
    borderLeftColor: COLORS.success[500],
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  highestAmountText: {
    color: COLORS.success[700],
  },
  highestBadge: {
    backgroundColor: COLORS.success[500],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  highestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  bidTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  bidForm: {
    backgroundColor: COLORS.background.primary,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  minimumBidText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  bidInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: 4,
  },
  bidInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  bidButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  bidButtonDisabled: {
    backgroundColor: COLORS.text.disabled,
  },
  bidButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});
