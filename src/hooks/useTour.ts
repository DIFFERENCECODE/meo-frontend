'use client';

import { useState, useEffect, useCallback } from 'react';

const TOUR_SEEN_KEY = 'meo_tour_seen';

export function useTour() {
  const [run, setRun] = useState(false);

  // Auto-start on first login — only after mount (localStorage is client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(TOUR_SEEN_KEY);
    if (!seen) {
      // Small delay so the UI has rendered before Joyride measures targets
      const t = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const markSeen = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOUR_SEEN_KEY, '1');
    }
    setRun(false);
  }, []);

  const resetTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOUR_SEEN_KEY);
    }
    setRun(true);
  }, []);

  return { run, markSeen, resetTour };
}
