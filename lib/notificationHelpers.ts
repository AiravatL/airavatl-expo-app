// lib/notificationHelpers.ts
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

export interface NotificationData {
  type: string;
  auctionId?: string;
  userId?: string;
  bidAmount?: number;
  [key: string]: any;
}

/**
 * Enhanced notification response handler with deep linking
 */
export const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
  const data = response.notification.request.content.data as NotificationData;
  
  if (__DEV__) {
    console.log('Notification tapped:', data);
  }
  
  try {
    switch (data.type) {
      case 'auction_won':
      case 'auction_ended':
      case 'new_bid':
      case 'outbid':
        if (data.auctionId) {
          router.push(`/(tabs)/auctions/${data.auctionId}`);
        }
        break;
        
      case 'auction_completed':
        if (data.auctionId) {
          router.push(`/(tabs)/auctions/${data.auctionId}`);
        } else {
          router.push('/(tabs)/profile');
        }
        break;
        
      default:
        // Default to main auction screen
        router.push('/(tabs)/auctions');
        break;
    }
  } catch (error) {
    console.error('Error handling notification navigation:', error);
    // Fallback to main screen
    router.push('/(tabs)');
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync();
    if (__DEV__) {
      console.log('All notifications cleared');
    }
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

/**
 * Get notification badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
};

/**
 * Set notification badge count
 */
export const setBadgeCount = async (count: number) => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};

/**
 * Clear notification badge
 */
export const clearBadge = async () => {
  await setBadgeCount(0);
};

/**
 * Check if notification permissions are granted
 */
export const hasNotificationPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

/**
 * Format notification for display
 */
export const formatNotificationText = (type: string, data: NotificationData): { title: string, body: string } => {
  switch (type) {
    case 'auction_won':
      return {
        title: '🎉 Congratulations!',
        body: `You won the auction${data.auctionId ? ` with bid ₹${data.bidAmount}` : ''}!`
      };
      
    case 'auction_ended':
      return {
        title: '🏁 Auction Ended',
        body: 'An auction you were interested in has ended. Check the results!'
      };
      
    case 'new_bid':
      return {
        title: '💰 New Bid Received',
        body: `Someone placed a bid${data.bidAmount ? ` of ₹${data.bidAmount}` : ''} on your auction`
      };
      
    case 'outbid':
      return {
        title: '📢 You\'ve been outbid!',
        body: `Someone placed a lower bid${data.bidAmount ? ` (₹${data.bidAmount})` : ''}. Time to bid again!`
      };
      
    case 'auction_cancelled':
      return {
        title: '❌ Auction Cancelled',
        body: 'An auction you were participating in has been cancelled'
      };
      
    default:
      return {
        title: '📱 AiravatL Notification',
        body: 'You have a new notification from AiravatL'
      };
  }
};
