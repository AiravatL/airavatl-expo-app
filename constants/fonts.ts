// Font configuration
export const FONTS = {
  // Font families
  families: {
    'jakarta-regular': 'PlusJakartaSans-Regular',
    'jakarta-medium': 'PlusJakartaSans-Medium',
    'jakarta-semibold': 'PlusJakartaSans-SemiBold',
    'jakarta-bold': 'PlusJakartaSans-Bold',
    'inter': 'Inter',
  },

  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font weights
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
} as const;
