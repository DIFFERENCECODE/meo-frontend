'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Step } from 'react-joyride';
import { ProductTour } from './ProductTour';
import { SCREEN_TOURS } from './tourSteps';

export const TOUR_EVENT = 'meo:tour';

/**
 * The situational tour: each screen explains itself the first time a person
 * opens it. Settings > Take the tour fires TOUR_EVENT to replay the current
 * screen's tour. Steps whose element is not on screen are dropped, so a tour
 * only ever points at something that is there.
 */
export function ScreenTour() {
  const path = usePathname() || '/';
  const [steps, setSteps] = useState<Step[]>([]);
  const [run, setRun] = useState(false);
  const key = `meo_tour_seen:${path}`;

  const start = useCallback(() => {
    const all = SCREEN_TOURS[path] ?? [];
    const present = all.filter((st) => typeof st.target === 'string' && document.querySelector(st.target));
    if (present.length === 0) return;
    setSteps(present);
    setRun(true);
  }, [path]);

  useEffect(() => {
    setRun(false);
    if (!SCREEN_TOURS[path]) return;
    let seen = true;
    try { seen = !!localStorage.getItem(key); } catch { /* private window: don't nag */ }
    if (seen) return;
    // Wait for the screen's data so the steps have something to point at.
    const t = setTimeout(start, 1600);
    return () => clearTimeout(t);
  }, [path, key, start]);

  useEffect(() => {
    const on = () => start();
    window.addEventListener(TOUR_EVENT, on);
    return () => window.removeEventListener(TOUR_EVENT, on);
  }, [start]);

  const finish = useCallback(() => {
    try { localStorage.setItem(key, '1'); } catch { /* fine */ }
    setRun(false);
  }, [key]);

  if (!run || steps.length === 0) return null;
  return <ProductTour run={run} onFinish={finish} steps={steps} />;
}

export default ScreenTour;
