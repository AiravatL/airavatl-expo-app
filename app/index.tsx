import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

export default function RootIndex() {
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/(auth)/sign-in');
          return;
        }

        // Check role from user metadata first
        let userRole = user.user_metadata?.role;

        // Fallback to profiles table if not in metadata
        if (!userRole) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (!error && profile) {
            userRole = profile.role;
          }
        }

        // Navigate based on role
        if (userRole === 'driver') {
          router.replace('/(driver)/(tabs)/home');
        } else if (userRole === 'consigner') {
          router.replace('/(consigner)/(tabs)/home');
        } else {
          router.replace('/(auth)/sign-in');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        router.replace('/(auth)/sign-in');
      }
    };

    checkUserAndRedirect();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
