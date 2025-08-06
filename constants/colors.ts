// Color palette for the application
export const COLORS = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Secondary colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Status colors
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    700: '#15803d',
  },

  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    700: '#a16207',
  },

  error: {
    50: '#fef2f2',
    500: '#ef4444',
    700: '#b91c1c',
  },

  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Text colors
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    disabled: '#94a3b8',
    inverse: '#ffffff',
  },

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
  },

  // Border colors
  border: {
    light: '#e2e8f0',
    medium: '#cbd5e1',
    dark: '#94a3b8',
  },
} as const;
