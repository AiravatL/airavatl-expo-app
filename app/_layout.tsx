import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { View, ActivityIndicator, Text } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [initError, setInitError] = useState<string | null>(null);

  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { session, isLoading, isInitialized } = useAuth();
  const { registerForPushNotifications } = usePushNotifications();

  // Debug logging for session changes
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 Session state changed:', {
        hasSession: !!session,
        userId: session?.user?.id || 'None',
        isLoading,
        isInitialized,
      });
    }
  }, [session, isLoading, isInitialized]);

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (session?.user?.id && isInitialized && !isLoading) {
      // Wait a moment for the auth context to be fully established
      const timer = setTimeout(() => {
        // Don't block app loading if push notifications fail
        registerForPushNotifications().catch((error) => {
          if (__DEV__) {
            console.warn('Push notification setup failed:', error);
          }
          // Continue app loading normally
        });
      }, 2000); // Wait 2 seconds after auth is ready

      return () => clearTimeout(timer);
    }
  }, [
    session?.user?.id,
    isInitialized,
    isLoading,
    registerForPushNotifications,
  ]);

  // Handle navigation after everything is ready and mounted
  useEffect(() => {
    // Only navigate after fonts are loaded, auth is initialized, and not loading
    if (!fontsLoaded || !isInitialized || isLoading) {
      if (__DEV__) {
        console.log('⏳ Not ready for navigation yet:', {
          fontsLoaded,
          isInitialized,
          isLoading,
        });
      }
      return;
    }

    // Hide splash screen when everything is ready
    SplashScreen.hideAsync().catch((error) => {
      console.warn('Failed to hide splash screen:', error);
    });

    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      try {
        if (__DEV__) {
          console.log(
            '🧭 Navigation check - Session:',
            session?.user?.id || 'None'
          );
        }

        if (session?.user?.id) {
          if (__DEV__) {
            console.log('🧭 Navigating to tabs');
          }
          router.replace('/(tabs)');
        } else {
          if (__DEV__) {
            console.log('🧭 Navigating to sign-in');
          }
          router.replace('/(auth)/sign-in');
        }
      } catch (error) {
        if (__DEV__) {
          console.error('❌ Navigation error:', error);
        }
        setInitError('Navigation failed. Please restart the app.');
        // Fallback navigation
        if (session?.user?.id) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/sign-in');
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [fontsLoaded, session?.user?.id, isInitialized, isLoading]);

  // Show error screen if initialization failed
  if (initError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#007AFF',
          padding: 20,
        }}
      >
        <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 16 }}>
          {initError}
        </Text>
      </View>
    );
  }

  // Show loading screen while fonts or auth are loading
  if (!fontsLoaded || !isInitialized || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#007AFF',
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
