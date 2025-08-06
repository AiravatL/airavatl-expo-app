import React from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  animationType = 'slide',
  style,
  contentStyle,
  titleStyle,
}) => {
  const getModalSize = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          width: '80%',
          maxHeight: '40%',
        };
      case 'medium':
        return {
          width: '90%',
          maxHeight: '70%',
        };
      case 'large':
        return {
          width: '95%',
          maxHeight: '85%',
        };
      case 'fullscreen':
        return {
          width: '100%',
          height: '100%',
          margin: 0,
          borderRadius: 0,
        };
      default:
        return {
          width: '90%',
          maxHeight: '70%',
        };
    }
  };

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <View style={[styles.modal, getModalSize(), style]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              {/* Header */}
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title && (
                    <Text style={[styles.title, titleStyle]}>{title}</Text>
                  )}
                  {showCloseButton && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={onClose}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="x" size={24} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Content */}
              <View style={[styles.content, contentStyle]}>{children}</View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
  },
  closeButton: {
    marginLeft: 16,
  },
  content: {
    padding: 20,
  },
});

export default Modal;
