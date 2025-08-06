import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  variant = 'outlined',
  size = 'medium',
  secureTextEntry,
  required,
  ...textInputProps
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      marginBottom: 16,
    };

    return { ...baseStyles };
  };

  const getInputContainerStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
    };

    const sizeStyles: ViewStyle =
      size === 'small'
        ? { paddingHorizontal: 12, paddingVertical: 8 }
        : size === 'large'
        ? { paddingHorizontal: 16, paddingVertical: 16 }
        : { paddingHorizontal: 14, paddingVertical: 12 };

    const variantStyles: ViewStyle = (() => {
      switch (variant) {
        case 'filled':
          return {
            backgroundColor: '#F2F2F7',
            borderWidth: 0,
          };
        case 'outlined':
          return {
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: error ? '#FF3B30' : isFocused ? '#007AFF' : '#E5E5EA',
          };
        default:
          return {
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: error
              ? '#FF3B30'
              : isFocused
              ? '#007AFF'
              : '#E5E5EA',
            borderRadius: 0,
          };
      }
    })();

    return { ...baseStyles, ...sizeStyles, ...variantStyles };
  };

  const getInputStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      flex: 1,
      fontFamily: 'Inter_400Regular',
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
      color: '#1C1C1E',
    };

    return baseStyles;
  };

  const getLabelStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: '#1C1C1E',
      marginBottom: 6,
    };

    return baseStyles;
  };

  const getErrorStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: '#FF3B30',
      marginTop: 4,
    };

    return baseStyles;
  };

  const getIconColor = (): string => {
    return error ? '#FF3B30' : isFocused ? '#007AFF' : '#8E8E93';
  };

  const getIconSize = (): number => {
    return size === 'small' ? 16 : size === 'large' ? 22 : 20;
  };

  const handlePasswordToggle = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const actualSecureTextEntry = secureTextEntry ? !isPasswordVisible : false;
  const showPasswordToggle = secureTextEntry;

  return (
    <View style={[getContainerStyles(), containerStyle]}>
      {label && <Text style={[getLabelStyles(), labelStyle]}>{label}</Text>}

      <View style={getInputContainerStyles()}>
        {(icon || leftIcon) && (
          <Feather
            name={icon || leftIcon!}
            size={getIconSize()}
            color={getIconColor()}
            style={{ marginRight: 10 }}
          />
        )}

        <TextInput
          style={[getInputStyles(), inputStyle]}
          secureTextEntry={actualSecureTextEntry}
          placeholderTextColor="#8E8E93"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />

        {showPasswordToggle && (
          <TouchableOpacity
            onPress={handlePasswordToggle}
            style={{ marginLeft: 10 }}
          >
            <Feather
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={getIconSize()}
              color={getIconColor()}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !showPasswordToggle && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ marginLeft: 10 }}
          >
            <Feather
              name={rightIcon}
              size={getIconSize()}
              color={getIconColor()}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={[getErrorStyles(), errorStyle]}>{error}</Text>}
    </View>
  );
};

export default Input;
