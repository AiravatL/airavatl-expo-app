import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function ConsignerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
        headerTintColor: '#007AFF',
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          headerTitle: 'Welcome to AiravatL',
          tabBarIcon: ({ size, color }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Auctions Tab */}
      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Auctions',
          headerShown: false, // Let the stack handle headers
          tabBarIcon: ({ size, color }) => (
            <Feather name="package" size={size} color={color} />
          ),
        }}
      />

      {/* Create Tab */}
      <Tabs.Screen
        name="create/index"
        options={{
          title: 'Create',
          headerTitle: 'Create Auction',
          tabBarIcon: ({ size, color }) => (
            <Feather name="plus-circle" size={size} color={color} />
          ),
        }}
      />

      {/* History Tab */}
      <Tabs.Screen
        name="history/index"
        options={{
          title: 'History',
          headerTitle: 'Auction History',
          tabBarIcon: ({ size, color }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          tabBarIcon: ({ size, color }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
