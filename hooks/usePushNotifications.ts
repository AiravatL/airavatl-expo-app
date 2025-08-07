// hooks/usePushNotifications.ts
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { pushNotificationService, handleNotificationResponse } from '@/lib/notifications/pushNotifications';
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
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          setError('Failed to get user session. Push notifications may not work properly.');
          return;
        }

        if (user) {
          try {
            await pushNotificationService.savePushTokenToDatabase(token, user.id);
            if (__DEV__) {
              console.log('✅ Push token saved successfully');
            }
          } catch (saveError) {
            const errorMessage = saveError instanceof Error ? saveError.message : 'Unknown error';
            console.error('❌ Failed to save push token:', errorMessage);
            setError(`Push token generated but failed to save: ${errorMessage}`);
          }
        } else {
          setError('No user session found. Please sign in to enable push notifications.');
        }
      } else {
        // Handle cases where token generation returns undefined
        if (Constants.appOwnership === 'expo') {
          setError('Push notifications have limitations in Expo Go. Build a development build for full functionality.');
        } else {
          setError('Failed to register for push notifications. Please check your device settings and try again.');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register for push notifications';
      setError(errorMessage);

      // Don't show technical errors to users in production
      if (Constants.appOwnership !== 'expo') {
        setError('Failed to set up push notifications. Please try again or contact support if the problem persists.');
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
