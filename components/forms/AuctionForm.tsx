import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Input } from '../ui';
import { useAuctionStore } from '@/store/auction/auctionStore';

// Auction form validation schema
const auctionSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  startingBid: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Starting bid must be a positive number',
    }),
  reservePrice: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: 'Reserve price must be a positive number',
    }),
  category: z.string().min(1, 'Please select a category'),
  duration: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Duration must be a positive number',
  }),
  location: z
    .string()
    .min(3, 'Location must be at least 3 characters')
    .max(100, 'Location must not exceed 100 characters'),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor'], {
    message: 'Please select a condition',
  }),
});

type AuctionFormData = z.infer<typeof auctionSchema>;

interface AuctionFormProps {
  onSubmit?: (data: AuctionFormData) => void;
  initialValues?: Partial<AuctionFormData>;
  isEditing?: boolean;
}

const AuctionForm: React.FC<AuctionFormProps> = ({
  onSubmit,
  initialValues,
  isEditing = false,
}) => {
  const { isLoading, createAuction } = useAuctionStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<AuctionFormData>({
    resolver: zodResolver(auctionSchema),
    defaultValues: {
      title: '',
      description: '',
      startingBid: '',
      reservePrice: '',
      category: '',
      duration: '7',
      location: '',
      condition: 'good',
      ...initialValues,
    },
    mode: 'onChange',
  });

  const handleFormSubmit = async (data: AuctionFormData) => {
    try {
      if (onSubmit) {
        onSubmit(data);
        return;
      }

      const auctionData = {
        ...data,
        startingBid: Number(data.startingBid),
        reservePrice: data.reservePrice ? Number(data.reservePrice) : undefined,
        duration: Number(data.duration),
        images: [], // Images would be handled separately
      };

      if (isEditing) {
        // Update existing auction - would implement later
        Alert.alert('Success', 'Auction updated successfully!');
      } else {
        // Create new auction
        await createAuction(auctionData);
        Alert.alert('Success', 'Auction created successfully!');
        reset();
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to save auction. Please try again.'
      );
    }
  };

  const categories = [
    'Electronics',
    'Vehicles',
    'Home & Garden',
    'Fashion',
    'Sports & Recreation',
    'Art & Collectibles',
    'Books & Media',
    'Other',
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {isEditing ? 'Edit Auction' : 'Create New Auction'}
        </Text>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Title"
              placeholder="Enter auction title"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
              required
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description"
              placeholder="Describe your item in detail"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
              numberOfLines={4}
              required
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Controller
              control={control}
              name="startingBid"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Starting Bid"
                  placeholder="0.00"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.startingBid?.message}
                  keyboardType="decimal-pad"
                  leftIcon="dollar-sign"
                  required
                />
              )}
            />
          </View>

          <View style={styles.halfWidth}>
            <Controller
              control={control}
              name="reservePrice"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Reserve Price"
                  placeholder="Optional"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.reservePrice?.message}
                  keyboardType="decimal-pad"
                  leftIcon="shield"
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={value === category ? 'primary' : 'outline'}
                    size="small"
                    onPress={() => onChange(category)}
                    style={styles.categoryButton}
                  >
                    {category}
                  </Button>
                ))}
              </View>
              {errors.category && (
                <Text style={styles.errorText}>{errors.category.message}</Text>
              )}
            </View>
          )}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Controller
              control={control}
              name="duration"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Duration (days)"
                  placeholder="7"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.duration?.message}
                  keyboardType="number-pad"
                  leftIcon="calendar"
                  required
                />
              )}
            />
          </View>

          <View style={styles.halfWidth}>
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Location"
                  placeholder="City, Country"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.location?.message}
                  leftIcon="map-pin"
                  required
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="condition"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Condition *</Text>
              <View style={styles.conditionRow}>
                {conditions.map((condition) => (
                  <Button
                    key={condition.value}
                    variant={value === condition.value ? 'primary' : 'outline'}
                    size="small"
                    onPress={() => onChange(condition.value)}
                    style={styles.conditionButton}
                  >
                    {condition.label}
                  </Button>
                ))}
              </View>
              {errors.condition && (
                <Text style={styles.errorText}>{errors.condition.message}</Text>
              )}
            </View>
          )}
        />

        <Button
          onPress={handleSubmit(handleFormSubmit)}
          loading={isLoading}
          disabled={!isValid}
          style={styles.submitButton}
        >
          {isEditing ? 'Update Auction' : 'Create Auction'}
        </Button>
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
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    marginBottom: 8,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    minWidth: 80,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#E74C3C',
    marginTop: 4,
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 20,
  },
});

export default AuctionForm;
