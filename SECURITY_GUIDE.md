# 🔒 Security Guide - Environment Variables & Credentials

## ⚠️ **CRITICAL SECURITY ALERT**

GitGuardian has detected exposed credentials in this repository. This guide shows how to fix these issues and prevent future exposures.

## 🚨 **Immediate Actions Taken**

1. ✅ **Removed JWT tokens from `.env.local`**
2. ✅ **Removed hardcoded credentials from `package.json`**
3. ✅ **Sanitized `.env` file placeholders**

## 🔧 **Proper Environment Variable Setup**

### For Local Development

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your actual credentials to `.env.local`:**
   ```bash
   # Replace with actual values
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

3. **Never commit `.env.local` to version control** (already in `.gitignore`)

### For Production Builds (EAS)

Use EAS environment variables instead of hardcoding:

```bash
# Set environment variables securely
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_actual_anon_key"

# List current environment variables
eas env:list

# Delete exposed variables if needed
eas env:delete --scope project --name VARIABLE_NAME
```

## 📋 **Security Checklist**

### ✅ **What We Fixed**
- [x] Removed exposed JWT tokens from repository
- [x] Sanitized all credential files
- [x] Updated package.json to remove hardcoded secrets
- [x] Created security guide

### ⚠️ **Additional Actions Needed**

1. **Rotate Exposed Credentials:**
   - [ ] Generate new Supabase anon key
   - [ ] Update EAS environment variables
   - [ ] Revoke old access tokens

2. **Update Your Local Environment:**
   ```bash
   # Create new .env.local with actual credentials
   cp .env.example .env.local
   # Edit .env.local with your real credentials
   ```

3. **Rebuild Your APK:**
   ```bash
   # Build with new environment variables
   eas build --platform android --profile preview
   ```

## 🛡️ **Security Best Practices**

### Never Commit These Files:
- `.env.local`
- `.env.production`
- Any file with actual credentials

### Always Use Placeholders in Repository:
- `.env.example` ✅
- `.env` (with placeholders) ✅

### For Sensitive Operations:
```bash
# Use EAS secrets for builds
eas env:create --scope project --name SECRET_NAME --value "secret_value"

# Use local environment for development
echo "EXPO_PUBLIC_SUPABASE_URL=your_url" >> .env.local
```

## 🔄 **Next Steps**

1. **Immediate:** Rotate all exposed credentials in Supabase dashboard
2. **Update:** Set up proper EAS environment variables
3. **Rebuild:** Create new APK with secure credential handling
4. **Monitor:** Set up alerts for any future credential exposures

## 📞 **Emergency Response**

If credentials are exposed again:
1. **Immediately revoke** exposed keys in Supabase
2. **Generate new keys** in Supabase dashboard
3. **Update EAS environment variables** with new keys
4. **Rebuild and redeploy** your application

---

**Remember:** Security is an ongoing process. Regular audits and proper credential management are essential for protecting your application and users.
