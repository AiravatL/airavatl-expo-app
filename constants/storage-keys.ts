// Storage keys for AsyncStorage and SecureStore
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_SESSION: 'user_session',
  USER_CREDENTIALS: 'user_credentials',

  // User preferences
  USER_PREFERENCES: 'user_preferences',
  NOTIFICATION_SETTINGS: 'notification_settings',
  THEME_PREFERENCE: 'theme_preference',
  LANGUAGE_PREFERENCE: 'language_preference',

  // App state
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_TIME_USER: 'first_time_user',
  APP_VERSION: 'app_version',

  // Push notifications
  PUSH_TOKEN: 'push_token',
  NOTIFICATION_PERMISSIONS: 'notification_permissions',

  // Auction specific
  DRAFT_AUCTION: 'draft_auction',
  FAVORITE_AUCTIONS: 'favorite_auctions',
  RECENT_SEARCHES: 'recent_searches',
} as const;
