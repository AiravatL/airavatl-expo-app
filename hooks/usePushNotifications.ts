// hooks/usePushNotifications.ts
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { pushNotificationService, handleNotificationResponse } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';

export interface UsePushNotificationsReturn {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
  error: string | null;
  isLoading: boolean;
  registerForPushNotifications: () => Promise<void>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const registerForPushNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await pushNotificationService.registerForPushNotificationsAsync();
      
      if (token) {
        setExpoPushToken(token);
        
        // Save token to database if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await pushNotificationService.savePushTokenToDatabase(token, user.id);
        }
      } else {
        // In Expo Go, this is expected
        if (Constants.appOwnership === 'expo') {
          setError('Push notifications have limitations in Expo Go. Build a development build for full functionality.');
        } else {
          // In production builds, this is unexpected
          setError('Failed to register for push notifications. Please try again.');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register for push notifications';
      setError(errorMessage);
      // Don't show error to user in development - it's expected in Expo Go
      if (!__DEV__ || Constants.appOwnership !== 'expo') {
        if (__DEV__) {
          console.error('Push notification error:', err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Register notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    error,
    isLoading,
    registerForPushNotifications,
  };
};
