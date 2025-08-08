import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { DateTimePicker } from '@/components/common';

const VEHICLE_TYPES = [
  {
    id: 'three_wheeler',
    title: '3 Wheeler',
    capacity: 'Up to 500kg',
    icon: '🛺',
  },
  {
    id: 'pickup_truck',
    title: 'Pickup Truck',
    capacity: 'Up to 1 ton',
    icon: '🚚',
  },
  {
    id: 'mini_truck',
    title: 'Mini Truck',
    capacity: 'Up to 2 tons',
    icon: '🚛',
  },
  {
    id: 'medium_truck',
    title: 'Medium Truck',
    capacity: 'Up to 5 tons',
    icon: '🚛',
  },
  {
    id: 'large_truck',
    title: 'Large Truck',
    capacity: 'Over 5 tons',
    icon: '🚛',
  },
];

interface AuctionFormData {
  from: string;
  to: string;
  description: string;
  weight: string;
  vehicleType: string | null;
  duration: number;
  customDuration: string;
  isCustomDuration: boolean;
  consignmentDate: Date;
}

interface AuctionFormSharedProps {
  mode: 'create' | 'edit';
  initialData?: Partial<AuctionFormData>;
  auctionId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AuctionFormShared: React.FC<AuctionFormSharedProps> = ({
  mode,
  initialData = {},
  auctionId,
  onSuccess,
  onCancel,
}) => {
  const [from, setFrom] = useState(initialData.from || '');
  const [to, setTo] = useState(initialData.to || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [weight, setWeight] = useState(initialData.weight || '');
  const [vehicleType, setVehicleType] = useState<string | null>(
    initialData.vehicleType || null
  );
  const [duration, setDuration] = useState<number>(initialData.duration || 5);
  const [customDuration, setCustomDuration] = useState(
    initialData.customDuration || ''
  );
  const [isCustomDuration, setIsCustomDuration] = useState(
    initialData.isCustomDuration || false
  );
  const [consignmentDate, setConsignmentDate] = useState<Date>(
    initialData.consignmentDate || new Date()
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBids, setHasBids] = useState(false);
  const [checkingBids, setCheckingBids] = useState(false);

  // Check if auction has bids (for edit mode)
  const checkAuctionHasBids = async (auctionIdToCheck: string) => {
    try {
      setCheckingBids(true);
      const { data: bids, error } = await supabase
        .from('auction_bids')
        .select('id')
        .eq('auction_id', auctionIdToCheck)
        .limit(1);

      if (error) {
        console.error('Error checking bids:', error);
        return false;
      }

      return bids && bids.length > 0;
    } catch (error) {
      console.error('Error checking auction bids:', error);
      return false;
    } finally {
      setCheckingBids(false);
    }
  };

  // Check for bids when in edit mode
  React.useEffect(() => {
    if (mode === 'edit' && auctionId) {
      checkAuctionHasBids(auctionId).then(setHasBids);
    }
  }, [mode, auctionId]);

  // Disable form when auction has bids
  const isFormDisabled = mode === 'edit' && hasBids;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!from.trim()) newErrors.from = 'Pickup location is required';
    if (!to.trim()) newErrors.to = 'Destination is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!weight.trim()) newErrors.weight = 'Weight is required';
    if (!vehicleType) newErrors.vehicleType = 'Vehicle type is required';

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      newErrors.weight = 'Please enter a valid weight';
    }

    let finalDuration: number;
    if (isCustomDuration) {
      const parsedDuration = parseInt(customDuration, 10);
      if (isNaN(parsedDuration) || parsedDuration <= 0) {
        newErrors.duration = 'Please enter a valid duration';
      } else {
        finalDuration = parsedDuration;
      }
    } else {
      finalDuration = duration;
    }

    if (finalDuration! < 5) {
      newErrors.duration = 'Duration must be at least 5 minutes';
    }

    if (finalDuration! > 1440) {
      newErrors.duration = 'Duration cannot exceed 24 hours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Prevent editing if auction has bids
    if (mode === 'edit' && auctionId) {
      const auctionHasBids = await checkAuctionHasBids(auctionId);
      if (auctionHasBids) {
        Alert.alert(
          'Cannot Edit Auction',
          'This auction cannot be edited because drivers have already placed bids. Editing would be unfair to the bidders.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Please sign in to continue');
        return;
      }

      const finalDuration = isCustomDuration
        ? parseInt(customDuration, 10)
        : duration;

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + finalDuration * 60000);

      const auctionData = {
        title: `Delivery from ${from} to ${to}`,
        description: `${description}\nWeight: ${weight} kg\nVehicle Type: ${
          VEHICLE_TYPES.find((v) => v.id === vehicleType)?.title
        }`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        created_by: user.id,
        vehicle_type: vehicleType!,
        consignment_date: consignmentDate.toISOString(),
      };

      if (mode === 'edit' && auctionId) {
        // Update existing auction
        const { error: updateError } = await supabase
          .from('auctions')
          .update({
            title: auctionData.title,
            description: auctionData.description,
            vehicle_type: auctionData.vehicle_type,
          })
          .eq('id', auctionId);

        if (updateError) {
          throw new Error(updateError.message || 'Failed to update auction');
        }

        // Send notifications in background (non-blocking)
        setTimeout(async () => {
          try {
            console.log(
              '🔄 Sending auction updated notification for auction:',
              auctionId
            );
            console.log('📋 Notification data:', {
              from,
              to,
              vehicleType,
              weight,
              weightParsed: parseFloat(weight),
            });

            // Validate data before sending notification
            if (!from || !to || !vehicleType || !weight) {
              console.error('❌ Missing required data for notification:', {
                from: !!from,
                to: !!to,
                vehicleType: !!vehicleType,
                weight: !!weight,
              });
              return;
            }

            const weightNum = parseFloat(weight);
            if (isNaN(weightNum)) {
              console.error('❌ Invalid weight for notification:', weight);
              return;
            }

            const { auctionNotificationService } = await import(
              '@/lib/notifications/auctionNotifications'
            );

            console.log('📞 Calling notifyAuctionUpdated...');
            await auctionNotificationService.notifyAuctionUpdated(
              auctionId,
              `Delivery from ${from} to ${to}`,
              vehicleType,
              weightNum
            );
            console.log('✅ Auction updated notification sent successfully');
          } catch (error) {
            console.error(
              '❌ Error sending auction updated notification:',
              error
            );
            console.error('❌ Full error stack:', error);
          }
        }, 100);

        Alert.alert('Success', 'Auction updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) {
                onSuccess();
              } else {
                router.push(`/auctions/${auctionId}`);
              }
            },
          },
        ]);
      } else {
        // Create new auction
        const { data: createdAuction, error: auctionError } = await supabase
          .from('auctions')
          .insert(auctionData)
          .select()
          .single();

        if (auctionError) {
          throw new Error(auctionError.message || 'Failed to create auction');
        }

        // Send notifications in background (non-blocking)
        setTimeout(async () => {
          try {
            const { auctionNotificationService } = await import(
              '@/lib/notifications/auctionNotifications'
            );
            await auctionNotificationService.notifyNewAuction(
              createdAuction.id,
              `Delivery from ${from} to ${to}`,
              vehicleType!,
              parseFloat(weight)
            );
          } catch {
            // Silently handle notification errors in production
          }
        }, 100);

        Alert.alert(
          'Success',
          `Auction created successfully. It will close in ${finalDuration} ${
            finalDuration === 1 ? 'minute' : 'minutes'
          }.`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSuccess) {
                  onSuccess();
                } else {
                  router.push('/auctions');
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error submitting auction:', error);
      Alert.alert(
        'Error',
        mode === 'edit'
          ? 'Failed to update auction'
          : 'Failed to create auction'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDurationSelect = (value: number) => {
    setDuration(value);
    setIsCustomDuration(false);
    setCustomDuration('');
  };

  const handleCustomDurationPress = () => {
    setIsCustomDuration(true);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'edit' ? 'Edit Auction' : 'Create Auction'}
          </Text>
          <Text style={styles.subtitle}>
            Fill in the details for your delivery request
          </Text>

          {/* Warning message when auction has bids */}
          {mode === 'edit' && checkingBids && (
            <View style={styles.warningContainer}>
              <Feather name="info" size={16} color="#FFA500" />
              <Text style={styles.warningText}>
                Checking if auction has bids...
              </Text>
            </View>
          )}

          {mode === 'edit' && !checkingBids && hasBids && (
            <View style={styles.errorContainer}>
              <Feather name="alert-triangle" size={16} color="#FF6B6B" />
              <Text style={styles.errorWarningText}>
                This auction cannot be edited because drivers have already
                placed bids.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pickup Location</Text>
          <TextInput
            style={[
              styles.input,
              errors.from && styles.inputError,
              isFormDisabled && styles.inputDisabled,
            ]}
            value={from}
            onChangeText={setFrom}
            placeholder="Enter pickup location"
            placeholderTextColor="#6C757D"
            editable={!isFormDisabled}
          />
          {errors.from && <Text style={styles.errorText}>{errors.from}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={[
              styles.input,
              errors.to && styles.inputError,
              isFormDisabled && styles.inputDisabled,
            ]}
            value={to}
            onChangeText={setTo}
            placeholder="Enter destination"
            placeholderTextColor="#6C757D"
            editable={!isFormDisabled}
          />
          {errors.to && <Text style={styles.errorText}>{errors.to}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              errors.description && styles.inputError,
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your delivery requirements"
            placeholderTextColor="#6C757D"
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={[styles.input, errors.weight && styles.inputError]}
            value={weight}
            onChangeText={setWeight}
            placeholder="Enter weight in kg"
            placeholderTextColor="#6C757D"
            keyboardType="numeric"
          />
          {errors.weight && (
            <Text style={styles.errorText}>{errors.weight}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Type</Text>
          {errors.vehicleType && (
            <Text style={styles.errorText}>{errors.vehicleType}</Text>
          )}
          {VEHICLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.vehicleOption,
                vehicleType === type.id && styles.vehicleOptionSelected,
              ]}
              onPress={() => setVehicleType(type.id)}
            >
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleIcon}>{type.icon}</Text>
                <View style={styles.vehicleDetails}>
                  <Text
                    style={[
                      styles.vehicleTitle,
                      vehicleType === type.id && styles.vehicleTitleSelected,
                    ]}
                  >
                    {type.title}
                  </Text>
                  <Text style={styles.vehicleCapacity}>{type.capacity}</Text>
                </View>
              </View>
              {vehicleType === type.id && (
                <Feather name="check-circle" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Consignment Date</Text>
          <DateTimePicker
            value={consignmentDate}
            onChange={setConsignmentDate}
            mode="date"
            minimumDate={new Date()}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Auction Duration</Text>
          {errors.duration && (
            <Text style={styles.errorText}>{errors.duration}</Text>
          )}
          <View style={styles.durationOptions}>
            {[5, 10, 15, 30, 60].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.durationOption,
                  duration === minutes &&
                    !isCustomDuration &&
                    styles.durationOptionSelected,
                ]}
                onPress={() => handleDurationSelect(minutes)}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === minutes &&
                      !isCustomDuration &&
                      styles.durationTextSelected,
                  ]}
                >
                  {minutes}m
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.durationOption,
                isCustomDuration && styles.durationOptionSelected,
              ]}
              onPress={handleCustomDurationPress}
            >
              <Text
                style={[
                  styles.durationText,
                  isCustomDuration && styles.durationTextSelected,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {isCustomDuration && (
            <View style={styles.customDurationContainer}>
              <TextInput
                style={styles.customDurationInput}
                value={customDuration}
                onChangeText={setCustomDuration}
                placeholder="Enter duration in minutes"
                placeholderTextColor="#6C757D"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || isFormDisabled) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || isFormDisabled}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isFormDisabled
                  ? 'Cannot Edit (Has Bids)'
                  : mode === 'edit'
                  ? 'Update Auction'
                  : 'Create Auction'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  inputError: {
    borderColor: '#DC3545',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  vehicleOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  vehicleTitleSelected: {
    color: '#007AFF',
  },
  vehicleCapacity: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationOption: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  durationOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  durationText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  durationTextSelected: {
    color: '#FFFFFF',
  },
  customDurationContainer: {
    marginTop: 12,
  },
  customDurationInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6C757D',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    color: '#F57C00',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  errorWarningText: {
    color: '#D32F2F',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#9E9E9E',
    opacity: 0.6,
  },
});
