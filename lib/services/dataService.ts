import { supabase } from '@/lib/supabase';

export const dataService = {
  async checkExpiredAuctions() {
    try {
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'expired' })
        .lt('end_time', new Date().toISOString())
        .eq('status', 'active');

      if (error) {
        console.error('Error checking expired auctions:', error);
      }
    } catch (err) {
      console.error('Error in checkExpiredAuctions:', err);
    }
  },

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in getUserProfile:', err);
      return null;
    }
  },

  async getAvailableAuctions(vehicleTypeFilter?: string) {
    try {
      let query = supabase
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .gt('end_time', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (vehicleTypeFilter) {
        query = query.eq('vehicle_type', vehicleTypeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting available auctions:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getAvailableAuctions:', err);
      return [];
    }
  },

  async getUserAuctions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting user auctions:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getUserAuctions:', err);
      return [];
    }
  },

  async createAuction(auctionData: any) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .insert([auctionData])
        .select()
        .single();

      if (error) {
        console.error('Error creating auction:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in createAuction:', err);
      throw err;
    }
  },

  async updateAuction(auctionId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .update(updates)
        .eq('id', auctionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating auction:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in updateAuction:', err);
      throw err;
    }
  },

  async deleteAuction(auctionId: string) {
    try {
      const { error } = await supabase
        .from('auctions')
        .delete()
        .eq('id', auctionId);

      if (error) {
        console.error('Error deleting auction:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Error in deleteAuction:', err);
      throw err;
    }
  },
};