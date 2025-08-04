#!/bin/bash

# 🚀 AiravatL Push Notification Setup Script
# This script helps set up push notifications for production builds

echo "🔥 AiravatL Push Notification Setup"
echo "====================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Installing..."
    npm install -g @expo/eas-cli
fi

echo "📋 Push Notification Setup Checklist:"
echo ""

# Step 1: Check project info
echo "1️⃣ Getting project information..."
eas project:info

echo ""
echo "2️⃣ Required Environment Variables:"
echo "   - EXPO_PUBLIC_SUPABASE_URL"
echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY" 
echo "   - EAS_PROJECT_ID"
echo ""

# Check if env vars are set
echo "🔍 Checking current environment variables..."
eas env:list

echo ""
echo "3️⃣ Firebase Setup Required:"
echo "   📁 Create Firebase project"
echo "   📱 Add Android app with package: com.airavatl.app"
echo "   📄 Download google-services.json (keep secure!)"
echo "   🔑 Upload FCM credentials to EAS"
echo ""

echo "4️⃣ Upload FCM Credentials (choose one):"
echo "   Option A: eas push:android:upload --api-key [YOUR_FCM_SERVER_KEY]"
echo "   Option B: eas push:android:upload --service-account [PATH_TO_GOOGLE_SERVICES_JSON]"
echo ""

echo "5️⃣ Set Environment Variables:"
echo "   eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value \"https://your-project.supabase.co\""
echo "   eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value \"your_anon_key\""
echo "   eas env:create --scope project --name EAS_PROJECT_ID --value \"your-eas-project-id\""
echo ""

echo "6️⃣ Build and Test:"
echo "   eas build --platform android --profile preview"
echo ""

echo "📚 For detailed instructions, see:"
echo "   📄 FIREBASE_SETUP.md"
echo "   🔒 SECURITY_GUIDE.md"
echo ""

echo "✅ Setup script completed!"
echo "🔥 Follow the steps above to complete push notification setup."
