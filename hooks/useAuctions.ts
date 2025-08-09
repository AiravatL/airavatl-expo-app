import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

import { useAuth } from './useAuth';

// Type aliases from Supabase types
export type Auction = Database['public']['Tables']['auctions']['Row'];
export type Bid = Database['public']['Tables']['auction_bids']['Row'];

/**
 * Hook for fetching available auctions for drivers
 */
export function useAvailableAuctions() {
  const [data, setData] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: auctions, error: fetchError } = await supabase
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(auctions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  return { data, isLoading, error, refetch: fetchAuctions };
}

/**
 * Hook for fetching consigner's own auctions
 */
export function useConsignerAuctions() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [data, setData] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: auctions, error: fetchError } = await supabase
        .from('auctions')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(auctions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  return { data, isLoading, error, refetch: fetchAuctions };
}

/**
 * Hook for fetching a single auction with its bids
 */
export function useAuction(auctionId: string) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuction = useCallback(async () => {
    if (!auctionId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch auction details
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (auctionError) throw auctionError;

      // Fetch bids for this auction
      const { data: bidsData, error: bidsError } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('amount', { ascending: false });

      if (bidsError) throw bidsError;

      setAuction(auctionData);
      setBids(bidsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  return { auction, bids, isLoading, error, refetch: fetchAuction };
}

/**
 * Hook for fetching driver's bids
 */
export function useDriverBids() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [data, setData] = useState<(Bid & { auction: Auction })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBids = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: bids, error: fetchError } = await supabase
        .from('auction_bids')
        .select('*, auction:auctions(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(bids as (Bid & { auction: Auction })[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  return { data, isLoading, error, refetch: fetchBids };
}
