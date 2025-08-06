import { useCallback, useRef } from 'react';

/**
 * Throttle function to limit the rate of function execution
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Debounce function to delay function execution
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: any;

  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * Hook for throttling function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const throttledCallback = useRef(throttle(callback, delay));

  return useCallback(
    (...args: Parameters<T>) => throttledCallback.current(...args),
    []
  ) as T;
};

/**
 * Memoize expensive calculations
 */
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);

    return result;
  }) as T;
};

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ ${label}: ${duration}ms`);
    this.timers.delete(label);

    return duration;
  }

  static measureAsync<T>(
    label: string,
    asyncFn: () => Promise<T>
  ): Promise<T> {
    this.startTimer(label);
    return asyncFn().finally(() => this.endTimer(label));
  }
}

/**
 * Memory usage monitoring (React Native specific)
 */
export const getMemoryUsage = (): void => {
  if (__DEV__) {
    console.log('🧠 Memory monitoring available in development mode');
    // Memory monitoring would require native modules or specific tools
  }
};

/**
 * FlatList optimization helpers
 */
export const flatListOptimizations = {
  // Standard optimization props
  getDefaultProps: () => ({
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    windowSize: 10,
    initialNumToRender: 10,
    updateCellsBatchingPeriod: 100,
    getItemLayout: (data: any[], index: number) => ({
      length: 100, // Estimate item height
      offset: 100 * index,
      index,
    }),
  }),

  // Key extractor optimization
  keyExtractor: (item: any, index: number): string => {
    return item.id?.toString() || `item-${index}`;
  },
};

/**
 * Image optimization helpers
 */
export const imageOptimizations = {
  // Get optimized image dimensions
  getOptimizedDimensions: (
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ) => {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  },

  // Default image props for performance
  getDefaultProps: () => ({
    resizeMode: 'cover' as const,
    // loadingIndicatorSource: placeholder would go here if needed
    fadeDuration: 300,
  }),
};

/**
 * Bundle size analysis helper
 */
export const analyzeBundleSize = (): void => {
  if (__DEV__) {
    console.log('📦 Bundle Analysis available in development mode');
    // Bundle analysis would require specific tooling
  }
};
