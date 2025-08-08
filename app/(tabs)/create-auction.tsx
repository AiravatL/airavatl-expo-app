import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AuctionFormShared } from '@/components/forms';

export default function CreateAuctionScreen() {
  const handleSuccess = () => {
    router.push('/auctions');
  };

  return (
    <View style={styles.container}>
      <AuctionFormShared mode="create" onSuccess={handleSuccess} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
