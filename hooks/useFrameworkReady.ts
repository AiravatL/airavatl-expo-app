import { useEffect } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    try {
      // Only call frameworkReady if it exists and we're in a web environment
      if (typeof window !== 'undefined' && window.frameworkReady) {
        window.frameworkReady();
      }
    } catch (error) {
      console.warn('Framework ready hook error:', error);
    }
  }, []);
}
