'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getIdToken } from '@/app/lib/auth';
import { getListings, getClinicianBookings } from './store';
import { LensSwitcher } from './LensSwitcher';
import { PanelTiles, PanelRows, PanelRow } from './PanelTriage';

interface TriagePatient {
  session_id: string;
  name: string;
  days_since_last_message: number | null;
  unfollowed_commitments: number;
  recent_activity_7d: number;
  urgency_level: 'high' | 'medium' | 'low';
  urgency_reason: string;
  signal_tags: string[];
  tags: string[];
}

// ─── Signal pill colours ──────────────────────────────────────────────────────

function pillStyle(tag: string): { bg: string; fg: string; bd: string } {
  const t = tag.toLowerCase();
  if (t.includes('inactive') || t.includes('bas drop') || t.includes('risk'))
    return { bg: 'rgba(248,113,113,.1)', fg: '#f97316', bd: 'rgba(248,113,113,.3)' };
  if (t.includes('commitment') || t.includes('unanswered') || t.includes('sleep'))
    return { bg: 'rgba(245,158,11,.1)', fg: '#eab839', bd: 'rgba(245,158,11,.3)' };
  if (t.includes('protocol') || t.includes('on track'))
    return { bg: 'rgba(164,214,94,.09)', fg: '#a4d65e', bd: 'rgba(164,214,94,.3)' };
  return { bg: 'rgba(255,255,255,.07)', fg: '#c3d0d0', bd: 'rgba(255,255,255,.15)' };
}

const URGENCY_CFG = {
  high:   { dot: '#f97316', halo: 'rgba(248,113,113,.14)', cardBg: 'rgba(248,113,113,.07)', cardBd: 'rgba(248,113,113,.22)', edge: '#f97316' },
  medium: { dot: '#eab839', halo: 'rgba(245,158,11,.12)',  cardBg: 'rgba(40,70,70,.82)',     cardBd: 'rgba(255,255,255,.12)',   edge: 'rgba(245,158,11,.55)' },
  low:    { dot: '#a4d65e', halo: 'rgba(164,214,94,.12)',  cardBg: 'rgba(40,70,70,.82)',     cardBd: 'rgba(255,255,255,.12)',   edge: 'rgba(164,214,94,.4)' },
};

function dayLabel(d: number | null) {
  if (d === null) return 'No activity';
  if (d === 0) return 'Today';
  return `${d}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [triage, setTriage] = useState<TriagePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const listings = getListings();
  const bookings = getClinicianBookings();

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch('/api/patients/panel', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (Array.isArray(data)) setTriage(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flagged = triage.filter((p) => p.urgency_level !== 'low');
  const upcomingBookings = bookings.filter((b) => b.status === 'upcoming').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const nextBooking = upcomingBookings[0];

  const goPatient = (sessionId: string) => {
    router.push(`/clinician/patients?selected=${sessionId}`);
  };

  return (
    // Scrollable main pane — scroll is HERE, not on the root
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px 40px 44px' }}>

      {/* Greeting */}
      <h1 style={{ margin: 0, fontSize: 29, fontWeight: 800, letterSpacing: '-.025em', color: '#ffffff' }}>{greeting}</h1>
      <div style={{ marginTop: 7, fontSize: 14, color: '#a3b4b4' }}>
        {dateStr} · {upcomingBookings.length || 0} sessions booked this week
      </div>

      {/* Lens — the practitioner half of "one record, three lenses". */}
      <div style={{ marginTop: 22, padding: '16px 20px', borderRadius: 10, background: 'rgba(40,70,70,.55)', border: '1px solid rgba(255,255,255,.12)' }}>
        <LensSwitcher />
      </div>

      {/* Lens — the practitioner half of "one record, three lenses". */}
      <div style={{ marginTop: 22, padding: '16px 20px', borderRadius: 10, background: 'rgba(40,70,70,.55)', border: '1px solid rgba(255,255,255,.12)' }}>
        <LensSwitcher />
      </div>

      {/* The frame's five tiles. */}
      <div style={{ marginTop: 18 }}>
        <PanelTiles rows={triage as PanelRow[]} />
      </div>

      {/* Panel header — the ordering is the feature, so it is labelled. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
          Sorted by what changed since you last looked
        </div>
        <span
          style={{
            fontSize: 12, fontWeight: 600, color: '#c3d0d0', background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
          }}
        >
          Not alphabetical
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#a3b4b4' }}>
          {loading ? 'Updating…' : `${triage.length} client${triage.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 62, borderRadius: 10, background: 'rgba(40,70,70,.5)', border: '1px solid rgba(255,255,255,.08)', marginBottom: 7 }} />
          ))
        ) : (
          <PanelRows rows={triage as PanelRow[]} />
        )}
      </div>

      {/* All-clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, padding: 20, borderRadius: 10, border: '1px dashed rgba(255,255,255,.13)', color: 'rgba(255,255,255,.42)', fontSize: 13 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        {loading ? 'Loading panel…' : flagged.length === 0 ? 'All patients up to date — nothing needs your attention' : 'All other patients are up to date'}
      </div>
    </main>
  );
}
