# Setup Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Android Studio (for Android development)
- Xcode (for iOS development)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd airavatl-expo-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure your environment variables in `.env`:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   EXPO_PUBLIC_API_URL=your_api_url_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

### Required

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Optional

- `EXPO_PUBLIC_API_URL`: Your API base URL (defaults to production)
- `EXPO_PUBLIC_ENABLE_ANALYTICS`: Enable analytics (default: false)
- `EXPO_PUBLIC_ENABLE_CRASH_REPORTING`: Enable crash reporting (default: false)
- `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS`: Enable push notifications (default: true)

## Development Commands

- `npm run start`: Start Expo development server
- `npm run dev`: Start with development configuration
- `npm run android`: Run on Android
- `npm run ios`: Run on iOS
- `npm run web`: Run on web
- `npm run lint`: Run ESLint
- `npm run tunnel`: Start with tunnel for external device testing

## Build Commands

- `npm run build:web`: Build for web
- `npm run build:android:preview`: Build Android preview
- `npm run build:android:production`: Build Android production
- `npm run build:ios:preview`: Build iOS preview
- `npm run build:ios:production`: Build iOS production

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues**:

   ```bash
   npm run dev
   ```

2. **Module resolution issues**:

   ```bash
   npm install
   npx expo install --check
   ```

3. **iOS build issues**:
   ```bash
   cd ios && pod install && cd ..
   ```

### Getting Help

- Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review the [API Documentation](./API.md)
- Contact the development team
