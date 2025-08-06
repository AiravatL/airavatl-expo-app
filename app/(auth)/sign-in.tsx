import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async () => {
    console.log('🔄 Starting sign in process...');
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📧 Attempting sign in with email:', email);

      // Check if Supabase is properly configured
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('your-project-ref') || supabaseUrl === 'your_supabase_url_here') {
        setError('Supabase is not properly configured. Please check your environment variables.');
        return;
      }

      const {
        data: { user, session },
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('📧 Sign in response:', {
        user: user?.id || 'None',
        session: session?.access_token ? 'Present' : 'None',
        error: signInError?.message || 'None',
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        if (signInError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please check your credentials.');
        } else if (signInError.message.includes('Failed to fetch') || signInError.message.includes('fetch')) {
          setError('Unable to connect to the server. Please check your internet connection and try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError(
            'Please check your email and confirm your account before signing in.'
          );
        } else {
          setError(`Sign in failed: ${signInError.message}`);
        }
        return;
      }

      if (user && session) {
        console.log('✅ Sign in successful, user ID:', user.id);

        // Save session to storage
        await authStorage.saveSession(session);

        // Get user profile
        console.log('👤 Fetching user profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        console.log('👤 Profile response:', {
          profile: profile?.role || 'None',
          error: profileError?.message || 'None',
        });

        if (profileError) {
          console.error('❌ Error fetching profile:', profileError);
          setError('Error fetching user profile. Please try again.');
          return;
        }

        if (!profile) {
          setError('User profile not found. Please contact support.');
          await supabase.auth.signOut();
          await authStorage.clearAll();
          return;
        }

        // Save user profile to storage
        await authStorage.saveUserProfile(profile);

        if (profile.role === 'driver' || profile.role === 'consigner') {
          console.log('✅ Valid role found:', profile.role);
          // Navigation will be handled by the auth state change listener
          console.log(
            '🧭 Sign in successful, navigation will be handled automatically'
          );
        } else {
          setError('Invalid user role. Please contact support.');
          await supabase.auth.signOut();
          await authStorage.clearAll();
          return;
        }
      } else {
        console.error('❌ No user or session returned');
        setError('Sign in failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1635872666354-a8c2b5e17c2a?w=800&auto=format&fit=crop&q=60',
            }}
            style={styles.headerImage}
          />
          <View style={styles.headerOverlay}>
            <Text style={styles.headerTitle}>Welcome Back</Text>
            <Text style={styles.headerSubtitle}>
              Sign in to continue using AiravatL
            </Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Feather
              name="mail"
              size={20}
              color="#6C757D"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#6C757D"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather
              name="lock"
              size={20}
              color="#6C757D"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              secureTextEntry
              placeholderTextColor="#6C757D"
              autoComplete="password"
              textContentType="password"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.signInButton,
              isLoading && styles.signInButtonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.signInButtonText}>Sign In</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  formContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
    marginLeft: 4,
  },
});
