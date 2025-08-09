import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function DriverTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#34C759', // Green for drivers
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#C7C7CC',
          paddingBottom: Platform.OS === 'ios' ? 34 : 8, // Account for iPhone home indicator
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 68,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
            web: {
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: Platform.select({
            ios: 'Inter_600SemiBold',
            android: 'Inter_600SemiBold',
            default: 'Inter_600SemiBold',
          }),
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 0.5,
          borderBottomColor: '#C7C7CC',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 4,
            },
            web: {
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
            },
          }),
        },
        headerTitleStyle: {
          fontFamily: 'Inter_700Bold',
          fontSize: 18,
          color: '#1C1C1E',
        },
        headerShown: true,
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color, focused }) => (
            <Feather name="home" size={focused ? 26 : 24} color={color} />
          ),
          headerTitle: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Available Jobs',
          headerShown: false, // Let the stack handle headers
          tabBarIcon: ({ size, color, focused }) => (
            <Feather name="briefcase" size={focused ? 26 : 24} color={color} />
          ),
          tabBarLabel: 'Jobs',
          tabBarBadge: undefined, // You can add new jobs count here
        }}
      />
      <Tabs.Screen
        name="history/index"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ size, color, focused }) => (
            <Feather name="truck" size={focused ? 26 : 24} color={color} />
          ),
          headerTitle: 'My Job History',
          tabBarLabel: 'History',
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color, focused }) => (
            <Feather name="user" size={focused ? 26 : 24} color={color} />
          ),
          headerTitle: 'My Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
