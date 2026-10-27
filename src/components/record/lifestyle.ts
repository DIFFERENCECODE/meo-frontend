'use client';

import React from 'react';

/** One day of meals, from the food log. Times are London "HH:MM". */
export interface NutritionDay {
  date: string;
  first: string | null;
  last: string | null;
  dinner: string | null;
  kcal: number | null;
  protein: number | null;
  meals: number;
}

/** One day of steps and sleep, from the phone. */
export interface ActivityDay {
  date: string;
  steps: number | null;
  sleep_hours: number | null;
}

export interface Lifestyle {
  nutrition: {
    status: string;
    days_logged?: number;
    dinner_median?: string | null;
    daily?: NutritionDay[];
  };
  activity: {
    status: string;
    steps_avg?: number | null;
    steps_days?: number;
    sleep_avg_hours?: number | null;
    sleep_nights?: number;
    short_nights?: number;
    daily?: ActivityDay[];
  };
}

/**
 * The patient's own sleep, steps and meals (GET /api/me/lifestyle), counted
 * from what the phone and the food log sent. Null while loading or when it
 * could not be read; callers say "nothing from the app yet" either way.
 */
export function useMyLifestyle(days = 14): Lifestyle | null {
  const [data, setData] = React.useState<Lifestyle | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const { getValidIdToken } = await import('@/app/lib/auth');
        const token = await getValidIdToken();
        if (!token) return;
        const res = await fetch(`/api/me/lifestyle?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
      } catch {
        /* the row says nothing arrived */
      }
    })();
  }, [days]);
  return data;
}

/** 6.2 hours as "6h 12m". */
export function fmtHours(h: number): string {
  const whole = Math.floor(h);
  const m = Math.round((h - whole) * 60);
  return m ? `${whole}h ${m}m` : `${whole}h`;
}
