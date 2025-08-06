import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  AUTH_SESSION: 'auth_session',
  USER_PROFILE: 'user_profile',
} as const;

// Web fallback for AsyncStorage
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch {
      // Silently fail
    }
  },
};

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export const authStorage = {
  async saveSession(session: any): Promise<void> {
    try {
      await storage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  },

  async getSession(): Promise<any | null> {
    try {
      const sessionData = await storage.getItem(STORAGE_KEYS.AUTH_SESSION);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  async saveUserProfile(profile: any): Promise<void> {
    try {
      await storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  },

  async getUserProfile(): Promise<any | null> {
    try {
      const profileData = await storage.getItem(STORAGE_KEYS.USER_PROFILE);
      return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await storage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      await storage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  async isSessionValid(session: any): Promise<boolean> {
    if (!session || !session.access_token || !session.expires_at) {
      return false;
    }

    // Check if session is expired (with 5 minute buffer)
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

    return expiresAt.getTime() > now.getTime() + bufferTime;
  },
};