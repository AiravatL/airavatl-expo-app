import { Dimensions } from 'react-native';

// Get device dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Screen dimensions
export const DIMENSIONS = {
  screen: {
    width: screenWidth,
    height: screenHeight,
  },

  // Breakpoints for responsive design
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  // Common spacing values
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // Border radius values
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  // Header heights
  header: {
    default: 56,
    large: 96,
  },

  // Tab bar height
  tabBar: {
    height: 60,
  },

  // Common component sizes
  button: {
    small: {
      height: 32,
      paddingHorizontal: 12,
    },
    medium: {
      height: 40,
      paddingHorizontal: 16,
    },
    large: {
      height: 48,
      paddingHorizontal: 24,
    },
  },

  input: {
    height: 48,
    paddingHorizontal: 16,
  },
} as const;

// Helper functions
export const isSmallScreen = screenWidth < 375;
export const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
export const isLargeScreen = screenWidth >= 414;
