import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { authStorage } from '@/lib/storage';

type UserRole = 'consigner' | 'driver';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const VEHICLE_TYPES = [
  { id: 'all', label: 'All Vehicles', description: 'Can handle any vehicle type' },
  { id: 'truck', label: 'Truck' },
  { id: 'lcv', label: 'LCV (Light Commercial Vehicle)' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'mini_truck', label: 'Mini Truck' },
  { id: 'tempo', label: 'Tempo' },
  { id: 'three_wheeler', label: '3 Wheeler' },
];

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 6;
  const validatePhoneNumber = (phone: string) => /^[0-9]{10}$/.test(phone);
  const validateVehicleNumber = (vehicleNum: string) => {
    // Basic validation - just check if it's not empty
    return vehicleNum.trim().length > 0;
  };

  const showExistingAccountAlert = () => {
    if (Platform.OS === 'web') {
      setError('An account with this email already exists. Please sign in instead.');
    } else {
      Alert.alert(
        'Account Exists',
        'An account with this email already exists. Would you like to sign in instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/sign-in') }
        ]
      );
    }
  };

  const handleSignUp = async () => {
    setError(null);

    if (!email || !password || !confirmPassword || !role) {
      setError('Please fill in all fields and select a role');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Additional validation for drivers
    if (role === 'driver') {
      if (!phoneNumber || !vehicleType || !vehicleNumber) {
        setError('Phone number, vehicle type, and vehicle number are required for drivers');
        return;
      }

      if (!validatePhoneNumber(phoneNumber)) {
        setError('Please enter a valid 10-digit phone number');
        return;
      }

      if (!validateVehicleNumber(vehicleNumber)) {
        setError('Please enter a valid vehicle number');
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password 
      });

      if (signUpError) {
        if (signUpError.message === "User already registered") {
          showExistingAccountAlert();
          return;
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (user && session) {
        // Save session to storage
        await authStorage.saveSession(session);

        // Create profile with additional fields for drivers
        const profileData: any = {
          id: user.id,
          username: email.split('@')[0],
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Add driver-specific fields
        if (role === 'driver') {
          profileData.phone_number = phoneNumber;
          // Store vehicle info in bio field for now (could be separate table in production)
          profileData.bio = `Vehicle Type: ${VEHICLE_TYPES.find(v => v.id === vehicleType)?.label}\nVehicle Number: ${vehicleNumber}`;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          await supabase.auth.signOut();
          await authStorage.clearAll();
          setError('Failed to create user profile. Please try again.');
          return;
        }

        // Save user profile to storage
        await authStorage.saveUserProfile(profileData);

        Alert.alert(
          'Success',
          'Account created successfully!',
          [{ text: 'OK', onPress: () => {
            // Navigation will be handled by the auth state change listener
            console.log('Sign up successful, navigation will be handled automatically');
          }}]
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Failed to create account. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join AiravatL and start your logistics journey</Text>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#6C757D" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#6C757D"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#6C757D" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#6C757D"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="check-circle" size={20} color="#6C757D" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#6C757D"
            />
          </View>

          <Text style={styles.roleLabel}>Select your role:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'consigner' && styles.roleOptionSelected
              ]}
              onPress={() => setRole('consigner')}>
              <Feather
                name="package"
                size={24}
                color={role === 'consigner' ? '#FFFFFF' : '#6C757D'}
              />
              <View style={styles.roleContent}>
                <Text
                  style={[
                    styles.roleTitle,
                    role === 'consigner' && styles.roleTitleSelected
                  ]}>
                  Consigner
                </Text>
                <Text
                  style={[
                    styles.roleDescription,
                    role === 'consigner' && styles.roleDescriptionSelected
                  ]}>
                  I want to ship goods
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'driver' && styles.roleOptionSelected
              ]}
              onPress={() => setRole('driver')}>
              <Feather
                name="truck"
                size={24}
                color={role === 'driver' ? '#FFFFFF' : '#6C757D'}
              />
              <View style={styles.roleContent}>
                <Text
                  style={[
                    styles.roleTitle,
                    role === 'driver' && styles.roleTitleSelected
                  ]}>
                  Driver
                </Text>
                <Text
                  style={[
                    styles.roleDescription,
                    role === 'driver' && styles.roleDescriptionSelected
                  ]}>
                  I want to transport goods
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Driver-specific fields */}
          {role === 'driver' && (
            <>
              <View style={styles.driverFieldsContainer}>
                <Text style={styles.driverFieldsTitle}>Driver Information</Text>
                
                <View style={styles.inputContainer}>
                  <Feather name="phone" size={20} color="#6C757D" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number (10 digits)"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="numeric"
                    maxLength={10}
                    placeholderTextColor="#6C757D"
                  />
                </View>

                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={[styles.inputContainer, styles.dropdownButton]}
                    onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}>
                    <Feather name="truck" size={20} color="#6C757D" style={styles.inputIcon} />
                    <Text style={[styles.dropdownText, !vehicleType && styles.placeholderText]}>
                      {vehicleType ? VEHICLE_TYPES.find(v => v.id === vehicleType)?.label : 'Select Vehicle Type'}
                    </Text>
                    <Feather 
                      name={showVehicleDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#6C757D" 
                    />
                  </TouchableOpacity>
                  
                  {showVehicleDropdown && (
                    <View style={styles.dropdownList}>
                      {VEHICLE_TYPES.map((vehicle) => (
                        <TouchableOpacity
                          key={vehicle.id}
                          style={[
                            styles.dropdownItem,
                            vehicle.id === 'all' && styles.allVehicleItem
                          ]}
                          onPress={() => {
                            setVehicleType(vehicle.id);
                            setShowVehicleDropdown(false);
                          }}>
                          <View style={styles.dropdownItemContent}>
                            <Text style={[
                              styles.dropdownItemText,
                              vehicle.id === 'all' && styles.allVehicleText
                            ]}>
                              {vehicle.label}
                            </Text>
                            {vehicle.description && (
                              <Text style={styles.dropdownItemDescription}>
                                {vehicle.description}
                              </Text>
                            )}
                          </View>
                          {vehicle.id === 'all' && (
                            <Feather name="star" size={16} color="#007AFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Feather name="hash" size={20} color="#6C757D" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Vehicle Number"
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    autoCapitalize="characters"
                    placeholderTextColor="#6C757D"
                  />
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.signUpButtonText}>Create Account</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    minHeight: SCREEN_HEIGHT,
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: '#007AFF',
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
    flex: 1,
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
  roleLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
    marginTop: 8,
  },
  roleContainer: {
    gap: 12,
    marginBottom: 24,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  roleOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleContent: {
    marginLeft: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: '#FFFFFF',
  },
  roleDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  roleDescriptionSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  driverFieldsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  driverFieldsTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    paddingVertical: 14,
  },
  placeholderText: {
    color: '#6C757D',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    zIndex: 1000,
    maxHeight: 300,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  allVehicleItem: {
    backgroundColor: '#F0F8FF',
    borderBottomColor: '#007AFF',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  allVehicleText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
  },
  dropdownItemDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginTop: 2,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
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
  signInLink: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
    marginLeft: 4,
  },
});