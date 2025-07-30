// lib/supabase.ts
import 'whatwg-fetch';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';  // ⬅️ storage adapter
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Get Supabase configuration from environment variables (works for web & native)
const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

// Create a single Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,      // ⬅️ NEW: persist tokens on device
    persistSession: true,       // keep session between app launches
    autoRefreshToken: true,     // refresh when tokens expire
    detectSessionInUrl: false,  // not needed in RN
    debug: __DEV__,             // helpful logs in dev
  },
});
