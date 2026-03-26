import { useState, useEffect, useRef, useCallback } from 'react';

/** Debounce a value — returns the debounced value after `delay` ms of inactivity. */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Prevent duplicate API calls in React strict mode / concurrent renders. */
export function useOnceEffect(effect: () => void | (() => void), deps: any[] = []) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
