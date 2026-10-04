'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Globe, Hospital, Check, Minus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useTheme } from '@/theme/ThemeProvider';
import { getValidIdToken } from '@/app/lib/auth';

/**
 * Connectors — read-only on web, by design.
 *
 * A browser cannot pair a meter or hold a Health Connect permission, so this
 * page does not pretend to connect anything. What it can do honestly is answer
 * the question a patient is actually asking — "is my data arriving?" — by
 * reporting what has reached the record.
 *
 * The distinction matters enough to print on the page: "connected" here means
 * data of that kind exists, not that a handshake succeeded. And where the web
 * genuinely cannot see (the phone's health data), the count is null and shown
 * as unavailable rather than as a zero, because a zero is a claim.
 */
interface Source {
  id: string;
  label: string;
  detail: string;
  count: number | null;
  last_seen: string | null;
  connect_on: 'phone' | 'web' | 'clinic' | string;
}

const WHERE: Record<string, { label: string; Icon: typeof Smartphone }> = {
  phone: { label: 'Set up on your phone', Icon: Smartphone },
  web: { label: 'Entered here', Icon: Globe },
  clinic: { label: 'Comes from your clinic', Icon: Hospital },
};

function ConnectorsInner() {
  const { colors } = useTheme();
  const [sources, setSources] = useState<Source[] | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) return setState('error');
        const res = await fetch('/api/me/connectors', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return setState('error');
        const data = await res.json();
        setSources(data.sources || []);
        setNote(data.note || '');
        setState('ready');
      } catch {
        setState('error');
      }
    })();
  }, []);

  return (
    <div className="w-full px-7 py-8">
      <header className="mb-6">
        <h1 className="t-head font-bold">Connectors</h1>
        <p className="t-lead mt-1" style={{ color: colors.muted }}>
          Where your record gets its data, and whether anything has arrived.
        </p>
      </header>

      {state === 'loading' && <p className="t-lead opacity-70">Checking your sources…</p>}
      {state === 'error' && <p className="t-lead opacity-70">Couldn&apos;t load your connectors.</p>}

      {state === 'ready' && sources && (
        <>
          <ul className="space-y-3 p-0 m-0">
            {sources.map((s) => {
              const where = WHERE[s.connect_on] ?? WHERE.phone;
              const { Icon } = where;
              const unknown = s.count === null;
              const has = !unknown && (s.count ?? 0) > 0;
              return (
                <li
                  key={s.id}
                  className="rounded-2xl p-4 list-none flex items-start gap-3"
                  style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
                >
                  <div
                    className="h-9 w-9 shrink-0 rounded-[10px] flex items-center justify-center"
                    style={{ backgroundColor: has ? 'rgba(164,214,94,0.12)' : 'rgba(255,255,255,0.05)' }}
                  >
                    {has ? (
                      <Check className="h-4 w-4" style={{ color: colors.primary }} />
                    ) : (
                      <Minus className="h-4 w-4" style={{ color: colors.muted }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="t-lead font-semibold">{s.label}</p>
                    <p className="t-body2 mt-0.5" style={{ color: colors.muted }}>{s.detail}</p>
                    <p className="t-body2 mt-2" style={{ color: has ? colors.primary : colors.muted }}>
                      {unknown
                        ? 'Not visible from the web — check in the app'
                        : has
                          ? `${s.count} on your record${s.last_seen ? ` · latest ${s.last_seen}` : ''}`
                          : 'Nothing on your record yet'}
                    </p>
                    <p className="t-body2 mt-1.5 flex items-center gap-1.5" style={{ color: colors.muted }}>
                      <Icon className="h-3.5 w-3.5" /> {where.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="t-body2 mt-5 leading-relaxed" style={{ color: colors.muted }}>
            {note}
          </p>
        </>
      )}
    </div>
  );
}

export default function ConnectorsPage() {
  return (
    <AppShell askPlaceholder="Ask MeO about your data…">
      <ConnectorsInner />
    </AppShell>
  );
}
