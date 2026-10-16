'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getClinicianBookings, type ClinicianBooking } from '../store';

type Filter = 'all' | ClinicianBooking['status'];

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No-show' },
];

const STATUS_BADGE: Record<ClinicianBooking['status'], { bg: string; fg: string }> = {
  upcoming:  { bg: 'rgba(var(--mc-accent-rgb),.16)',  fg: 'var(--mc-accent)' },
  completed: { bg: 'rgba(74,222,128,.16)',  fg: '#4ade80' },
  cancelled: { bg: 'rgba(248,113,113,.16)', fg: 'var(--mc-orange)' },
  'no-show': { bg: 'rgba(245,158,11,.16)',  fg: 'var(--mc-amber)' },
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso: string, time: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${time}`;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<ClinicianBooking[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<ClinicianBooking | null>(null);

  const refresh = useCallback(() => setBookings(getClinicianBookings()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <main style={{ flex: 1, minWidth: 0, position: 'relative', overflowY: 'auto', padding: '34px 40px' }}>

      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-.025em' }}>Bookings</h1>
      <div style={{ marginTop: 7, fontSize: 14, color: 'var(--mc-text)' }}>Sessions booked through your MeO listings</div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{ cursor: 'pointer', padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: active ? 'rgba(var(--mc-accent-rgb),.14)' : 'transparent', border: `1px solid ${active ? 'rgba(var(--mc-accent-rgb),.55)' : 'rgba(var(--mc-fg-rgb),.16)'}`, color: active ? 'var(--mc-accent)' : 'rgba(var(--mc-fg-rgb),.65)' }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ marginTop: 20, borderRadius: 10, background: 'var(--mc-card)', border: '1px solid rgba(var(--mc-fg-rgb),.12)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.5fr 1.3fr .9fr .7fr', gap: 16, padding: '14px 22px', borderBottom: '1px solid rgba(var(--mc-fg-rgb),.12)', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mc-text)' }}>
          <div>Patient</div><div>Service</div><div>Date &amp; time</div><div>Status</div><div />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 22px', textAlign: 'center', color: 'rgba(var(--mc-fg-rgb),.35)', fontSize: 13 }}>
            {bookings.length === 0 ? 'No bookings yet — add listings so patients can book sessions.' : `No ${filter} bookings.`}
          </div>
        ) : (
          filtered.map((b) => {
            const badge = STATUS_BADGE[b.status];
            const inits = initials(b.patientName);
            return (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.5fr 1.3fr .9fr .7fr', gap: 16, alignItems: 'center', padding: '15px 22px', borderBottom: '1px solid rgba(var(--mc-fg-rgb),.06)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--mc-fg-rgb),.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 999, background: 'rgba(var(--mc-accent-rgb),.16)', color: 'var(--mc-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700 }}>{inits}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.patientName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--mc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.patientEmail}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(var(--mc-fg-rgb),.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.listingTitle}</div>
                <div style={{ fontSize: 13, color: 'rgba(var(--mc-fg-rgb),.85)' }}>{formatDate(b.scheduledDate, b.scheduledTime)}</div>
                <div>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: 999, background: badge.bg, color: badge.fg }}>{b.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setSelected(b)} style={{ cursor: 'pointer', padding: '7px 16px', borderRadius: 999, background: 'none', border: '1px solid rgba(var(--mc-fg-rgb),.2)', color: 'var(--mc-text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mc-accent)'; e.currentTarget.style.borderColor = 'rgba(var(--mc-accent-rgb),.6)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mc-text)'; e.currentTarget.style.borderColor = 'rgba(var(--mc-fg-rgb),.2)'; }}
                  >View</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,26,.72)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, borderRadius: 16, background: '#22494a', border: '1px solid rgba(var(--mc-fg-rgb),.14)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.7)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '22px 24px', borderBottom: '1px solid rgba(var(--mc-fg-rgb),.12)' }}>
              <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 999, background: 'rgba(var(--mc-accent-rgb),.16)', color: 'var(--mc-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{initials(selected.patientName)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.patientName}</div>
                <div style={{ fontSize: 12.5, color: 'var(--mc-text)', marginTop: 2 }}>{selected.patientEmail}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: 999, background: STATUS_BADGE[selected.status].bg, color: STATUS_BADGE[selected.status].fg }}>{selected.status}</span>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Service', value: selected.listingTitle },
                  { label: 'Date & time', value: formatDate(selected.scheduledDate, selected.scheduledTime) },
                  { label: 'Price', value: `£${selected.price}` },
                  { label: 'Duration', value: `${selected.duration} mins` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '13px 15px', borderRadius: 11, background: 'rgba(20,45,45,.5)', border: '1px solid rgba(var(--mc-fg-rgb),.12)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mc-text)' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{value}</div>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div style={{ padding: '13px 15px', borderRadius: 11, background: 'rgba(20,45,45,.5)', border: '1px solid rgba(var(--mc-fg-rgb),.12)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mc-text)', marginBottom: 6 }}>Patient notes</div>
                  <div style={{ fontSize: 13.5, color: 'var(--mc-text)', lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(var(--mc-fg-rgb),.12)' }}>
              <button style={{ flex: 1, cursor: 'pointer', padding: '11px', border: 0, borderRadius: 999, background: 'var(--mc-accent)', color: 'var(--mc-on-accent)', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Open in MeO
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
              </button>
              <button onClick={() => setSelected(null)} style={{ padding: '11px 20px', borderRadius: 999, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.5)', color: 'var(--mc-orange)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel booking
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
