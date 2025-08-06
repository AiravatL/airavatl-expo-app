import React from 'react';
import { View, ViewStyle, TouchableOpacity, Platform } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  backgroundColor?: string;
  borderRadius?: number;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  backgroundColor = '#FFFFFF',
  borderRadius = 12,
}) => {
  const getVariantStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      backgroundColor,
      borderRadius,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 4,
            },
            web: {
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            },
          }),
        };
      case 'outlined':
        return {
          ...baseStyles,
          borderWidth: 1,
          borderColor: '#E5E5EA',
        };
      default:
        return {
          ...baseStyles,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
            },
            android: {
              elevation: 1,
            },
            web: {
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            },
          }),
        };
    }
  };

  const getPaddingStyles = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return {};
      case 'small':
        return { padding: 8 };
      case 'medium':
        return { padding: 16 };
      case 'large':
        return { padding: 24 };
      default:
        return { padding: 16 };
    }
  };

  const getMarginStyles = (): ViewStyle => {
    switch (margin) {
      case 'none':
        return {};
      case 'small':
        return { margin: 8 };
      case 'medium':
        return { margin: 16 };
      case 'large':
        return { margin: 24 };
      default:
        return {};
    }
  };

  const combinedStyles: ViewStyle = {
    ...getVariantStyles(),
    ...getPaddingStyles(),
    ...getMarginStyles(),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={combinedStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={combinedStyles}>{children}</View>;
};

export default Card;
