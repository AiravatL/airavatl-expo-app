// lib/pushNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationService {
  registerForPushNotificationsAsync: () => Promise<string | undefined>;
  savePushTokenToDatabase: (token: string, userId: string) => Promise<void>;
  sendPushNotification: (expoPushToken: string, title: string, body: string, data?: any) => Promise<void>;
  schedulePushNotification: (title: string, body: string, seconds: number, data?: any) => Promise<string>;
  cancelScheduledNotification: (notificationId: string) => Promise<void>;
}

class PushNotificationServiceImpl implements PushNotificationService {
  async registerForPushNotificationsAsync(): Promise<string | undefined> {
    try {
      // Push notifications require a physical device
      if (!Device.isDevice) {
        return undefined;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
        });
      }

      // Check and request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return undefined;
      }

      // Get the push token with better error handling
      try {
        // Use EAS project ID from environment, with secure fallback
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                         Constants.easConfig?.projectId ??
                         process.env.EAS_PROJECT_ID;
        
        if (!projectId) {
          throw new Error('Project ID not found in app configuration. Please ensure EAS_PROJECT_ID is set in build environment.');
        }
        
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        
        if (!tokenData.data) {
          throw new Error('Failed to generate push token - no token data returned');
        }
        
        return tokenData.data;
      } catch (tokenError) {
        // In Expo Go, token generation often fails - this is expected
        if (Constants.appOwnership === 'expo') {
          return undefined;
        }
        
        // In production builds, this indicates a configuration issue
        throw new Error(`Push token generation failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}. Please check Firebase/FCM configuration.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in push notification setup';
      
      // In production builds, we need to surface configuration errors
      if (Constants.appOwnership !== 'expo') {
        throw new Error(`Push notification setup failed: ${errorMessage}`);
      }
      
      return undefined;
    }
  }

  async savePushTokenToDatabase(token: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) {
        console.error('Error saving push token:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save push token:', error);
      throw error;
    }
  }

  async sendPushNotification(
    expoPushToken: string, 
    title: string, 
    body: string, 
    data: any = {}
  ): Promise<void> {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to send push notification');
      }
    } catch (error) {
      throw error;
    }
  }

  async schedulePushNotification(
    title: string, 
    body: string, 
    seconds: number, 
    data: any = {}
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds 
      },
    });

    return notificationId;
  }

  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

export const pushNotificationService = new PushNotificationServiceImpl();

// Export the enhanced notification response handler
export { handleNotificationResponse } from './notificationHelpers';

// Helper function to get notification permissions status
export const getNotificationPermissions = async () => {
  return await Notifications.getPermissionsAsync();
};

// Helper function to check if device supports push notifications
export const canUsePushNotifications = () => {
  return Device.isDevice;
};
