import { useState, useEffect } from 'react';
import { Keyboard } from 'react-native';

interface UseKeyboardReturn {
  keyboardVisible: boolean;
  keyboardHeight: number;
}

export const useKeyboard = (): UseKeyboardReturn => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  return {
    keyboardVisible,
    keyboardHeight,
  };
};
