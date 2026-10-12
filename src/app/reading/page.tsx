'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ReadingComplete } from '@/components/record/ReadingComplete';
import { ThisReadingPanel, RecordResponse } from '@/components/record/RecordHome';
import { getValidIdToken } from '@/app/lib/auth';

/**
 * Where a finished guided test lands.
 *
 * Its own route rather than a state inside the test, because the result of a
 * reading outlives the sitting that produced it: a patient comes back to this,
 * links to it, and shows it to someone. A screen you can only reach by
 * finishing a test is a screen you can never return to.
 */
export default function ReadingPage() {
  const [record, setRecord] = useState<RecordResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) return setState('error');
        const res = await fetch('/api/readings', { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 404) return setState('empty');
        if (!res.ok) return setState('error');
        const data: RecordResponse = await res.json();
        setRecord(data);
        setState(data.panel_count === 0 ? 'empty' : 'ready');
      } catch {
        setState('error');
      }
    })();
  }, []);

  return (
    <AppShell
      askPlaceholder="Ask MeO about this reading…"
      askContext={record ? JSON.stringify({ latest: record.latest, previous: record.previous, delta: record.delta }) : undefined}
      rightPanel={record && state === 'ready' ? <ThisReadingPanel record={record} /> : undefined}
    >
      {state === 'ready' && record ? (
        <ReadingComplete record={record} />
      ) : (
        <div className="w-full px-7 py-10">
          <p className="t-lead opacity-70">
            {state === 'loading'
              ? 'Loading your reading…'
              : state === 'empty'
                ? 'No readings yet. Your first guided test will land here.'
                : "Couldn't load your reading."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
