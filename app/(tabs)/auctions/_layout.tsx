import { Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type UserRole = 'consigner' | 'driver';

export default function AuctionsLayout() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    async function getUserRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserRole(profile.role as UserRole);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }

    getUserRole();
  }, []);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: userRole === 'consigner' ? 'My Auctions' : 'Available Jobs',
          headerShown: true,
          headerRight:
            userRole === 'consigner'
              ? () => (
                  <TouchableOpacity
                    onPress={() => router.push('/auctions/create')}
                    style={{ marginRight: 16 }}
                  >
                    <Feather name="plus" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )
              : undefined,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Auction Details',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.replace('/auctions')}
              style={{ marginLeft: 16 }}
            >
              <Feather name="arrow-left" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Auction',
          headerShown: true,
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
