import { supabase } from './supabase';
import { appCache, CACHE_KEYS, CACHE_TTL } from './cache';

interface OptimizedAuction {
  id: string;
  title: string;
  description: string;
  status: string;
  end_time: string;
  vehicle_type: string;
  created_by: string;
  winner_id: string | null;
  start_time: string;
  consignment_date: string;
  bid_count?: number;
  highest_bid?: number;
  lowest_bid?: number;
}

interface OptimizedBid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string | null;
  is_winning_bid: boolean;
  bidder_username?: string;
}

class PerformanceService {
  private static instance: PerformanceService;
  private backgroundTasks: Set<Promise<any>> = new Set();

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  // Optimized auction fetching with minimal queries
  async getOptimizedAuctionDetails(auctionId: string): Promise<{
    auction: OptimizedAuction | null;
    bids: OptimizedBid[];
    userBid: OptimizedBid | null;
    canBid: boolean;
  }> {
    const cacheKey = `optimized_auction_${auctionId}`;
    
    // Check cache first
    const cached = appCache.get<any>(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
      return cached.data;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Single optimized query with minimal JOINs
      const [auctionResult, bidsResult, userRole] = await Promise.all([
        // Fetch auction with basic info only
        supabase
          .from('auctions')
          .select('*')
          .eq('id', auctionId)
          .single(),
        
        // Fetch bids with aggregated data
        supabase
          .from('auction_bids')
          .select(`
            id,
            auction_id,
            user_id,
            amount,
            created_at,
            is_winning_bid,
            profiles!inner(username)
          `)
          .eq('auction_id', auctionId)
          .order('amount', { ascending: true })
          .limit(50), // Limit bids for performance
        
        // Get user role if authenticated
        user ? supabase
          .from('profiles')
          .select('role, vehicle_type')
          .eq('id', user.id)
          .single() : null
      ]);

      if (auctionResult.error) {
        throw auctionResult.error;
      }

      const auction = auctionResult.data;
      const bids = bidsResult.data || [];
      
      // Process bids efficiently
      const optimizedBids: OptimizedBid[] = bids.map(bid => ({
        id: bid.id,
        auction_id: bid.auction_id,
        user_id: bid.user_id,
        amount: bid.amount,
        created_at: bid.created_at,
        is_winning_bid: bid.is_winning_bid || false,
        bidder_username: (bid.profiles as any)?.username || 'Unknown'
      }));

      const userBid = user ? optimizedBids.find(bid => bid.user_id === user.id) || null : null;
      
      // Determine if user can bid (simple logic, no complex queries)
      const canBid = user && 
        userRole?.data?.role === 'driver' && 
        auction.status === 'active' && 
        new Date(auction.end_time) > new Date() &&
        auction.created_by !== user.id &&
        !userBid;

      const result = {
        auction,
        bids: optimizedBids,
        userBid,
        canBid: !!canBid
      };

      // Cache the result
      appCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      }, 30); // 30 second cache

      return result;
    } catch (error) {
      console.error('Error in getOptimizedAuctionDetails:', error);
      return {
        auction: null,
        bids: [],
        userBid: null,
        canBid: false
      };
    }
  }

  // Optimized auction creation with batched operations
  async createAuctionOptimized(auctionData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Create auction without immediate notification processing
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .insert(auctionData)
        .select()
        .single();

      if (auctionError) {
        return { success: false, error: auctionError.message };
      }

      // Schedule notification processing in background
      this.scheduleBackgroundTask(async () => {
        try {
          const { auctionNotificationService } = await import('./auctionNotifications');
          await auctionNotificationService.notifyNewAuction(
            auction.id,
            auctionData.title,
            auctionData.vehicle_type,
            parseFloat(auctionData.description.match(/Weight: (\d+(?:\.\d+)?)/)?.[1] || '0')
          );
        } catch (error) {
          console.error('Background notification error:', error);
        }
      });

      // Clear relevant caches
      appCache.invalidatePattern('auctions_');
      appCache.invalidatePattern('available_auctions_');

      return { success: true, data: auction };
    } catch (error) {
      console.error('Error in createAuctionOptimized:', error);
      return { success: false, error: 'Failed to create auction' };
    }
  }

  // Optimized bid creation
  async createBidOptimized(auctionId: string, amount: number, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Simple bid creation without complex validation queries
      const { data: bid, error: bidError } = await supabase
        .from('auction_bids')
        .insert({
          auction_id: auctionId,
          user_id: userId,
          amount: amount
        })
        .select()
        .single();

      if (bidError) {
        return { success: false, error: bidError.message };
      }

      // Clear specific caches only
      appCache.invalidate(`optimized_auction_${auctionId}`);
      appCache.invalidate(CACHE_KEYS.USER_BIDS(userId));

      return { success: true, data: bid };
    } catch (error) {
      console.error('Error in createBidOptimized:', error);
      return { success: false, error: 'Failed to create bid' };
    }
  }

  // Background task scheduler to avoid blocking UI
  private scheduleBackgroundTask(task: () => Promise<void>): void {
    const taskPromise = task().finally(() => {
      this.backgroundTasks.delete(taskPromise);
    });
    
    this.backgroundTasks.add(taskPromise);
  }

  // Simplified auction list for better performance
  async getAvailableAuctionsOptimized(userRole: string, vehicleType?: string): Promise<OptimizedAuction[]> {
    const cacheKey = `available_auctions_optimized_${userRole}_${vehicleType || 'all'}`;
    
    const cached = appCache.get<OptimizedAuction[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = supabase
        .from('auctions')
        .select(`
          id,
          title,
          description,
          status,
          end_time,
          vehicle_type,
          created_by,
          winner_id,
          start_time,
          consignment_date
        `)
        .eq('status', 'active')
        .gt('end_time', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20); // Limit for performance

      // Add vehicle type filter if specified
      if (vehicleType) {
        query = query.eq('vehicle_type', vehicleType);
      }

      const { data: auctions, error } = await query;

      if (error) {
        throw error;
      }

      const optimizedAuctions = auctions || [];
      appCache.set(cacheKey, optimizedAuctions, CACHE_TTL.AUCTIONS);
      
      return optimizedAuctions;
    } catch (error) {
      console.error('Error in getAvailableAuctionsOptimized:', error);
      return [];
    }
  }

  // Batch status check for multiple auctions (reduces individual calls)
  async batchCheckAuctionStatus(auctionIds: string[]): Promise<Map<string, string>> {
    const statusMap = new Map<string, string>();
    
    if (auctionIds.length === 0) return statusMap;

    try {
      const { data: auctions } = await supabase
        .from('auctions')
        .select('id, status, end_time')
        .in('id', auctionIds);

      if (auctions) {
        auctions.forEach(auction => {
          // Simple status logic without complex function calls
          let status = auction.status;
          if (status === 'active' && new Date(auction.end_time) <= new Date()) {
            status = 'expired'; // Mark as expired, let background process handle closing
          }
          statusMap.set(auction.id, status);
        });
      }
    } catch (error) {
      console.error('Error in batchCheckAuctionStatus:', error);
    }

    return statusMap;
  }

  // Cleanup method to cancel pending background tasks
  cleanup(): void {
    this.backgroundTasks.clear();
  }
}

export const performanceService = PerformanceService.getInstance();
