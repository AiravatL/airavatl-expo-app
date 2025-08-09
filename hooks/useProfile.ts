import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

import { useAuth } from './useAuth';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Hook for fetching and managing user profile data
 */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [data, setData] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      setData(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updateProfile = useCallback(
    async (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => {
      if (!userId) throw new Error('No user ID available');

      try {
        setError(null);

        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();

        if (updateError) throw updateError;
        setData(updatedProfile);
        return updatedProfile;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Update failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchProfile,
    updateProfile,
  };
}
