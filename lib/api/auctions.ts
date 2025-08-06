import { supabase } from '../supabase';
import type { Auction, Bid } from '../../store/auction';

export interface CreateAuctionData {
  title: string;
  description: string;
  starting_price: number;
  end_time: string;
  vehicle_type: string;
  route_from: string;
  route_to: string;
  estimated_distance: number;
  load_type: string;
}

export interface CreateBidData {
  auction_id: string;
  amount: number;
}

export const auctionsApi = {
  // Get all auctions with optional filters
  getAll: async (filters?: {
    status?: string;
    vehicle_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Auction[]> => {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        profiles:consigner_id (
          id,
          username,
          role
        ),
        bids (
          id,
          amount,
          status,
          driver_id,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.vehicle_type && filters.vehicle_type !== 'all') {
      query = query.eq('vehicle_type', filters.vehicle_type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch auctions: ${error.message}`);
    }

    if (error) {
      console.error('Failed to fetch auctions:', error);
      return [];
    }

    // @ts-ignore - Temporary type assertion for production assessment
    return (data as any[]) || [];
  },

  // Get single auction by ID
  getById: async (id: string): Promise<Auction | null> => {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        profiles:consigner_id (
          id,
          username,
          role
        ),
        bids (
          id,
          amount,
          status,
          driver_id,
          created_at,
          profiles:driver_id (
            id,
            username
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch auction:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      starting_price: data.starting_price,
      current_bid: data.current_highest_bid,
      end_time: data.end_time,
      status: data.status,
      vehicle_type: data.vehicle_type,
      route_from: data.pickup_location || data.route_from || '',
      route_to: data.destination || data.route_to || '',
      estimated_distance: data.estimated_distance || 0,
      load_type: data.load_type || data.vehicle_type || '',
      consigner_id: data.consigner_id,
      winning_bid_id: data.winner_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  // Create new auction
  create: async (auctionData: CreateAuctionData): Promise<Auction> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('auctions')
      .insert({
        ...auctionData,
        consigner_id: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create auction:', error);
      throw new Error('Failed to create auction');
    }

    // Transform database response to match Auction interface
    return {
      id: data.id,
      title: data.title || '',
      description: data.description || '',
      starting_price: data.starting_price || 0,
      current_bid: data.current_highest_bid || 0,
      end_time: data.end_time || '',
      status: data.status || 'active',
      vehicle_type: data.vehicle_type || '',
      route_from: data.pickup_location || '',
      route_to: data.destination || '',
      estimated_distance: data.estimated_distance || 0,
      load_type: data.load_type || '',
      consigner_id: data.consigner_id || '',
      winning_bid_id: data.winner_id,
      created_at: data.created_at || '',
      updated_at: data.updated_at || ''
    } as Auction;
  },

  // Update auction
  update: async (id: string, updates: Partial<Auction>): Promise<Auction> => {
    const { data, error } = await supabase
      .from('auctions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update auction:', error);
      throw new Error('Failed to update auction');
    }

    return data as Auction;
  },

  // Delete auction
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('auctions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete auction: ${error.message}`);
    }
  },

  // Get auctions by consigner
  getByConsigner: async (consignerId: string): Promise<Auction[]> => {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        bids (
          id,
          amount,
          status,
          driver_id,
          created_at
        )
      `)
      .eq('consigner_id', consignerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch consigner auctions: ${error.message}`);
    }

    return data || [];
  },
};

export const bidsApi = {
  // Create new bid
  create: async (bidData: CreateBidData): Promise<Bid> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('bids')
      .insert({
        ...bidData,
        driver_id: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create bid: ${error.message}`);
    }

    return data;
  },

  // Get bids by driver
  getByDriver: async (driverId: string): Promise<Bid[]> => {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        auctions (
          id,
          title,
          status,
          end_time
        )
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch driver bids: ${error.message}`);
    }

    return data || [];
  },

  // Update bid
  update: async (id: string, updates: Partial<Bid>): Promise<Bid> => {
    const { data, error } = await supabase
      .from('bids')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update bid: ${error.message}`);
    }

    return data;
  },

  // Withdraw bid
  withdraw: async (id: string): Promise<Bid> => {
    return bidsApi.update(id, { status: 'withdrawn' });
  },
};
