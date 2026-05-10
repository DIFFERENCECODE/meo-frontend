'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getClinicianBookings, saveClinicianBooking, updateBookingStatus, deleteClinicianBooking, getListings, type ClinicianBooking } from '../store';
import { CalendarDays, Plus, Check, Trash2, Clock, PoundSterling, User, ChevronDown } from 'lucide-react';

type StatusFilter = 'all' | 'upcoming' | 'completed' | 'cancelled' | 'no-show';

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#a4d65e', completed: '#22c55e', cancelled: '#ef4444', 'no-show': '#f59e0b',
};

// ─── New Booking Modal ────────────────────────────────────────────────────────

function BookingModal({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const { colors } = useTheme();
  const listings = getListings();
  const [form, setForm] = useState({
    patientName: '', patientEmail: '', listingTitle: '',
    scheduledDate: '', scheduledTime: '', price: '', duration: '60', notes: '',
  });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleListingChange = (title: string) => {
    const listing = listings.find((l) => l.title === title);
    set('listingTitle', title);
    if (listing) {
      setForm((p) => ({ ...p, listingTitle: title, price: String(listing.price), duration: String(listing.duration) }));
    }
  };

  const submit = () => {
    if (!form.patientName.trim()) { setError('Patient name is required.'); return; }
    if (!form.scheduledDate) { setError('Please select a date.'); return; }
    if (!form.scheduledTime) { setError('Please select a time.'); return; }
    if (!form.listingTitle) { setError('Please select a service.'); return; }
    saveClinicianBooking({
      patientName: form.patientName.trim(),
      patientEmail: form.patientEmail.trim(),
      listingTitle: form.listingTitle,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      price: Number(form.price) || 0,
      duration: Number(form.duration) || 60,
      notes: form.notes,
    });
    onSave();
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(255,255,255,0.15)`,
    color: colors.foreground, fontSize: '16px',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: colors.cardBorder }}>
          <h2 className="text-base font-semibold" style={{ color: colors.foreground }}>Log Booking</h2>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: colors.muted, background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Patient name <span style={{ color: colors.primary }}>*</span></label>
              <input value={form.patientName} onChange={(e) => set('patientName', e.target.value)}
                placeholder="Jane Smith" className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Patient email</label>
              <input type="email" value={form.patientEmail} onChange={(e) => set('patientEmail', e.target.value)}
                placeholder="jane@example.com" className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Service <span style={{ color: colors.primary }}>*</span></label>
            <select value={form.listingTitle} onChange={(e) => handleListingChange(e.target.value)}
              className="w-full px-3 py-3 rounded-lg outline-none appearance-none" style={{ ...inputStyle, color: form.listingTitle ? colors.foreground : 'rgba(255,255,255,0.4)' }}>
              <option value="">Select service…</option>
              {listings.map((l) => <option key={l.id} value={l.title} style={{ background: '#1a3a3a' }}>{l.title}</option>)}
              <option value="Other" style={{ background: '#1a3a3a' }}>Other / Ad hoc</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Date <span style={{ color: colors.primary }}>*</span></label>
              <input type="date" value={form.scheduledDate} onChange={(e) => set('scheduledDate', e.target.value)}
                className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Time <span style={{ color: colors.primary }}>*</span></label>
              <input type="time" value={form.scheduledTime} onChange={(e) => set('scheduledTime', e.target.value)}
                className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Price (£)</label>
              <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)}
                placeholder="120" className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Duration (min)</label>
              <input type="number" min="1" value={form.duration} onChange={(e) => set('duration', e.target.value)}
                placeholder="60" className="w-full px-3 py-3 rounded-lg outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              placeholder="Session notes, prep instructions…"
              className="w-full px-3 py-3 rounded-lg outline-none resize-none" style={inputStyle} />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor: colors.cardBorder }}>
          <button onClick={submit}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: colors.primary, color: colors.primaryForeground }}>
            <Check className="h-4 w-4" /> Save Booking
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bookings Page ────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState<ClinicianBooking[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [showModal, setShowModal] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = () => setBookings(getClinicianBookings());
  useEffect(refresh, []);

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  const counts: Record<StatusFilter, number> = {
    all: bookings.length,
    upcoming: bookings.filter((b) => b.status === 'upcoming').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    'no-show': bookings.filter((b) => b.status === 'no-show').length,
  };

  const TABS: StatusFilter[] = ['all', 'upcoming', 'completed', 'cancelled', 'no-show'];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.foreground }}>Bookings</h1>
          <p className="text-sm" style={{ color: colors.muted }}>{bookings.length} total session{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{ background: colors.primary, color: colors.primaryForeground }}
        >
          <Plus className="h-4 w-4" /> Log Booking
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              background: filter === t ? `${colors.primary}20` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filter === t ? `${colors.primary}50` : 'rgba(255,255,255,0.1)'}`,
              color: filter === t ? colors.primary : colors.muted,
            }}>
            <span className="capitalize">{t.replace('-', ' ')}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="rounded-xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarDays className="h-10 w-10 mx-auto opacity-25" style={{ color: colors.muted }} />
            <p className="text-sm" style={{ color: colors.muted }}>
              {filter === 'all' ? 'No bookings yet. Use "Log Booking" to add one.' : `No ${filter} bookings.`}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: colors.cardBorder }}>
            {filtered.map((b) => {
              const isOpen = openId === b.id;
              const statusColor = STATUS_COLORS[b.status] ?? '#94a3b8';
              return (
                <div key={b.id}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : b.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left transition-all hover:bg-white/5"
                  >
                    {/* Date block */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-lg font-bold leading-none" style={{ color: colors.foreground }}>
                        {b.scheduledDate ? new Date(b.scheduledDate).getDate() : '—'}
                      </p>
                      <p className="text-xs uppercase" style={{ color: colors.muted }}>
                        {b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString('en-GB', { month: 'short' }) : ''}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: colors.foreground }}>{b.patientName}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{ background: `${statusColor}18`, color: statusColor }}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: colors.muted }}>
                        {b.listingTitle} · {b.scheduledTime} · {b.duration} min · £{b.price}
                      </p>
                    </div>

                    <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: colors.muted }} />
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-5 pb-4 space-y-3" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                      <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { icon: User, label: 'Patient', value: b.patientName },
                          { icon: CalendarDays, label: 'Date & Time', value: `${b.scheduledDate} ${b.scheduledTime}` },
                          { icon: Clock, label: 'Duration', value: `${b.duration} min` },
                          { icon: PoundSterling, label: 'Price', value: `£${b.price}` },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-xs mb-1 flex items-center gap-1" style={{ color: colors.muted }}>
                              <Icon className="h-3 w-3" /> {label}
                            </p>
                            <p className="text-sm font-medium" style={{ color: colors.foreground }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {b.notes && (
                        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <p className="text-xs mb-1" style={{ color: colors.muted }}>Notes</p>
                          <p className="text-sm" style={{ color: colors.foreground }}>{b.notes}</p>
                        </div>
                      )}

                      {/* Status actions */}
                      <div className="flex flex-wrap gap-2">
                        {b.status === 'upcoming' && (
                          <>
                            <button onClick={() => { updateBookingStatus(b.id, 'completed'); refresh(); }}
                              className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                              <Check className="h-3.5 w-3.5" /> Mark completed
                            </button>
                            <button onClick={() => { updateBookingStatus(b.id, 'no-show'); refresh(); }}
                              className="text-xs px-3 py-1.5 rounded-lg"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                              No-show
                            </button>
                            <button onClick={() => { updateBookingStatus(b.id, 'cancelled'); refresh(); }}
                              className="text-xs px-3 py-1.5 rounded-lg"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                              Cancel
                            </button>
                          </>
                        )}
                        {b.status !== 'upcoming' && (
                          <button onClick={() => { updateBookingStatus(b.id, 'upcoming'); refresh(); }}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.07)', color: colors.muted }}>
                            Reopen
                          </button>
                        )}
                        <button onClick={() => { deleteClinicianBooking(b.id); refresh(); }}
                          className="ml-auto text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <BookingModal onSave={() => { setShowModal(false); refresh(); }} onClose={() => setShowModal(false)} />}
    </div>
  );
}
