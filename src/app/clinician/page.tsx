'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getIdToken } from '@/app/lib/auth';
import { getListings, getClinicianBookings } from './store';

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
    return { bg: 'rgba(248,113,113,.1)', fg: '#f87171', bd: 'rgba(248,113,113,.3)' };
  if (t.includes('commitment') || t.includes('unanswered') || t.includes('sleep'))
    return { bg: 'rgba(245,158,11,.1)', fg: '#f5b942', bd: 'rgba(245,158,11,.3)' };
  if (t.includes('protocol') || t.includes('on track'))
    return { bg: 'rgba(164,214,94,.09)', fg: '#a4d65e', bd: 'rgba(164,214,94,.3)' };
  return { bg: 'rgba(255,255,255,.07)', fg: 'rgba(255,255,255,.7)', bd: 'rgba(255,255,255,.15)' };
}

const URGENCY_CFG = {
  high:   { dot: '#f87171', halo: 'rgba(248,113,113,.14)', cardBg: 'rgba(248,113,113,.07)', cardBd: 'rgba(248,113,113,.22)', edge: '#f87171' },
  medium: { dot: '#f5b942', halo: 'rgba(245,158,11,.12)',  cardBg: 'rgba(40,70,70,.8)',     cardBd: 'rgba(255,255,255,.1)',   edge: 'rgba(245,158,11,.55)' },
  low:    { dot: '#a4d65e', halo: 'rgba(164,214,94,.12)',  cardBg: 'rgba(40,70,70,.8)',     cardBd: 'rgba(255,255,255,.1)',   edge: 'rgba(164,214,94,.4)' },
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
      <h1 style={{ margin: 0, fontSize: 29, fontWeight: 800, letterSpacing: '-.025em' }}>{greeting}</h1>
      <div style={{ marginTop: 7, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>
        {dateStr} · {upcomingBookings.length || 0} sessions booked this week
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 24 }}>

        {/* Active patients */}
        <div onClick={() => router.push('/clinician/patients')} style={{ background: 'rgba(40,70,70,.8)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '18px 20px', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(164,214,94,.4)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(164,214,94,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a4d65e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
            </div>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 14, lineHeight: 1, color: '#a4d65e' }}>{loading ? '…' : triage.length}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 7 }}>Active patients</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{flagged.length} flagged today</div>
        </div>

        {/* Listings */}
        <div onClick={() => router.push('/clinician/listings')} style={{ background: 'rgba(40,70,70,.8)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '18px 20px', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,.5)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b8df6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h12M9 12h12M9 18h12M3 6l1.4 1.4L7 5M3 12l1.4 1.4L7 11M3 18l1.4 1.4L7 17"/></svg>
            </div>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 14, lineHeight: 1, color: '#8b8df6' }}>{listings.length}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 7 }}>Listings</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{listings.filter((l) => l.isActive).length} active · {listings.filter((l) => !l.isActive).length} draft</div>
        </div>

        {/* Bookings */}
        <div onClick={() => router.push('/clinician/bookings')} style={{ background: 'rgba(40,70,70,.8)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '18px 20px', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(245,158,11,.5)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(245,158,11,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5b942" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v16H4zM4 10h16M9 3v4M15 3v4"/></svg>
            </div>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 14, lineHeight: 1, color: '#f5b942' }}>{upcomingBookings.length}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 7 }}>Upcoming bookings</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>
            {nextBooking ? `Next: ${nextBooking.scheduledDate}, ${nextBooking.scheduledTime}` : 'No upcoming sessions'}
          </div>
        </div>
      </div>

      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 30 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-.015em' }}>Your Panel</h2>
          <div style={{ marginTop: 5, fontSize: 13.5, color: 'rgba(255,255,255,.6)' }}>Patients needing attention today</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
            {(['high', 'medium', 'low'] as const).map((u) => (
              <span key={u} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: URGENCY_CFG[u].dot, display: 'block' }} />
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </span>
            ))}
          </div>
          <button onClick={() => router.push('/clinician/patients')} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 0, color: '#a4d65e', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Open workspace
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>

      {/* Triage rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 74, borderRadius: 12, background: 'rgba(40,70,70,.5)', border: '1px solid rgba(255,255,255,.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))
        ) : flagged.length === 0 ? null : (
          flagged.map((p) => {
            const cfg = URGENCY_CFG[p.urgency_level];
            const tags = p.signal_tags?.length ? p.signal_tags : p.tags;
            const displayTags = tags.slice(0, 3);
            const inits = (p.name || p.session_id).slice(0, 2).toUpperCase();
            return (
              <button
                key={p.session_id}
                onClick={() => goPatient(p.session_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 15, width: '100%', textAlign: 'left', cursor: 'pointer', padding: '15px 20px', borderRadius: 12, color: '#fff', background: cfg.cardBg, border: `1px solid ${cfg.cardBd}`, borderLeft: `3px solid ${cfg.edge}`, fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(52,86,86,.9)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = cfg.cardBg)}
              >
                <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: 999, background: cfg.dot, boxShadow: `0 0 0 4px ${cfg.halo}`, display: 'block' }} />
                <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 999, background: 'rgba(164,214,94,.16)', color: '#a4d65e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700 }}>{inits}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name || 'Anonymous'}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 3 }}>{p.urgency_reason}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {displayTags.map((tag) => {
                    const ps = pillStyle(tag);
                    return <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 999, background: ps.bg, color: ps.fg, border: `1px solid ${ps.bd}`, whiteSpace: 'nowrap' }}>{tag}</span>;
                  })}
                </div>
                <div style={{ flexShrink: 0, width: 78, textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.7)' }}>
                    {dayLabel(p.days_since_last_message)}
                  </span>
                </div>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
              </button>
            );
          })
        )}
      </div>

      {/* All-clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, padding: 20, borderRadius: 12, border: '1px dashed rgba(255,255,255,.13)', color: 'rgba(255,255,255,.42)', fontSize: 13 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        {loading ? 'Loading panel…' : flagged.length === 0 ? 'All patients up to date — nothing needs your attention' : 'All other patients are up to date'}
      </div>
    </main>
  );
}
