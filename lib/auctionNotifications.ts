// lib/auctionNotifications.ts
import { supabase } from './supabase';
import { pushNotificationService } from './pushNotifications';

export interface AuctionNotificationData {
  auctionId: string;
  auctionTitle: string;
  type: 'auction_created' | 'bid_placed' | 'outbid' | 'auction_won' | 'auction_lost' | 'auction_cancelled' | 'bid_cancelled';
  userId?: string;
  amount?: number;
}

class AuctionNotificationService {
  // Helper method to get user role
  private async getUserRole(userId: string): Promise<'consigner' | 'driver' | null> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return null;
      }

      return profile.role as 'consigner' | 'driver';
    } catch {
      return null;
    }
  }

  // Test function to send a notification directly - REMOVED FOR PRODUCTION

  // Send notification to a specific user with role validation
  async sendNotificationToUser(
    userId: string, 
    title: string, 
    body: string, 
    data: AuctionNotificationData,
    targetRole?: 'consigner' | 'driver' // Optional role filtering
  ) {
    try {
      // If role filtering is specified, check user's role first
      if (targetRole) {
        const userRole = await this.getUserRole(userId);
        if (userRole !== targetRole) {
          // Skip notification for user due to role mismatch
          return;
        }
      }

      // Always save to auction_notifications table first
      const { error: dbError } = await supabase.from('auction_notifications').insert({
        user_id: userId,
        auction_id: data.auctionId,
        type: data.type,
        message: `${title}: ${body}`,
      });

      if (dbError) {
        return;
      }

      // Database notification saved successfully

      // Get user's push token from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (error || !profile?.push_token) {
        // No push token found, but database notification was saved
        return;
      }

      // Send push notification
      await pushNotificationService.sendPushNotification(
        profile.push_token,
        title,
        body,
        data
      );

      // Notification sent successfully
    } catch {
      // Silently handle errors in production
    }
  }

  // Send notification when someone wins an auction (to driver only)
  async notifyAuctionWinner(auctionId: string, winnerId: string, auctionTitle: string) {
    const data: AuctionNotificationData = {
      auctionId,
      auctionTitle,
      type: 'auction_won',
      userId: winnerId,
    };

    await this.sendNotificationToUser(
      winnerId,
      '🎉 Congratulations! You won an auction!',
      `You are the winner of "${auctionTitle}". Check your profile for details.`,
      data,
      'driver' // Only drivers can win auctions
    );
  }

  // Send notification when auction ends (to drivers who bid)
  async notifyAuctionEnded(auctionId: string, auctionTitle: string) {
    try {
      // Get all bidders for this auction
      const { data: bidders, error } = await supabase
        .from('auction_bids')
        .select('user_id')
        .eq('auction_id', auctionId);

      if (error || !bidders) {
        return;
      }

      // Get unique bidders
      const uniqueBidders = [...new Set(bidders.map(bid => bid.user_id))];

        const data: AuctionNotificationData = {
          auctionId,
          auctionTitle,
          type: 'auction_lost',
        };      // Send notification to all bidders (drivers only)
      for (const bidderId of uniqueBidders) {
        await this.sendNotificationToUser(
          bidderId,
          '🏁 Auction Ended',
          `The auction "${auctionTitle}" has ended. Check the results!`,
          data,
          'driver' // Only drivers place bids
        );
      }
    } catch {
      // Silently handle errors in production
    }
  }

  // Send notification when someone is outbid (to driver only)
  async notifyOutbid(auctionId: string, outbidUserId: string, auctionTitle: string, newBidAmount: number) {
    const data: AuctionNotificationData = {
      auctionId,
      auctionTitle,
      type: 'outbid',
      amount: newBidAmount,
    };

    await this.sendNotificationToUser(
      outbidUserId,
      '📢 You\'ve been outbid!',
      `Someone placed a lower bid (₹${newBidAmount.toFixed(2)}) on "${auctionTitle}". Place a new bid to stay in the race!`,
      data,
      'driver' // Only drivers place bids
    );
  }

  // Send notification for new bid (to consigner only)
  async notifyNewBid(auctionId: string, creatorId: string, auctionTitle: string, bidAmount: number) {
    const data: AuctionNotificationData = {
      auctionId,
      auctionTitle,
      type: 'bid_placed',
      amount: bidAmount,
    };

    await this.sendNotificationToUser(
      creatorId,
      '💰 New Bid Received!',
      `Someone placed a bid of ₹${bidAmount.toFixed(2)} on your auction "${auctionTitle}".`,
      data,
      'consigner' // Only consigners create auctions
    );
  }

  // Send notification when auction is cancelled (to drivers who bid)
  async notifyAuctionCancelled(auctionId: string, auctionTitle: string) {
    try {
      // Get all bidders for this auction
      const { data: bidders, error } = await supabase
        .from('auction_bids')
        .select('user_id')
        .eq('auction_id', auctionId);

      if (error || !bidders) {
        return;
      }

      // Get unique bidders
      const uniqueBidders = [...new Set(bidders.map(bid => bid.user_id))];

      const data: AuctionNotificationData = {
        auctionId,
        auctionTitle,
        type: 'auction_cancelled',
      };

      // Send notification to all bidders (drivers only)
      for (const bidderId of uniqueBidders) {
        await this.sendNotificationToUser(
          bidderId,
          '❌ Auction Cancelled',
          `The auction "${auctionTitle}" has been cancelled by the consigner.`,
          data,
          'driver' // Only drivers place bids
        );
      }
    } catch {
      // Silently handle errors in production
    }
  }

  // Send notification for upcoming auction (24 hours before) - to drivers only
  async notifyUpcomingAuction(auctionId: string, auctionTitle: string, startTime: string) {
    try {
      // Get all users who might be interested (you can customize this logic)
      // For now, we'll get users who have participated in auctions before
      const { data: interestedUsers, error } = await supabase
        .from('auction_bids')
        .select('user_id')
        .limit(100); // Limit to avoid spam

      if (error || !interestedUsers) {
        return;
      }

      // Get unique users
      const uniqueUsers = [...new Set(interestedUsers.map(bid => bid.user_id))];

        const data: AuctionNotificationData = {
          auctionId,
          auctionTitle,
          type: 'auction_cancelled', // Using proper type for upcoming auction
        };      // Send notification to interested users (drivers only)
      for (const userId of uniqueUsers) {
        await this.sendNotificationToUser(
          userId,
          '🚚 New Auction Starting Soon!',
          `"${auctionTitle}" will start at ${new Date(startTime).toLocaleString()}. Don't miss out!`,
          data,
          'driver' // Only drivers bid on auctions
        );
      }
    } catch {
      // Silently handle errors in production
    }
  }

  // Send notification to drivers about new auction opportunity (vehicle-specific)
  async notifyNewAuction(auctionId: string, auctionTitle: string, vehicleType: string, weight: number) {
    try {
      // Get drivers with matching vehicle type OR null vehicle type (for backward compatibility)
      const { data: drivers, error } = await supabase
        .from('profiles')
        .select('id, username, push_token, vehicle_type')
        .eq('role', 'driver')
        .or(`vehicle_type.eq.${vehicleType},vehicle_type.is.null`);

      if (error || !drivers) {
        return;
      }

      // Filter drivers by vehicle type and push token availability 
      const validDrivers = drivers.filter(d => d.push_token);

      const data: AuctionNotificationData = {
        auctionId,
        auctionTitle,
        type: 'auction_created', // Match database constraint for new auction notifications
      };

      // Vehicle type display name
      const vehicleDisplayName = vehicleType.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      // Send notification to drivers (drivers only)
      for (const driver of validDrivers) {
        try {
          await this.sendNotificationToUser(
            driver.id,
            '🚚 New Job Available!',
            `${auctionTitle} • ${vehicleDisplayName} • ${weight}kg`,
            data,
            'driver' // Only drivers should get new auction notifications
          );
        } catch {
          // Log error but continue with other drivers
        }
      }
    } catch {
      // Silently handle errors in production
    }
  }
}

export const auctionNotificationService = new AuctionNotificationService();
