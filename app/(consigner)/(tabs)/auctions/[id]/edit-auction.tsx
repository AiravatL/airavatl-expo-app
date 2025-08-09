import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AuctionFormShared } from '@/components/forms';

export default function EditAuctionScreen() {
  const params = useLocalSearchParams();

  // Parse auction data from parameters
  const parseAuctionTitle = (title: string) => {
    const match = title.match(/^Delivery from (.+) to (.+)$/);
    return match ? { from: match[1], to: match[2] } : { from: '', to: '' };
  };

  const extractDescriptionAndWeight = (description: string) => {
    const lines = description.split('\n');
    const mainDescription = lines[0] || '';

    // Extract weight from description
    const weightMatch = description.match(/Weight: (\d+(?:\.\d+)?)\s*kg/);
    const weight = weightMatch ? weightMatch[1] : '';

    return { description: mainDescription, weight };
  };

  const locations = parseAuctionTitle(params.title as string);
  const { description, weight } = extractDescriptionAndWeight(
    params.description as string
  );

  const initialData = {
    from: locations.from,
    to: locations.to,
    description,
    weight,
    vehicleType: params.vehicleType as string,
    duration: 5, // Default for edit mode
    customDuration: '',
    isCustomDuration: false,
    consignmentDate: new Date(),
  };

  const handleSuccess = () => {
    // Navigate back to auctions list and replace the current route
    router.replace('/auctions');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <AuctionFormShared
        key={`edit-auction-${params.id}`}
        mode="edit"
        initialData={initialData}
        auctionId={params.id as string}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        showSuccessAlert={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
