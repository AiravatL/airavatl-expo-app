import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'auction' | 'bid' | 'payment' | 'system' | 'general';
  data?: Record<string, any>;
  isRead: boolean;
  isPush: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  types: {
    auction: boolean;
    bid: boolean;
    payment: boolean;
    system: boolean;
    general: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  };
}

interface NotificationState {
  notifications: Notification[];
  settings: NotificationSettings;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  setNotifications: (notifications: Notification[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getUnreadCount: () => number;
  getNotificationsByType: (type: Notification['type']) => Notification[];
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  badge: true,
  types: {
    auction: true,
    bid: true,
    payment: true,
    system: true,
    general: true,
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      settings: defaultSettings,
      unreadCount: 0,
      isLoading: false,
      error: null,
      lastFetch: null,

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };

        const notifications = [notification, ...get().notifications];
        const unreadCount = notifications.filter(n => !n.isRead).length;

        set({
          notifications,
          unreadCount,
          error: null
        });
      },

      markAsRead: (id) => {
        const notifications = get().notifications.map(notification =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        );
        const unreadCount = notifications.filter(n => !n.isRead).length;

        set({ notifications, unreadCount });
      },

      markAllAsRead: () => {
        const notifications = get().notifications.map(notification => ({
          ...notification,
          isRead: true,
        }));

        set({ notifications, unreadCount: 0 });
      },

      removeNotification: (id) => {
        const notifications = get().notifications.filter(n => n.id !== id);
        const unreadCount = notifications.filter(n => !n.isRead).length;

        set({ notifications, unreadCount });
      },

      clearNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
          error: null
        });
      },

      updateSettings: (newSettings) => {
        const settings = { ...get().settings, ...newSettings };

        if (newSettings.types) {
          settings.types = { ...get().settings.types, ...newSettings.types };
        }

        if (newSettings.quietHours) {
          settings.quietHours = { ...get().settings.quietHours, ...newSettings.quietHours };
        }

        set({ settings });
      },

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        set({
          notifications,
          unreadCount,
          lastFetch: new Date().toISOString(),
          error: null
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.isRead).length;
      },

      getNotificationsByType: (type) => {
        return get().notifications.filter(n => n.type === type);
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        settings: state.settings,
        unreadCount: state.unreadCount,
      }),
    }
  )
);
