'use client';

/**
 * Your panel (storyboard p00).
 *
 * The ordering is the feature, so it is labelled on the screen: sorted by what
 * changed since the practitioner last looked, not alphabetically. The rows come
 * from the shared caseload (panel-context), so the sidebar's "Needs review"
 * count is always this screen's count.
 */

import React from 'react';
import { getClinicianBookings } from './store';
import { PanelTiles, PanelRows } from './PanelTriage';
import { usePanel } from './panel-context';
import { Fortnight } from './Fortnight';
import { PageHeader, Pill, Screen, T } from './ui';

function ago(d: Date | null) {
  if (!d) return '';
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  return m < 1 ? 'Updated just now' : `Updated ${m} min ago`;
}

export default function PanelPage() {
  const { rows, loading, loadedAt } = usePanel();

  // Bookings still live in this browser (store.ts) until the booking API exists,
  // so the tile counts what is there and says where it came from.
  const weekAhead = Date.now() + 7 * 86400000;
  const consults = getClinicianBookings().filter((b) => {
    const t = new Date(b.scheduledDate).getTime();
    return b.status === 'upcoming' && t >= Date.now() - 86400000 && t <= weekAhead;
  }).length;

  return (
    <Screen
      header={
        <PageHeader
          title="Your panel"
          sub={`${rows.length} client${rows.length === 1 ? '' : 's'} · the twelve weeks between visits`}
        />
      }
    >
      <Fortnight rows={rows} />
      <PanelTiles rows={rows} consults={consults} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Sorted by what changed since you last looked</h2>
        <Pill>Not alphabetical</Pill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: T.dim }}>{loading ? 'Updating…' : ago(loadedAt)}</span>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 60, borderRadius: 12, background: T.row, border: `1px solid ${T.rowBorder}` }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '18px 20px', borderRadius: 12, background: T.row, border: `1px solid ${T.rowBorder}`, fontSize: 13.5, color: T.muted }}>
          No patients are linked to you yet. Your panel shows the patients linked to your
          account, and no one else&apos;s.
        </div>
      ) : (
        <PanelRows rows={rows} />
      )}
    </Screen>
  );
}
