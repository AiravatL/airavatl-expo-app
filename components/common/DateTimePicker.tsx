import React, { useState } from 'react';
import {
  View,
  Platform,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import DateTimePickerNative from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react-native';

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  mode = 'date',
  label,
}: DateTimePickerProps) {
  const [show, setShow] = useState(false);

  const handleChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <input
          type={mode === 'datetime' ? 'datetime-local' : mode}
          value={format(value, "yyyy-MM-dd'T'HH:mm")}
          onChange={(e) => {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
              onChange(date);
            }
          }}
          min={minimumDate?.toISOString().split('T')[0]}
          max={maximumDate?.toISOString().split('T')[0]}
          style={styles.webInput}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.button} onPress={() => setShow(true)}>
        <Calendar size={20} color="#007AFF" />
        <Text style={styles.buttonText}>
          {format(value, mode === 'time' ? 'HH:mm' : 'MMM d, yyyy')}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePickerNative
          value={value}
          mode={mode}
          is24Hour={true}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  webInput: {
    width: '100%',
    padding: 16,
    fontSize: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter_400Regular',
    // outlineStyle is web-only and not supported in React Native
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
});
