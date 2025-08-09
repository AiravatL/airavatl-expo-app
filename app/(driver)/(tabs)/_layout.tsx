import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function DriverTabsLayout() {
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
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <Feather name="home" size={size} color={color} />
          ),
          headerTitle: 'Welcome to AiravatL',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Available Jobs',
          headerShown: false, // Let the stack handle headers
          tabBarIcon: ({ size, color }) => (
            <Feather name="briefcase" size={size} color={color} />
          ),
          tabBarLabel: 'Jobs',
          tabBarBadge: undefined, // You can add new jobs count here
        }}
      />
      <Tabs.Screen
        name="history/index"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ size, color }) => (
            <Feather name="truck" size={size} color={color} />
          ),
          headerTitle: 'My Job History',
          tabBarLabel: 'History',
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <Feather name="user" size={size} color={color} />
          ),
          headerTitle: 'My Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
