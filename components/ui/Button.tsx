import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getVariantStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          backgroundColor: '#007AFF',
          borderWidth: 1,
          borderColor: '#007AFF',
        };
      case 'secondary':
        return {
          ...baseStyles,
          backgroundColor: '#F2F2F7',
          borderWidth: 1,
          borderColor: '#F2F2F7',
        };
      case 'outline':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#007AFF',
        };
      case 'danger':
        return {
          ...baseStyles,
          backgroundColor: '#FF3B30',
          borderWidth: 1,
          borderColor: '#FF3B30',
        };
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 12, paddingVertical: 8 };
      case 'medium':
        return { paddingHorizontal: 16, paddingVertical: 12 };
      case 'large':
        return { paddingHorizontal: 20, paddingVertical: 16 };
      default:
        return { paddingHorizontal: 16, paddingVertical: 12 };
    }
  };

  const getTextStyles = (): TextStyle => {
    const baseTextStyles: TextStyle = {
      fontFamily: 'Inter_600SemiBold',
      textAlign: 'center',
    };

    const sizeTextStyles: TextStyle =
      size === 'small'
        ? { fontSize: 14 }
        : size === 'large'
        ? { fontSize: 18 }
        : { fontSize: 16 };

    const colorTextStyles: TextStyle =
      variant === 'secondary'
        ? { color: '#1C1C1E' }
        : variant === 'outline'
        ? { color: '#007AFF' }
        : { color: '#FFFFFF' };

    return { ...baseTextStyles, ...sizeTextStyles, ...colorTextStyles };
  };

  const getIconColor = (): string => {
    switch (variant) {
      case 'secondary':
        return '#1C1C1E';
      case 'outline':
        return '#007AFF';
      default:
        return '#FFFFFF';
    }
  };

  const renderIcon = () => {
    if (!icon) return null;

    const iconSize = size === 'small' ? 16 : size === 'large' ? 20 : 18;
    const iconColor = getIconColor();

    return (
      <Feather
        name={icon}
        size={iconSize}
        color={iconColor}
        style={{
          marginRight: iconPosition === 'left' ? 8 : 0,
          marginLeft: iconPosition === 'right' ? 8 : 0,
        }}
      />
    );
  };

  const combinedStyles: ViewStyle = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...(fullWidth && { width: '100%' }),
    ...(disabled && { opacity: 0.6 }),
    ...style,
  };

  const combinedTextStyles: TextStyle = {
    ...getTextStyles(),
    ...textStyle,
  };

  return (
    <TouchableOpacity
      testID="test-button"
      style={combinedStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading"
          size="small"
          color={getIconColor()}
          style={{ marginRight: 8 }}
        />
      ) : (
        iconPosition === 'left' && renderIcon()
      )}

      <Text style={combinedTextStyles}>{children || title}</Text>

      {!loading && iconPosition === 'right' && renderIcon()}
    </TouchableOpacity>
  );
};

export default Button;
