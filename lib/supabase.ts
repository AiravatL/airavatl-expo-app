// lib/supabase.ts
import 'whatwg-fetch';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Get Supabase configuration from environment variables with fallbacks
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment check:');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

// Additional validation to ensure we have valid URLs
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL detected:', supabaseUrl);
  throw new Error('Supabase URL is not a valid URL format. Please check your environment configuration.');
}

// Check for placeholder values
if (supabaseUrl.includes('$') || supabaseUrl === 'your_supabase_url_here' || supabaseUrl.includes('placeholder')) {
  console.error('Invalid Supabase URL detected:', supabaseUrl);
  console.warn('⚠️ Using placeholder Supabase URL. Please update with your actual Supabase project URL.');
}

if (supabaseAnonKey.includes('$') || supabaseAnonKey === 'your_supabase_anon_key_here' || supabaseAnonKey.includes('placeholder')) {
  console.warn('⚠️ Using placeholder Supabase Anon Key. Please update with your actual Supabase project key.');
}

// Create a single Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,      // persist tokens on device
    persistSession: true,       // keep session between app launches
    autoRefreshToken: true,     // refresh when tokens expire
    detectSessionInUrl: false,  // not needed in RN
    debug: __DEV__,             // helpful logs in dev
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
