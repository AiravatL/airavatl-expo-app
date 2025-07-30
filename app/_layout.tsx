import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { session, isLoading, isInitialized } = useAuth();

  // Handle navigation after everything is ready and mounted
  useEffect(() => {
    // Only navigate after fonts are loaded, auth is initialized, and not loading
    if (!fontsLoaded || !isInitialized || isLoading) return;

    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      try {
        console.log(
          '🧭 Navigation check - Session:',
          session?.user?.id || 'None'
        );
        if (session?.user?.id) {
          console.log('🧭 Navigating to tabs');
          router.replace('/(tabs)');
        } else {
          console.log('🧭 Navigating to sign-in');
          router.replace('/(auth)/sign-in');
        }
      } catch (error) {
        console.error('❌ Navigation error:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [fontsLoaded, session, isInitialized, isLoading]);

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
