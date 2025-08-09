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
  Modal,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/storage';

type UserRole = 'consigner' | 'driver';

const VEHICLE_TYPES = [
  {
    id: 'three_wheeler',
    label: '3 Wheeler',
    description: 'Capacity: Up to 500 kg',
  },
  {
    id: 'pickup_truck',
    label: 'Pickup Truck',
    description: 'Capacity: Up to 1000 kg',
  },
  {
    id: 'mini_truck',
    label: 'Mini Truck',
    description: 'Capacity: Up to 2000 kg',
  },
  {
    id: 'medium_truck',
    label: 'Medium Truck',
    description: 'Capacity: Up to 5000 kg',
  },
  {
    id: 'large_truck',
    label: 'Large Truck',
    description: 'Capacity: Over 5000 kg',
  },
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

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 6;
  const validatePhoneNumber = (phone: string) => /^[0-9]{10}$/.test(phone);
  const validateVehicleNumber = (vehicleNum: string) => {
    // Basic validation - just check if it's not empty
    return vehicleNum.trim().length > 0;
  };

  const showExistingAccountAlert = () => {
    if (Platform.OS === 'web') {
      setError(
        'An account with this email already exists. Please sign in instead.'
      );
    } else {
      Alert.alert(
        'Account Exists',
        'An account with this email already exists. Would you like to sign in instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/sign-in') },
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
        setError(
          'Phone number, vehicle type, and vehicle number are required for drivers'
        );
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
      const {
        data: { user, session },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            username: email.split('@')[0],
            phone_number: role === 'driver' ? phoneNumber : null,
            vehicle_type: role === 'driver' ? vehicleType : null,
            vehicle_number: role === 'driver' ? vehicleNumber : null,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          showExistingAccountAlert();
          return;
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (user) {
        console.log('✅ User created successfully:', user.id);
        console.log('📱 Session available:', session ? 'Yes' : 'No');

        // With auto-confirmation, we should always get a session
        if (session) {
          console.log('💾 Saving session to storage');
          await authStorage.saveSession(session);

          // Wait a moment for the trigger to create the profile
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

              if (profile) {
                console.log('✅ Profile found, saving to storage');
                await authStorage.saveUserProfile(profile);
              }
            } catch {
              console.log(
                '⏳ Profile not ready yet, will be fetched on next sign in'
              );
            }
          }, 1000);

          Alert.alert(
            'Success',
            'Account created successfully! You will be signed in automatically.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log(
                    '🧭 Sign up complete, navigation will be handled automatically'
                  );
                  // Navigation will be handled by useAuth hook
                },
              },
            ]
          );
        } else {
          // This shouldn't happen with auto-confirmation, but handle it just in case
          console.log('⚠️ No session returned, trying to sign in manually');
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (signInError || !signInData.session) {
            Alert.alert(
              'Account Created',
              'Your account was created successfully. Please sign in to continue.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/sign-in'),
                },
              ]
            );
          } else {
            await authStorage.saveSession(signInData.session);
            Alert.alert(
              'Success',
              'Account created and signed in successfully!'
            );
          }
        }
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>
            Join AiravatL and start your logistics journey
          </Text>
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
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#6C757D"
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
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#6C757D"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather
              name="check-circle"
              size={20}
              color="#6C757D"
              style={styles.inputIcon}
            />
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
                role === 'consigner' && styles.roleOptionSelected,
              ]}
              onPress={() => setRole('consigner')}
            >
              <Feather
                name="package"
                size={24}
                color={role === 'consigner' ? '#FFFFFF' : '#6C757D'}
              />
              <View style={styles.roleContent}>
                <Text
                  style={[
                    styles.roleTitle,
                    role === 'consigner' && styles.roleTitleSelected,
                  ]}
                >
                  Consigner
                </Text>
                <Text
                  style={[
                    styles.roleDescription,
                    role === 'consigner' && styles.roleDescriptionSelected,
                  ]}
                >
                  I want to ship goods
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'driver' && styles.roleOptionSelected,
              ]}
              onPress={() => setRole('driver')}
            >
              <Feather
                name="truck"
                size={24}
                color={role === 'driver' ? '#FFFFFF' : '#6C757D'}
              />
              <View style={styles.roleContent}>
                <Text
                  style={[
                    styles.roleTitle,
                    role === 'driver' && styles.roleTitleSelected,
                  ]}
                >
                  Driver
                </Text>
                <Text
                  style={[
                    styles.roleDescription,
                    role === 'driver' && styles.roleDescriptionSelected,
                  ]}
                >
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
                  <Feather
                    name="phone"
                    size={20}
                    color="#6C757D"
                    style={styles.inputIcon}
                  />
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

                <View style={styles.vehicleSelectionContainer}>
                  <TouchableOpacity
                    style={[styles.inputContainer, styles.vehicleButton]}
                    onPress={() => setShowVehicleDropdown(true)}
                  >
                    <Feather
                      name="truck"
                      size={20}
                      color="#6C757D"
                      style={styles.inputIcon}
                    />
                    <Text
                      style={[
                        styles.vehicleButtonText,
                        !vehicleType && styles.placeholderText,
                      ]}
                    >
                      {vehicleType
                        ? VEHICLE_TYPES.find(v => v.id === vehicleType)?.label
                        : 'Select Vehicle Type'}
                    </Text>
                    <Feather name="chevron-right" size={20} color="#6C757D" />
                  </TouchableOpacity>
                </View>

                {/* Vehicle Selection Modal */}
                <Modal
                  visible={showVehicleDropdown}
                  animationType="slide"
                  presentationStyle="formSheet"
                  onRequestClose={() => setShowVehicleDropdown(false)}
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity
                        onPress={() => setShowVehicleDropdown(false)}
                        style={styles.modalCloseButton}
                      >
                        <Feather name="x" size={24} color="#6C757D" />
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>Select Vehicle Type</Text>
                      <View style={styles.modalHeaderSpacer} />
                    </View>

                    <ScrollView
                      style={styles.modalContent}
                      showsVerticalScrollIndicator={true}
                      contentContainerStyle={styles.modalScrollContent}
                      bounces={true}
                    >
                      {VEHICLE_TYPES.map((vehicle, index) => (
                        <TouchableOpacity
                          key={vehicle.id}
                          style={[
                            styles.modalVehicleItem,
                            vehicleType === vehicle.id &&
                              styles.modalVehicleItemSelected,
                            index === VEHICLE_TYPES.length - 1 &&
                              styles.lastModalItem,
                          ]}
                          onPress={() => {
                            setVehicleType(vehicle.id);
                            setShowVehicleDropdown(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.modalVehicleContent}>
                            <Text
                              style={[
                                styles.modalVehicleTitle,
                                vehicleType === vehicle.id &&
                                  styles.modalVehicleTitleSelected,
                              ]}
                            >
                              {vehicle.label}
                            </Text>
                            <Text
                              style={[
                                styles.modalVehicleDescription,
                                vehicleType === vehicle.id &&
                                  styles.modalVehicleDescriptionSelected,
                              ]}
                            >
                              {vehicle.description}
                            </Text>
                          </View>
                          {vehicleType === vehicle.id && (
                            <Feather name="check" size={20} color="#007AFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </Modal>

                <View style={styles.inputContainer}>
                  <Feather
                    name="hash"
                    size={20}
                    color="#6C757D"
                    style={styles.inputIcon}
                  />
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
            style={[
              styles.signUpButton,
              isLoading && styles.signUpButtonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
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
    flexGrow: 1,
    paddingBottom: 20,
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
  vehicleSelectionContainer: {
    marginBottom: 16,
  },
  vehicleButton: {
    backgroundColor: '#FFFFFF',
  },
  vehicleButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    paddingVertical: 14,
  },
  placeholderText: {
    color: '#6C757D',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalScrollContent: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
    flexGrow: 1,
  },
  modalVehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 80,
  },
  lastModalItem: {
    marginBottom: 20,
  },
  modalVehicleItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  modalVehicleContent: {
    flex: 1,
  },
  modalVehicleTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  modalVehicleTitleSelected: {
    color: '#007AFF',
  },
  modalVehicleDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  modalVehicleDescriptionSelected: {
    color: '#5A9FD4',
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
