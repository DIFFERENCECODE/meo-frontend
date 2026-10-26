'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Timeline, DataSources } from '@/components/record/Timeline';
import { RecordResponse } from '@/components/record/RecordHome';
import { getValidIdToken } from '@/app/lib/auth';

/**
 * The record in one chronological order, with its sources beside it.
 *
 * Separate from /trends because they answer different questions: a trend asks
 * where a number is going, a timeline asks what happened and who said so.
 */
export default function TimelinePage() {
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
        setState(data.reading_count === 0 ? 'empty' : 'ready');
      } catch {
        setState('error');
      }
    })();
  }, []);

  return (
    <AppShell
      askPlaceholder="Ask MeO about any day…"
      askContext={record ? JSON.stringify({ readings: record.readings.slice(0, 12) }) : undefined}
      rightPanelLabel="Where your data comes from"
      rightPanel={record && state === 'ready' ? <DataSources record={record} /> : undefined}
    >
      {state === 'ready' && record ? (
        <Timeline record={record} />
      ) : (
        <div className="w-full px-7 py-10">
          <p className="t-lead opacity-70">
            {state === 'loading'
              ? 'Loading your timeline…'
              : state === 'empty'
                ? 'Nothing on your record yet. Your first guided test starts it.'
                : "Couldn't load your timeline."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
