import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStateReturn {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
}

export const useAppState = (): UseAppStateReturn => {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appState.current = nextAppState;
      setAppStateVisible(nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  return {
    appState: appStateVisible,
    isActive: appStateVisible === 'active',
    isBackground: appStateVisible === 'background',
    isInactive: appStateVisible === 'inactive',
  };
};
