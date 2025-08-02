import { supabase } from './supabase';
import { appCache, CACHE_KEYS, CACHE_TTL } from './cache';

export interface Profile {
  id: string;
  username: string;
  phone_number: string | null;
  upi_id: string | null;
  address: string | null;
  bio: string | null;
  role: string; // Changed to string to match DB
  vehicle_type?: string | null;
  push_token?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  status: string;
  end_time: string;
  vehicle_type: string;
  created_at: string | null; // Changed to match DB
  created_by: string;
  winner_id: string | null;
  winning_bid_id?: string | null;
  start_time?: string;
  consignment_date?: string;
}

export interface Bid {
  id: string;
  amount: number;
  status: string;
  created_at: string | null; // Changed to match DB
  is_winning_bid: boolean | null; // Changed to match DB
  auction: Auction | null;
  user_id: string;
  auction_id: string;
}

class DataService {
  // Get user profile with caching
  async getUserProfile(userId: string, forceRefresh = false): Promise<Profile | null> {
    const cacheKey = CACHE_KEYS.USER_PROFILE(userId);
    
    if (!forceRefresh) {
      const cached = appCache.get<Profile>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        appCache.set(cacheKey, data, CACHE_TTL.PROFILE);
      }

      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  // Get user auctions with caching (for consigners)
  async getUserAuctions(userId: string, forceRefresh = false): Promise<Auction[]> {
    const cacheKey = CACHE_KEYS.USER_AUCTIONS(userId);
    
    if (!forceRefresh) {
      const cached = appCache.get<Auction[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user auctions:', error);
        return [];
      }

      const auctions = data || [];
      appCache.set(cacheKey, auctions, CACHE_TTL.AUCTIONS);
      return auctions;
    } catch (error) {
      console.error('Error in getUserAuctions:', error);
      return [];
    }
  }

  // Get user bids with caching (for drivers)
  async getUserBids(userId: string, forceRefresh = false): Promise<Bid[]> {
    const cacheKey = CACHE_KEYS.USER_BIDS(userId);
    
    if (!forceRefresh) {
      const cached = appCache.get<Bid[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const { data, error } = await supabase
        .from('auction_bids')
        .select(`
          id,
          amount,
          created_at,
          is_winning_bid,
          auction_id,
          user_id,
          auctions!auction_bids_auction_id_fkey (
            id,
            title,
            description,
            status,
            end_time,
            vehicle_type,
            created_at,
            winner_id
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user bids:', error);
        return [];
      }

      const bids = (data || []).map(bid => ({
        ...bid,
        status: 'active', // Add default status
        auction: bid.auctions as Auction | null,
      }));

      appCache.set(cacheKey, bids, CACHE_TTL.BIDS);
      return bids;
    } catch (error) {
      console.error('Error in getUserBids:', error);
      return [];
    }
  }

  // Get available auctions with caching and filtering
  async getAvailableAuctions(userVehicleType?: string, forceRefresh = false): Promise<Auction[]> {
    const cacheKey = CACHE_KEYS.AVAILABLE_AUCTIONS(userVehicleType);
    
    if (!forceRefresh) {
      const cached = appCache.get<Auction[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      let query = supabase
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply vehicle type filter if specified
      if (userVehicleType && userVehicleType !== 'all') {
        query = query.eq('vehicle_type', userVehicleType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching available auctions:', error);
        return [];
      }

      const auctions = data || [];
      appCache.set(cacheKey, auctions, CACHE_TTL.AUCTIONS);
      return auctions;
    } catch (error) {
      console.error('Error in getAvailableAuctions:', error);
      return [];
    }
  }

  // Get auction details with caching
  async getAuctionDetails(auctionId: string, forceRefresh = false): Promise<Auction | null> {
    const cacheKey = CACHE_KEYS.AUCTION_DETAILS(auctionId);
    
    if (!forceRefresh) {
      const cached = appCache.get<Auction>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (error) {
        console.error('Error fetching auction details:', error);
        return null;
      }

      if (data) {
        appCache.set(cacheKey, data, CACHE_TTL.AUCTION_DETAILS);
      }

      return data;
    } catch (error) {
      console.error('Error in getAuctionDetails:', error);
      return null;
    }
  }

  // Get auction bids with caching
  async getAuctionBids(auctionId: string, forceRefresh = false): Promise<any[]> {
    const cacheKey = CACHE_KEYS.AUCTION_BIDS(auctionId);
    
    if (!forceRefresh) {
      const cached = appCache.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const { data, error } = await supabase
        .from('auction_bids')
        .select(`
          id,
          amount,
          created_at,
          is_winning_bid,
          profiles!auction_bids_user_id_fkey (
            id,
            username
          )
        `)
        .eq('auction_id', auctionId)
        .order('amount', { ascending: false });

      if (error) {
        console.error('Error fetching auction bids:', error);
        return [];
      }

      const bids = data || [];
      appCache.set(cacheKey, bids, CACHE_TTL.BIDS);
      return bids;
    } catch (error) {
      console.error('Error in getAuctionBids:', error);
      return [];
    }
  }

  // Create auction with cache invalidation
  async createAuction(auctionData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .insert(auctionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating auction:', error);
        return { success: false, error: error.message };
      }

      // Invalidate relevant caches
      appCache.invalidatePattern('auctions_');
      appCache.invalidatePattern('available_auctions_');

      return { success: true, data };
    } catch (error) {
      console.error('Error in createAuction:', error);
      return { success: false, error: 'Failed to create auction' };
    }
  }

  // Create bid with cache invalidation
  async createBid(bidData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('auction_bids')
        .insert(bidData)
        .select()
        .single();

      if (error) {
        console.error('Error creating bid:', error);
        return { success: false, error: error.message };
      }

      // Invalidate relevant caches
      appCache.invalidate(CACHE_KEYS.USER_BIDS(bidData.user_id));
      appCache.invalidate(CACHE_KEYS.AUCTION_BIDS(bidData.auction_id));
      appCache.invalidate(CACHE_KEYS.AUCTION_DETAILS(bidData.auction_id));

      return { success: true, data };
    } catch (error) {
      console.error('Error in createBid:', error);
      return { success: false, error: 'Failed to create bid' };
    }
  }

  // Update profile with cache invalidation
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }

      // Invalidate profile cache
      appCache.invalidate(CACHE_KEYS.USER_PROFILE(userId));

      return { success: true };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  // Check and close expired auctions - OPTIMIZED: Remove expensive operation
  async checkExpiredAuctions(): Promise<void> {
    // Remove expensive RPC call - let database triggers handle this automatically
    // The new database triggers will automatically update auction status
    console.log('Auction status updates are now handled automatically by database triggers');
  }

  // Force refresh all data for a user
  async refreshUserData(userId: string): Promise<void> {
    appCache.invalidate(CACHE_KEYS.USER_PROFILE(userId));
    appCache.invalidate(CACHE_KEYS.USER_AUCTIONS(userId));
    appCache.invalidate(CACHE_KEYS.USER_BIDS(userId));
    appCache.invalidatePattern('available_auctions_');
  }
}

export const dataService = new DataService();
