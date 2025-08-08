// Simplified and optimized auth hook - removes duplicate storage conflicts
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Simplified useAuth hook focused on performance
 * Removes duplicate storage management that was causing conflicts
 */
export function useAuthSimplified() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Only use Supabase's built-in session management
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    }

    // Initialize auth state
    initializeAuth();

    // Set up auth state change listener with minimal overhead
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      // Only update state, don't duplicate storage operations
      setSession(currentSession);
      setIsLoading(false);
      setIsInitialized(true);
    });

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user || null,
    isLoading,
    isInitialized,
    isAuthenticated: !!session?.user,
  };
}
