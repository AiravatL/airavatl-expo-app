import React from 'react';
import { View, StyleSheet } from 'react-native';

import AuctionsList from '@/components/auction/AuctionsList';

export default function JobsScreen() {
  return (
    <View style={styles.container}>
      <AuctionsList vehicleTypeFilter="all" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
