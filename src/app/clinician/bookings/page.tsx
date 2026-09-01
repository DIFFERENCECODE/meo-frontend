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
  upcoming:  { bg: 'rgba(164,214,94,.16)',  fg: '#a4d65e' },
  completed: { bg: 'rgba(74,222,128,.16)',  fg: '#4ade80' },
  cancelled: { bg: 'rgba(248,113,113,.16)', fg: '#f87171' },
  'no-show': { bg: 'rgba(245,158,11,.16)',  fg: '#f5b942' },
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
      <div style={{ marginTop: 7, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Sessions booked through your MeO listings</div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{ cursor: 'pointer', padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: active ? 'rgba(164,214,94,.14)' : 'transparent', border: `1px solid ${active ? 'rgba(164,214,94,.55)' : 'rgba(255,255,255,.16)'}`, color: active ? '#a4d65e' : 'rgba(255,255,255,.65)' }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ marginTop: 20, borderRadius: 12, background: 'rgba(40,70,70,.8)', border: '1px solid rgba(255,255,255,.1)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.5fr 1.3fr .9fr .7fr', gap: 16, padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.1)', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>
          <div>Patient</div><div>Service</div><div>Date &amp; time</div><div>Status</div><div />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 22px', textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 13 }}>
            {bookings.length === 0 ? 'No bookings yet — add listings so patients can book sessions.' : `No ${filter} bookings.`}
          </div>
        ) : (
          filtered.map((b) => {
            const badge = STATUS_BADGE[b.status];
            const inits = initials(b.patientName);
            return (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.5fr 1.3fr .9fr .7fr', gap: 16, alignItems: 'center', padding: '15px 22px', borderBottom: '1px solid rgba(255,255,255,.06)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 999, background: 'rgba(164,214,94,.16)', color: '#a4d65e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700 }}>{inits}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.patientName}</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.patientEmail}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.listingTitle}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>{formatDate(b.scheduledDate, b.scheduledTime)}</div>
                <div>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: 999, background: badge.bg, color: badge.fg }}>{b.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setSelected(b)} style={{ cursor: 'pointer', padding: '7px 16px', borderRadius: 999, background: 'none', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.8)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#a4d65e'; e.currentTarget.style.borderColor = 'rgba(164,214,94,.6)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'; }}
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
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, borderRadius: 16, background: '#22494a', border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.7)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 999, background: 'rgba(164,214,94,.16)', color: '#a4d65e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{initials(selected.patientName)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.patientName}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{selected.patientEmail}</div>
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
                  <div key={label} style={{ padding: '13px 15px', borderRadius: 11, background: 'rgba(20,45,45,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{value}</div>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div style={{ padding: '13px 15px', borderRadius: 11, background: 'rgba(20,45,45,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: 6 }}>Patient notes</div>
                  <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <button style={{ flex: 1, cursor: 'pointer', padding: '11px', border: 0, borderRadius: 999, background: '#a4d65e', color: '#123030', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Open in MeO
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
              </button>
              <button onClick={() => setSelected(null)} style={{ padding: '11px 20px', borderRadius: 999, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.5)', color: '#f87171', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel booking
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
