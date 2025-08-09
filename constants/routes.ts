// Route names and navigation paths
export const ROUTES = {
  // Authentication routes
  AUTH: {
    SIGN_IN: '/(auth)/sign-in',
    SIGN_UP: '/(auth)/sign-up',
  },

  // Driver routes
  DRIVER: {
    HOME: '/(driver)/(tabs)/home',
    JOBS: '/(driver)/(tabs)/jobs',
    HISTORY: '/(driver)/(tabs)/history',
    PROFILE: '/(driver)/(tabs)/profile',
  },

  // Consigner routes
  CONSIGNER: {
    HOME: '/(consigner)/(tabs)/home',
    AUCTIONS: '/(consigner)/(tabs)/auctions',
    CREATE: '/(consigner)/(tabs)/create',
    HISTORY: '/(consigner)/(tabs)/history',
    PROFILE: '/(consigner)/(tabs)/profile',
  },

  // Legacy tab routes (deprecated - use role-specific routes instead)
  TABS: {
    HOME: '/(tabs)/',
    AUCTIONS: '/(tabs)/auctions',
    CREATE_AUCTION: '/(tabs)/create-auction',
    PROFILE: '/(tabs)/profile',
  },

  // Auction related routes (role-specific)
  AUCTION: {
    // For consigners
    CONSIGNER_LIST: '/(consigner)/(tabs)/auctions',
    CONSIGNER_DETAIL: '/(consigner)/(tabs)/auctions/[id]',
    CONSIGNER_CREATE: '/(consigner)/(tabs)/create',
    CONSIGNER_EDIT: '/(consigner)/(tabs)/auctions/[id]/edit-auction',
    
    // For drivers
    DRIVER_LIST: '/(driver)/(tabs)/jobs',
    
    // Legacy routes (deprecated)
    LIST: '/(tabs)/auctions',
    DETAIL: '/(tabs)/auctions/[id]',
    CREATE: '/(tabs)/auctions/create',
    PAYMENT_INFO: '/(tabs)/auctions/payment-info',
  },

  // Info pages (legacy - consider moving to role-specific sections)
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

// Utility to get role-specific routes
export const getRoleRoutes = (role: 'driver' | 'consigner') => {
  if (role === 'driver') {
    return ROUTES.DRIVER;
  } else if (role === 'consigner') {
    return ROUTES.CONSIGNER;
  }
  throw new Error(`Invalid role: ${role}`);
};
