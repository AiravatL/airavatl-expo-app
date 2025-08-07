import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Input } from '../ui';
import { useAuthStore } from '@/store/auth/authStore';

// Extended user profile interface
interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  location?: string;
}

// Profile form validation schema
const profileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits')
    .regex(/^[+]?[\d\s\-()]+$/, 'Please enter a valid phone number'),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  location: z
    .string()
    .min(3, 'Location must be at least 3 characters')
    .max(100, 'Location must not exceed 100 characters')
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  onSubmit?: (data: ProfileFormData) => void;
  initialValues?: Partial<ProfileFormData>;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  onSubmit,
  initialValues,
}) => {
  const { user, updateUser } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: '',
      location: '',
      ...initialValues,
    },
    mode: 'onChange',
  });

  const handleFormSubmit = async (data: ProfileFormData) => {
    try {
      if (onSubmit) {
        onSubmit(data);
        return;
      }

      // Update user profile
      await updateUser(data);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to update profile. Please try again.'
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.title}>Edit Profile</Text>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="First Name"
                  placeholder="Enter first name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.firstName?.message}
                />
              )}
            />
          </View>

          <View style={styles.halfWidth}>
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Last Name"
                  placeholder="Enter last name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.lastName?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="Enter email address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Phone Number"
              placeholder="Enter phone number"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              keyboardType="phone-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Location"
              placeholder="City, Country (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.location?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Bio"
              placeholder="Tell us about yourself (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.bio?.message}
              multiline
              numberOfLines={4}
            />
          )}
        />

        <Button
          title={`Update Profile`}
          onPress={handleSubmit(handleFormSubmit)}
          disabled={!isValid}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#2C3E50',
    marginBottom: 24,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 20,
  },
});

export default ProfileForm;
