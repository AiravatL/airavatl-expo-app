import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/storage/storage';
import { useAuthStore } from '@/store/auth';

/**
 * Enhanced useAuth hook that integrates with Zustand store
 * This provides a centralized authentication state management
 */
export function useAuthWithStore() {
  const {
    session,
    isLoading,
    isInitialized,
    setSession,
    setLoading,
    setInitialized,
    logout,
  } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        setLoading(true);

        // Try to get session from storage first
        try {
          const storedSession = await authStorage.getSession();
          if (storedSession && mounted) {
            setSession(storedSession);
          }
        } catch {
          // Silently handle storage errors
        }

        // Get current session from Supabase
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (mounted) {
          if (currentSession) {
            await authStorage.saveSession(currentSession);
            setSession(currentSession);
          } else {
            setSession(null);
          }
        }
      } catch {
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    // Initialize auth state
    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      try {
        if (event === 'SIGNED_OUT') {
          await authStorage.clearAll();
          setSession(null);
          setLoading(false);
          setInitialized(true);
        } else if (event === 'SIGNED_IN' && currentSession?.user?.id) {
          await authStorage.saveSession(currentSession);
          setSession(currentSession);
          setLoading(false);
          setInitialized(true);
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          await authStorage.saveSession(currentSession);
          setSession(currentSession);
          setLoading(false);
          setInitialized(true);
        }
      } catch {
        // Silently handle auth state change errors
      }
    });

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setLoading, setInitialized]);

  return {
    session,
    user: session?.user || null,
    isLoading,
    isInitialized,
    isAuthenticated: !!session?.user,
    logout,
  };
}

// Re-export the original hook for backward compatibility
// export { useAuth } from './useAuth.original';
