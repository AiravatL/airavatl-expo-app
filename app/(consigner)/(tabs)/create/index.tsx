import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { AuctionFormShared } from '@/components/forms';

export default function CreateAuctionScreen() {
  const [formKey, setFormKey] = useState(0);

  const handleSuccess = () => {
    // Use replace to prevent back navigation to create form after successful creation
    router.replace('/(consigner)/(tabs)/auctions');
  };

  // Reset form when screen comes into focus to ensure fresh state
  useFocusEffect(
    React.useCallback(() => {
      setFormKey(prev => prev + 1);
    }, [])
  );

  return (
    <View style={styles.container}>
      <AuctionFormShared
        key={`create-auction-${formKey}`}
        mode="create"
        onSuccess={handleSuccess}
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
