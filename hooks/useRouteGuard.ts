import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export function useRouteGuard() {
  const { session } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!session) return;

    async function redirectToRoleBasedRoute() {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!profile) return;

        const isInAuthGroup = segments[0] === '(auth)';
        const isInRoleGroup = segments[1] === '(driver)' || segments[1] === '(consigner)';
        const currentRole = profile.role as 'driver' | 'consigner';

        // If user is in auth screens and authenticated, redirect to their role-based route
        if (isInAuthGroup && session) {
          router.replace('/(tabs)');
          return;
        }

        // If user is in tabs but not in their correct role-based route
        if (segments[0] === '(tabs)' && !isInRoleGroup) {
          const currentPath = segments.join('/');
          
          // Map generic routes to role-specific routes
          if (currentPath.includes('auctions') && !currentPath.includes('index')) {
            if (currentRole === 'driver') {
              router.replace('/(tabs)/(driver)/auctions');
            } else {
              router.replace('/(tabs)/(consigner)/auctions');
            }
          } else if (currentPath.includes('profile')) {
            if (currentRole === 'driver') {
              router.replace('/(tabs)/(driver)/profile');
            } else {
              router.replace('/(tabs)/(consigner)/profile');
            }
          }
        }

        // If user is in wrong role group, redirect to correct one
        if (isInRoleGroup) {
          const currentRoleGroup = segments[1] as 'driver' | 'consigner';
          if (currentRoleGroup !== currentRole) {
            const pathAfterRole = segments.slice(2).join('/');
            router.replace(`/(tabs)/(${currentRole})/${pathAfterRole}`);
          }
        }
      } catch (error) {
        console.error('Error in route guard:', error);
      }
    }

    redirectToRoleBasedRoute();
  }, [session, segments, router]);
}
