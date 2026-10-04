'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RecordHome, ThisReadingPanel, RecordResponse } from '@/components/record/RecordHome';
import { getValidIdToken } from '@/app/lib/auth';

/**
 * The app's home is the patient's record.
 *
 * This used to render the chat. The product is a trend — "a test tells you
 * where you are, a trend tells you where you're going" — and a trend product
 * whose landing page is a chat box reads as a chatbot with health features
 * bolted on. Chat moved to /chat; it did not shrink, it just stopped being
 * the room you stand in.
 *
 * The fetch lives here rather than inside RecordHome because two columns need
 * the same record and neither should ask for it twice.
 */
export default function Home() {
  const [record, setRecord] = useState<RecordResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) return setState('error');
        const res = await fetch('/api/readings', {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      askContext={record?.latest?.series}
      rightPanel={record && state === 'ready' ? <ThisReadingPanel record={record} /> : undefined}
    >
      <div className="w-full px-7 py-8">
        <header className="mb-6">
          <h1 className="t-head font-bold">Your record</h1>
          <p className="t-lead mt-1 opacity-70">
            A test tells you where you are. A trend tells you where you&apos;re going.
          </p>
        </header>
        <RecordHome record={record} state={state} />
      </div>
    </AppShell>
  );
}

