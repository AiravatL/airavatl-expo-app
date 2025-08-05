import { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/storage';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializing = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializing.current) return;
    isInitializing.current = true;

    let mounted = true;

    async function initializeAuth() {
      try {
        
        // First, check current session from Supabase
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (currentSession && !error) {
          if (mounted) {
            setSession(currentSession);
            await authStorage.saveSession(currentSession);
          }
        } else {
          // Try to get stored session as fallback
          const storedSession = await authStorage.getSession();
          
          if (storedSession && await authStorage.isSessionValid(storedSession)) {
            if (__DEV__) {
              console.log('✅ Valid stored session found');
            }
            if (mounted) {
              setSession(storedSession);
            }
          } else {
            await authStorage.clearAll();
            if (mounted) {
              setSession(null);
            }
          }
        }
      } catch {
        // Don't crash the app due to auth errors - just clear storage and continue
        try {
          await authStorage.clearAll();
        } catch {
          // Silently handle storage errors
        }
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
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
          setIsLoading(false);
          setIsInitialized(true);
        } else if (event === 'SIGNED_IN' && currentSession?.user?.id) {
          await authStorage.saveSession(currentSession);
          setSession(currentSession);
          setIsLoading(false);
          setIsInitialized(true);
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          await authStorage.saveSession(currentSession);
          setSession(currentSession);
          setIsLoading(false);
          setIsInitialized(true);
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
  }, []);

  return {
    session,
    isLoading,
    isInitialized,
  };
}