'use client';

import React, { useEffect, useState } from 'react';
import {
  Smartphone, Hospital, HeartPulse, FlaskConical, Utensils,
  PencilLine, Activity, Droplets, Flame,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useTheme } from '@/theme/ThemeProvider';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';
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
  status: 'connected' | 'available' | 'planned' | string;
  status_text: string;
  connect_on: 'phone' | 'web' | 'clinic' | string;
}

const ICON: Record<string, typeof Smartphone> = {
  apple_health: HeartPulse, meter: FlaskConical, food_log: Utensils,
  clinic: Hospital, typed: PencilLine, health_connect: Activity,
  samsung: Smartphone, cgm: Droplets, ketone: Flame,
};

function ConnectorsInner() {
  const { colors } = useTheme();
  const [sources, setSources] = useState<Source[] | null>(null);
  const [note, setNote] = useState('');
  const [sharingNote, setSharingNote] = useState('');
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
        setSharingNote(data.sharing_note || '');
        setState('ready');
      } catch {
        setState('error');
      }
    })();
  }, []);

  const live = (sources ?? []).filter((s) => s.status === 'connected').length;

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title="Connectors"
        subtitle="Everything MeO can read from — connections are made in the app"
        right={
          <span
            style={{
              display: 'inline-block', fontSize: 14, fontWeight: 700, color: colors.primary,
              background: 'rgba(var(--mc-accent-rgb),0.12)', border: '1px solid rgba(var(--mc-accent-rgb),0.3)',
              borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
            }}
          >
            {live} live
          </span>
        }
      />

      <ScreenBody gap={18}>
        {state === 'loading' && <p style={{ fontSize: 15, color: colors.muted }}>Checking your sources…</p>}
        {state === 'error' && <p style={{ fontSize: 15, color: colors.muted }}>Couldn&apos;t load your connectors.</p>}

        {state === 'ready' && sources && (
          <div className="flex" style={{ gap: 18, alignItems: 'flex-start' }}>
            {/* Source list — frame geometry: 38px icon at radius 11, 14px rows,
                hairline at 0.07, status right-aligned with a 9px dot. */}
            <div
              className="flex-1 min-w-0"
              style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '8px 22px 18px' }}
            >
              {sources.map((s, i) => {
                const Icon = ICON[s.id] ?? Smartphone;
                const on = s.status === 'connected';
                const planned = s.status === 'planned';
                return (
                  <div
                    key={s.id}
                    className="flex items-center"
                    style={{
                      gap: 14, padding: '14px 0',
                      borderBottom: i === sources.length - 1 ? undefined : '1px solid rgba(var(--mc-fg-rgb),0.07)',
                      opacity: planned ? 0.72 : 1,
                    }}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{ width: 38, height: 38, flex: 'none', borderRadius: 11, background: 'rgba(var(--mc-fg-rgb),0.06)' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: on ? colors.primary : colors.mutedDim }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 16, fontWeight: 600, color: colors.foreground }}>{s.label}</div>
                      <div style={{ fontSize: 14, color: colors.mutedDim, marginTop: 2 }}>{s.detail}</div>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: on ? colors.primary : colors.mutedDim, textAlign: 'right' }}>
                      {s.status_text}
                    </div>
                    {on && (
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: colors.primary, marginLeft: 4, flex: 'none' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right column — the frame's two explanations. */}
            <div style={{ width: 340, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 20px' }}>
                <div className="t-label" style={{ color: colors.mutedDim }}>Why connections live in the app</div>
                <p style={{ fontSize: 15, color: colors.muted, lineHeight: 1.55, marginTop: 9 }}>{note}</p>
              </div>
              <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 20px' }}>
                <div className="t-label" style={{ color: colors.mutedDim }}>Sharing</div>
                <p style={{ fontSize: 15, color: colors.muted, lineHeight: 1.55, marginTop: 9 }}>{sharingNote}</p>
              </div>
            </div>
          </div>
        )}
      </ScreenBody>
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
