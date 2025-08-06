// API endpoints configuration
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
  },
  AUCTIONS: {
    LIST: '/auctions',
    CREATE: '/auctions/create',
    UPDATE: (id: string) => `/auctions/${id}`,
    DELETE: (id: string) => `/auctions/${id}`,
    BID: (id: string) => `/auctions/${id}/bid`,
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE: '/users/update',
    VEHICLES: '/users/vehicles',
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    PREFERENCES: '/notifications/preferences',
  },
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;
