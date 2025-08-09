import React from 'react';
import { Stack } from 'expo-router';

export default function AuctionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
        headerTintColor: '#007AFF',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'My Auctions',
          headerTitle: 'My Auctions',
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Auction Details',
          headerTitle: 'Auction Details',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="[id]/edit-auction"
        options={{
          title: 'Edit Auction',
          headerTitle: 'Edit Auction',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
