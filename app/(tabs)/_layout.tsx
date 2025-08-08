import { Tabs, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type UserRole = 'consigner' | 'driver';

export default function TabLayout() {
  const { isLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

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
            console.log('User role detected:', profile.role);
            setUserRole(profile.role as UserRole);
          } else {
            router.replace('/(auth)/sign-in');
            return;
          }
        } else {
          router.replace('/(auth)/sign-in');
          return;
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        router.replace('/(auth)/sign-in');
        return;
      } finally {
        setRoleLoading(false);
      }
    }

    getUserRole();
  }, []);

  if (isLoading || roleLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!userRole) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  console.log('Rendering tabs for role:', userRole);

  // Render different tab layouts based on user role
  if (userRole === 'driver') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#E5E5E5',
          },
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            fontFamily: 'Inter_600SemiBold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color }) => (
              <Feather name="home" size={size} color={color} />
            ),
            headerTitle: 'Welcome to AiravatL',
          }}
        />

        <Tabs.Screen
          name="auctions"
          options={{
            title: 'Jobs',
            tabBarIcon: ({ size, color }) => (
              <Feather name="briefcase" size={size} color={color} />
            ),
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="info"
          options={{
            title: 'Info',
            tabBarIcon: ({ size, color }) => (
              <Feather name="info" size={size} color={color} />
            ),
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ size, color }) => (
              <Feather name="user" size={size} color={color} />
            ),
            headerTitle: 'My Profile',
          }}
        />

        {/* Hide create-auction completely for drivers */}
        <Tabs.Screen
          name="create-auction"
          options={{
            href: null,
          }}
        />
      </Tabs>
    );
  }

  // Consigner layout with all tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontFamily: 'Inter_600SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Feather name="home" size={size} color={color} />
          ),
          headerTitle: 'Welcome to AiravatL',
        }}
      />

      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Auctions',
          tabBarIcon: ({ size, color }) => (
            <Feather name="package" size={size} color={color} />
          ),
          headerShown: false,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Reset the auctions stack when tab is pressed
            navigation.reset({
              index: 0,
              routes: [{ name: 'auctions' }],
            });
          },
        })}
      />

      <Tabs.Screen
        name="create-auction"
        options={{
          title: 'Create',
          tabBarIcon: ({ size, color }) => (
            <Feather name="plus-circle" size={size} color={color} />
          ),
          headerTitle: 'Create Auction',
        }}
      />

      <Tabs.Screen
        name="info"
        options={{
          title: 'Info',
          tabBarIcon: ({ size, color }) => (
            <Feather name="info" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <Feather name="user" size={size} color={color} />
          ),
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}
