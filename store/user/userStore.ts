import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    auctionUpdates: boolean;
    bidAlerts: boolean;
    paymentReminders: boolean;
  };
  language: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  location: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
  };
}

interface UserState {
  user: User | null;
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultPreferences: UserPreferences = {
  notifications: {
    push: true,
    email: true,
    sms: false,
    auctionUpdates: true,
    bidAlerts: true,
    paymentReminders: true,
  },
  language: 'en',
  currency: 'INR',
  theme: 'system',
  location: {},
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      preferences: defaultPreferences,
      isLoading: false,
      error: null,

      setUser: (user) => {
        set({
          user: {
            ...user,
            preferences: { ...defaultPreferences, ...user.preferences }
          },
          error: null
        });
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
            error: null
          });
        }
      },

      updatePreferences: (newPreferences) => {
        const currentUser = get().user;
        const currentPreferences = get().preferences;

        const updatedPreferences = {
          ...currentPreferences,
          ...newPreferences,
          notifications: {
            ...currentPreferences.notifications,
            ...(newPreferences.notifications || {}),
          },
          location: {
            ...currentPreferences.location,
            ...(newPreferences.location || {}),
          },
        };

        set({ preferences: updatedPreferences });

        if (currentUser) {
          set({
            user: {
              ...currentUser,
              preferences: updatedPreferences,
            },
          });
        }
      },

      clearUser: () => {
        set({
          user: null,
          preferences: defaultPreferences,
          error: null
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
      }),
    }
  )
);
