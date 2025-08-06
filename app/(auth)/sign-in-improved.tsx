import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/storage/storage';
import { Button, Input, Card } from '@/components/ui';
import { validateEmail } from '@/lib/utils';

export default function SignInScreenImproved() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      console.log('📧 Attempting sign in with email:', email);

      const {
        data: { user, session },
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError);

        if (signInError.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Invalid email or password. Please try again.' });
        } else if (signInError.message.includes('Email not confirmed')) {
          setErrors({ general: 'Please check your email and confirm your account before signing in.' });
        } else {
          setErrors({ general: signInError.message });
        }
        return;
      }

      if (!user || !session) {
        setErrors({ general: 'Sign in failed. Please try again.' });
        return;
      }

      console.log('✅ Sign in successful for user:', user.id);

      // Store session
      try {
        await authStorage.saveSession(session);
        console.log('💾 Session saved successfully');
      } catch (storageError) {
        console.warn('⚠️ Failed to save session to storage:', storageError);
        // Continue anyway, as the user is authenticated
      }

      // Get user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('⚠️ Failed to fetch user profile:', profileError);
      }

      console.log('👤 User profile:', profile);

      // Navigate to appropriate screen
      router.replace('/(tabs)/' as any);
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/Airavatl_Airvatl 512X512.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <Card style={styles.formCard} variant="elevated" padding="large">
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon="mail"
              error={errors.email}
              editable={!isLoading}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock"
              error={errors.password}
              editable={!isLoading}
            />

            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={isLoading}
              disabled={isLoading}
              variant="primary"
              size="large"
              fullWidth
              style={styles.signInButton}
            />

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>
                Don&apos;t have an account?{' '}
                <Link href="/(auth)/sign-up" asChild>
                  <Text style={styles.link}>Sign up</Text>
                </Link>
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    textAlign: 'center',
  },
  formCard: {
    marginHorizontal: 0,
  },
  form: {
    gap: 0, // Inputs have their own margin
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  signInButton: {
    marginTop: 10,
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  link: {
    color: '#007AFF',
    fontFamily: 'Inter_600SemiBold',
  },
});
