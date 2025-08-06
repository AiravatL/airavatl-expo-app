import { useState, useEffect, useCallback } from 'react';

interface UseDebouncedValueOptions {
  delay?: number;
}

export const useDebouncedValue = <T>(
  value: T,
  options: UseDebouncedValueOptions = {}
): T => {
  const { delay = 500 } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface UseDebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebounceOptions = {}
): T => {
  const { delay = 500, leading = false, trailing = true } = options;
  const [lastCallTime, setLastCallTime] = useState<number | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (leading && lastCallTime === null) {
        setLastCallTime(now);
        return callback(...args);
      }

      setTimeout(() => {
        if (trailing) {
          setLastCallTime(now);
          callback(...args);
        }
      }, delay);
    },
    [callback, delay, leading, trailing, lastCallTime]
  ) as T;

  return debouncedCallback;
};
