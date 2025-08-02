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
        console.log('🔄 Initializing auth...');
        
        // First, check current session from Supabase
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        console.log('📱 Current session from Supabase:', currentSession?.user?.id || 'None');
        
        if (currentSession && !error) {
          if (mounted) {
            console.log('✅ Valid session found, setting session');
            setSession(currentSession);
            await authStorage.saveSession(currentSession);
          }
        } else {
          // Try to get stored session as fallback
          const storedSession = await authStorage.getSession();
          console.log('💾 Stored session:', storedSession?.user?.id || 'None');
          
          if (storedSession && await authStorage.isSessionValid(storedSession)) {
            console.log('✅ Valid stored session found');
            if (mounted) {
              setSession(storedSession);
            }
          } else {
            console.log('❌ No valid session found, clearing storage');
            await authStorage.clearAll();
            if (mounted) {
              setSession(null);
            }
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        await authStorage.clearAll();
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete');
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

      console.log('🔄 Auth state change:', event, currentSession?.user?.id || 'None');

      try {
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          await authStorage.clearAll();
          setSession(null);
          setIsLoading(false);
          setIsInitialized(true);
        } else if (event === 'SIGNED_IN' && currentSession?.user?.id) {
          console.log('👋 User signed in:', currentSession.user.id);
          await authStorage.saveSession(currentSession);
          console.log('✅ Setting session and completing initialization');
          setSession(currentSession);
          setIsLoading(false);
          setIsInitialized(true);
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          console.log('🔄 Token refreshed');
          await authStorage.saveSession(currentSession);
          setSession(currentSession);
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ Error handling auth state change:', error);
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