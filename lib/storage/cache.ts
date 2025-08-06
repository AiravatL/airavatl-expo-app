// Simple in-memory cache with TTL
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache size for debugging
  size(): number {
    return this.cache.size;
  }
}

export const appCache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `profile_${userId}`,
  USER_AUCTIONS: (userId: string) => `auctions_${userId}`,
  USER_BIDS: (userId: string) => `bids_${userId}`,
  AVAILABLE_AUCTIONS: (vehicleType?: string) => `available_auctions_${vehicleType || 'all'}`,
  AUCTION_DETAILS: (auctionId: string) => `auction_${auctionId}`,
  AUCTION_BIDS: (auctionId: string) => `auction_bids_${auctionId}`,
} as const;

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  PROFILE: 10 * 60 * 1000, // 10 minutes
  AUCTIONS: 2 * 60 * 1000, // 2 minutes
  BIDS: 30 * 1000, // 30 seconds
  AUCTION_DETAILS: 1 * 60 * 1000, // 1 minute
} as const;
