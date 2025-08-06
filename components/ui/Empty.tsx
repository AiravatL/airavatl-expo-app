import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
  iconSize?: number;
  iconColor?: string;
  variant?: 'default' | 'search' | 'network' | 'cart' | 'notifications';
}

const Empty: React.FC<EmptyProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  style,
  iconSize = 64,
  iconColor = '#BDC3C7',
  variant = 'default',
}) => {
  // Predefined variants
  const variants = {
    default: {
      icon: 'document-outline' as keyof typeof Ionicons.glyphMap,
      title: 'No data found',
      description: 'There is no data to display at the moment.',
    },
    search: {
      icon: 'search-outline' as keyof typeof Ionicons.glyphMap,
      title: 'No results found',
      description: 'Try adjusting your search criteria or check your spelling.',
    },
    network: {
      icon: 'cloud-offline-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Connection error',
      description: 'Please check your internet connection and try again.',
    },
    cart: {
      icon: 'bag-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Your cart is empty',
      description: 'Add some items to your cart to get started.',
    },
    notifications: {
      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
      title: 'No notifications',
      description: "You're all caught up! Check back later for updates.",
    },
  };

  const variantConfig = variants[variant];
  const displayIcon = icon || variantConfig.icon;
  const displayTitle = title || variantConfig.title;
  const displayDescription = description || variantConfig.description;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons
          name={displayIcon}
          size={iconSize}
          color={iconColor}
          style={styles.icon}
        />

        <Text style={styles.title}>{displayTitle}</Text>

        <Text style={styles.description}>{displayDescription}</Text>

        {actionText && onAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAction}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
});

export default Empty;
