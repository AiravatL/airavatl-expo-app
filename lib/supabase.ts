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

// Additional validation to ensure we don't have placeholder values
if (supabaseUrl.includes('$') || supabaseUrl === 'your_supabase_url_here') {
  console.error('Invalid Supabase URL detected:', supabaseUrl);
  throw new Error('Supabase URL contains placeholder values. Please check your environment configuration.');
}

if (supabaseAnonKey.includes('$') || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error('Invalid Supabase Anon Key detected');
  throw new Error('Supabase Anon Key contains placeholder values. Please check your environment configuration.');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

// Create a single Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,      // persist tokens on device
    persistSession: true,       // keep session between app launches
    autoRefreshToken: true,     // refresh when tokens expire
    detectSessionInUrl: false,  // not needed in RN
    debug: __DEV__,             // helpful logs in dev
  },
});
