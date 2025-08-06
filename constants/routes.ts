// Route names and navigation paths
export const ROUTES = {
  // Authentication routes
  AUTH: {
    SIGN_IN: '/(auth)/sign-in',
    SIGN_UP: '/(auth)/sign-up',
  },

  // Main tab routes
  TABS: {
    HOME: '/(tabs)/',
    AUCTIONS: '/(tabs)/auctions',
    CREATE_AUCTION: '/(tabs)/create-auction',
    PROFILE: '/(tabs)/profile',
  },

  // Auction related routes
  AUCTION: {
    LIST: '/(tabs)/auctions',
    DETAIL: '/(tabs)/auctions/[id]',
    CREATE: '/(tabs)/auctions/create',
    PAYMENT_INFO: '/(tabs)/auctions/payment-info',
  },

  // Info pages
  INFO: {
    ABOUT: '/(tabs)/info/about',
    CONTACT: '/(tabs)/info/contact',
    PRIVACY: '/(tabs)/info/privacy',
  },

  // Other routes
  NOT_FOUND: '/+not-found',
} as const;

// Route parameters
export const ROUTE_PARAMS = {
  AUCTION_ID: 'id',
  USER_ID: 'userId',
} as const;
