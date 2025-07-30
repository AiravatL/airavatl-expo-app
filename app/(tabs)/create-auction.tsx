import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const DURATION_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

const VEHICLE_TYPES = [
  {
    id: 'three_wheeler',
    title: '3 Wheeler',
    description: 'Capacity: Up to 500 kg',
  },
  {
    id: 'pickup_truck',
    title: 'Pickup Truck',
    description: 'Capacity: Up to 1000 kg',
  },
  {
    id: 'mini_truck',
    title: 'Mini Truck',
    description: 'Capacity: Up to 2000 kg',
  },
  {
    id: 'medium_truck',
    title: 'Medium Truck',
    description: 'Capacity: Up to 5000 kg',
  },
  {
    id: 'large_truck',
    title: 'Large Truck',
    description: 'Capacity: Over 5000 kg',
  },
];

export default function CreateAuctionScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(5);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [consignmentDate, setConsignmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setConsignmentDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    setDurationError(null);

    if (!from || !to || !description || !weight || !vehicleType) {
      Alert.alert('Error', 'Please fill in all fields and select a vehicle type');
      return;
    }

    if (from === to) {
      Alert.alert('Error', 'Pickup and dropoff locations cannot be the same');
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    let finalDuration: number;
    if (isCustomDuration) {
      const parsedDuration = parseInt(customDuration, 10);
      if (isNaN(parsedDuration) || parsedDuration <= 0) {
        setDurationError('Please enter a valid duration');
        return;
      }
      finalDuration = parsedDuration;
    } else {
      finalDuration = duration;
    }

    if (finalDuration < 5) {
      setDurationError('Duration must be at least 5 minutes');
      return;
    }

    if (finalDuration > 1440) {
      setDurationError('Duration cannot exceed 24 hours');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Please sign in to create an auction');
        return;
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + finalDuration * 60000);

      const { error } = await supabase
        .from('auctions')
        .insert({
          title: `Delivery from ${from} to ${to}`,
          description: `${description}\nWeight: ${weight} kg\nVehicle Type: ${
            VEHICLE_TYPES.find(v => v.id === vehicleType)?.title
          }`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          created_by: user.id,
          vehicle_type: vehicleType,
          consignment_date: consignmentDate.toISOString(),
        });

      if (error) throw error;

      Alert.alert(
        'Success', 
        `Auction created successfully. It will close in ${finalDuration} ${finalDuration === 1 ? 'minute' : 'minutes'}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFrom('');
              setTo('');
              setDescription('');
              setWeight('');
              setVehicleType(null);
              setDuration(5);
              setCustomDuration('');
              setIsCustomDuration(false);
              setConsignmentDate(new Date());
              
              // Navigate to auctions tab
              router.push('/auctions');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating auction:', error);
      Alert.alert('Error', 'Failed to create auction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDurationSelect = (value: number) => {
    setDuration(value);
    setIsCustomDuration(false);
    setCustomDuration('');
    setDurationError(null);
  };

  const handleCustomDurationPress = () => {
    setIsCustomDuration(true);
    setCustomDuration('');
    setDuration(0);
    setDurationError(null);
  };

  const handleCustomDurationChange = (text: string) => {
    setCustomDuration(text);
    setDurationError(null);
    
    const parsedDuration = parseInt(text, 10);
    if (text && (isNaN(parsedDuration) || parsedDuration < 5)) {
      setDurationError('Duration must be at least 5 minutes');
    } else if (parsedDuration > 1440) {
      setDurationError('Duration cannot exceed 24 hours');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Auction</Text>
          <Text style={styles.subtitle}>Fill in the details for your delivery request</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pickup Location</Text>
          <View style={styles.locationInput}>
            <Feather name="map-pin" size={20} color="#007AFF" />
            <TextInput
              style={styles.locationTextInput}
              value={from}
              onChangeText={setFrom}
              placeholder="Enter pickup location"
              placeholderTextColor="#6C757D"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Dropoff Location</Text>
          <View style={styles.locationInput}>
            <Feather name="map-pin" size={20} color="#007AFF" />
            <TextInput
              style={styles.locationTextInput}
              value={to}
              onChangeText={setTo}
              placeholder="Enter dropoff location"
              placeholderTextColor="#6C757D"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Package Details</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter package details, size, etc."
            placeholderTextColor="#6C757D"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Weight (kg)</Text>
          <View style={styles.weightInput}>
            <Feather name="package" size={20} color="#6C757D" />
            <TextInput
              style={styles.weightTextInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="Enter package weight"
              keyboardType="numeric"
              placeholderTextColor="#6C757D"
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.vehicleGrid}>
            {VEHICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.vehicleCard,
                  vehicleType === type.id && styles.vehicleCardSelected
                ]}
                onPress={() => setVehicleType(type.id)}>
                <View style={styles.vehicleIcon}>
                  <Feather name="truck" size={24} color={vehicleType === type.id ? '#FFFFFF' : '#6C757D'} />
                </View>
                <View style={styles.vehicleContent}>
                  <Text
                    style={[
                      styles.vehicleTitle,
                      vehicleType === type.id && styles.vehicleTitleSelected
                    ]}>
                    {type.title}
                  </Text>
                  <Text
                    style={[
                      styles.vehicleDescription,
                      vehicleType === type.id && styles.vehicleDescriptionSelected
                    ]}>
                    {type.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Consignment Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>
              {format(consignmentDate, 'MMM d, yyyy')}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={consignmentDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationOption,
                  !isCustomDuration && duration === option.value && styles.durationOptionSelected
                ]}
                onPress={() => handleDurationSelect(option.value)}>
                <Feather name="clock" size={16} color={!isCustomDuration && duration === option.value ? '#FFFFFF' : '#6C757D'} />
                <Text
                  style={[
                    styles.durationOptionText,
                    !isCustomDuration && duration === option.value && styles.durationOptionTextSelected
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.customDurationButton, isCustomDuration && styles.customDurationButtonSelected]}
            onPress={handleCustomDurationPress}>
            <View style={styles.customDurationContent}>
              <Feather name="clock" size={20} color={isCustomDuration ? '#FFFFFF' : '#6C757D'} />
              <Text
                style={[
                  styles.customDurationText,
                  isCustomDuration && styles.customDurationTextSelected
                ]}>
                Custom Duration
              </Text>
            </View>
          </TouchableOpacity>

          {isCustomDuration && (
            <View style={styles.customDurationInput}>
              <View style={styles.durationInputContainer}>
                <TextInput
                  style={[
                    styles.durationInput,
                    durationError && styles.durationInputError
                  ]}
                  value={customDuration}
                  onChangeText={handleCustomDurationChange}
                  placeholder="Enter duration (5-1440 minutes)"
                  keyboardType="numeric"
                  placeholderTextColor="#6C757D"
                  autoFocus
                />
                <Text style={styles.durationUnit}>minutes</Text>
              </View>
              {durationError && (
                <Text style={styles.errorText}>{durationError}</Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Create Auction</Text>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 32,
    paddingTop: 8, // Reduced from 16 to 8
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
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  locationTextInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    height: 120,
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  weightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
  },
  weightTextInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  weightUnit: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
    marginLeft: 8,
  },
  vehicleGrid: {
    gap: 12,
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  vehicleCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleContent: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  vehicleTitleSelected: {
    color: '#FFFFFF',
  },
  vehicleDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  vehicleDescriptionSelected: {
    color: '#FFFFFF',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  durationOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  durationOptionText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
  },
  durationOptionTextSelected: {
    color: '#FFFFFF',
  },
  customDurationButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  customDurationButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  customDurationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDurationText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
  },
  customDurationTextSelected: {
    color: '#FFFFFF',
  },
  customDurationInput: {
    marginTop: 16,
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginRight: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  durationInputError: {
    borderColor: '#DC2626',
  },
  durationUnit: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#DC2626',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dateButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
});