/**
 * Environment configuration
 * This file manages environment variables and provides defaults
 */

import Constants from 'expo-constants';

// Get environment variables with fallbacks
const getEnvVar = (name: string, fallback?: string): string => {
  const value = Constants.expoConfig?.extra?.[name] || process.env[name] || fallback;
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value;
};

// Environment configuration
export const ENV = {
  // App Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Supabase Configuration
  SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),

  // API Configuration
  API_URL: getEnvVar('EXPO_PUBLIC_API_URL', 'https://api.airavatl.com'),

  // App Configuration
  APP_NAME: 'AiravatL',
  APP_VERSION: Constants.expoConfig?.version || '1.0.0',

  // Feature Flags
  ENABLE_ANALYTICS: getEnvVar('EXPO_PUBLIC_ENABLE_ANALYTICS', 'false') === 'true',
  ENABLE_CRASH_REPORTING: getEnvVar('EXPO_PUBLIC_ENABLE_CRASH_REPORTING', 'false') === 'true',
  ENABLE_PUSH_NOTIFICATIONS: getEnvVar('EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS', 'true') === 'true',
} as const;

// Validate required environment variables
export function validateEnvironment(): void {
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredVars.filter(varName => {
    try {
      getEnvVar(varName);
      return false;
    } catch {
      return true;
    }
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}
