import { useState, useEffect } from 'react';

interface UseNetworkReturn {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
}

export const useNetwork = (): UseNetworkReturn => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    // This is a simplified version - you would need to install @react-native-community/netinfo
    // For now, we'll assume connection is available
    setIsConnected(true);
    setIsInternetReachable(true);
    setType('wifi');
  }, []);

  return {
    isConnected,
    isInternetReachable,
    type,
  };
};
