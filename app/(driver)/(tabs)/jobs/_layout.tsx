import React from 'react';
import { Stack } from 'expo-router';

export default function JobsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
        headerTintColor: '#34C759',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Available Jobs',
          headerTitle: 'Available Jobs',
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Job Details',
          headerTitle: 'Job Details',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
