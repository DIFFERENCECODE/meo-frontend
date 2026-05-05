'use client';

import React, { useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { X, Calendar, Clock, Star, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Static therapist data ────────────────────────────────────────────────────

interface Therapist {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  credentials: string[];
  bio: string;
  rating: number;
  reviews: number;
  pricePerSession: number;
  sessionLength: number; // minutes
  nextAvailable: string;
  avatar: string; // initials fallback
  avatarColor: string;
  tags: string[];
}

const THERAPISTS: Therapist[] = [
  {
    id: 'sarah-okonkwo',
    name: 'Sarah Okonkwo',
    title: 'BANT Registered Nutritional Therapist',
    specialties: ['Metabolic Health', 'Insulin Resistance', 'Weight Management'],
    credentials: ['BANT', 'CNHC', 'mBANT'],
    bio: 'Specialising in metabolic dysfunction and insulin resistance for over 8 years. Works with clients to reverse type 2 diabetes risk through targeted nutrition and lifestyle protocols.',
    rating: 4.9,
    reviews: 142,
    pricePerSession: 120,
    sessionLength: 60,
    nextAvailable: 'Tomorrow',
    avatar: 'SO',
    avatarColor: '#22c55e',
    tags: ['Kraft Protocol', 'Low-Carb', 'Fasting'],
  },
  {
    id: 'james-whitfield',
    name: 'James Whitfield',
    title: 'Functional Medicine Practitioner',
    specialties: ['Biological Age Optimisation', 'Gut Health', 'Hormonal Balance'],
    credentials: ['IFMCP', 'BANT', 'BSc Nutritional Medicine'],
    bio: 'Functional medicine approach to ageing and metabolic health. Interprets Kraft test results and BAS scores in the context of full-body systems to build personalised protocols.',
    rating: 4.8,
    reviews: 98,
    pricePerSession: 150,
    sessionLength: 60,
    nextAvailable: 'Today 4pm',
    avatar: 'JW',
    avatarColor: '#a3e635',
    tags: ['BAS Optimisation', 'Longevity', 'Hormones'],
  },
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    title: 'Clinical Nutritionist & Health Coach',
    specialties: ['Visceral Fat Reduction', 'Lifestyle Medicine', 'Stress & Metabolism'],
    credentials: ['ANutr', 'CNHC', 'MSc Clinical Nutrition'],
    bio: 'Combines clinical nutrition with behaviour change coaching. Helps clients understand their metabolic data and build sustainable habits that stick long-term.',
    rating: 4.9,
    reviews: 211,
    pricePerSession: 95,
    sessionLength: 50,
    nextAvailable: 'Thu 10am',
    avatar: 'PS',
    avatarColor: '#facc15',
    tags: ['Behaviour Change', 'METS-IR', 'Mindful Eating'],
  },
  {
    id: 'tom-gallagher',
    name: 'Tom Gallagher',
    title: 'Metabolic Health Coach',
    specialties: ['Exercise Metabolism', 'CGM Interpretation', 'Body Composition'],
    credentials: ['MSc Sports Nutrition', 'BANT', 'CSCS'],
    bio: 'Bridges the gap between exercise science and metabolic health. Specialises in interpreting continuous glucose data alongside Kraft results to optimise body composition.',
    rating: 4.7,
    reviews: 76,
    pricePerSession: 85,
    sessionLength: 45,
    nextAvailable: 'Fri 2pm',
    avatar: 'TG',
    avatarColor: '#f97316',
    tags: ['Exercise', 'CGM', 'Body Composition'],
  },
];

// ─── Available time slots ─────────────────────────────────────────────────────

const SLOTS: Record<string, string[]> = {
  'Mon 6 Jan':  ['09:00', '10:00', '11:00', '14:00', '15:00'],
  'Tue 7 Jan':  ['09:30', '11:00', '13:00', '16:00'],
  'Wed 8 Jan':  ['10:00', '12:00', '14:30', '16:00', '17:00'],
  'Thu 9 Jan':  ['09:00', '10:30', '14:00', '15:30'],
  'Fri 10 Jan': ['09:00', '11:00', '13:30'],
};
const SLOT_DAYS = Object.keys(SLOTS);

// ─── Booking modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  therapist: Therapist;
  onClose: () => void;
}

function BookingModal({ therapist, onClose }: BookingModalProps) {
  const { colors } = useTheme();
  const [dayIdx, setDayIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const day = SLOT_DAYS[dayIdx];
  const slots = SLOTS[day] ?? [];

  const handleConfirm = () => {
    if (!selectedSlot) return;
    setConfirmed(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${colors.cardBorder}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: `${therapist.avatarColor}25`, color: therapist.avatarColor }}
            >
              {therapist.avatar}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: colors.foreground }}>{therapist.name}</p>
              <p className="text-xs" style={{ color: colors.muted }}>{therapist.sessionLength} min · £{therapist.pricePerSession}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" style={{ color: colors.muted }} />
          </button>
        </div>

        <div className="px-6 py-5">
          {confirmed ? (
            // Confirmation state
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#22c55e20' }}
              >
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: colors.foreground }}>Booking Confirmed!</p>
                <p className="text-sm mt-1" style={{ color: colors.muted }}>
                  {day} at {selectedSlot} with {therapist.name}
                </p>
              </div>
              <div
                className="w-full rounded-xl p-4 text-sm text-left space-y-1"
                style={{ backgroundColor: colors.accent, border: `1px solid ${colors.cardBorder}` }}
              >
                <p style={{ color: colors.muted }}>A confirmation has been sent to your email. Your therapist will reach out within 24 hours to finalise the session details.</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Day picker */}
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: colors.muted }}>
                  <Calendar className="h-3.5 w-3.5" /> Select a date
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setDayIdx(Math.max(0, dayIdx - 1)); setSelectedSlot(null); }}
                    disabled={dayIdx === 0}
                    className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" style={{ color: colors.foreground }} />
                  </button>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    {SLOT_DAYS.slice(Math.max(0, dayIdx - 1), dayIdx + 2).map((d) => (
                      <button
                        key={d}
                        onClick={() => { setDayIdx(SLOT_DAYS.indexOf(d)); setSelectedSlot(null); }}
                        className="py-2 px-2 rounded-xl text-xs font-medium text-center transition-all"
                        style={{
                          backgroundColor: d === day ? colors.primary : colors.accent,
                          color: d === day ? colors.primaryForeground : colors.foreground,
                          border: `1px solid ${d === day ? colors.primary : colors.cardBorder}`,
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setDayIdx(Math.min(SLOT_DAYS.length - 1, dayIdx + 1)); setSelectedSlot(null); }}
                    disabled={dayIdx === SLOT_DAYS.length - 1}
                    className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" style={{ color: colors.foreground }} />
                  </button>
                </div>
              </div>

              {/* Time slots */}
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: colors.muted }}>
                  <Clock className="h-3.5 w-3.5" /> Available times
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: selectedSlot === slot ? colors.primary : colors.accent,
                        color: selectedSlot === slot ? colors.primaryForeground : colors.foreground,
                        border: `1px solid ${selectedSlot === slot ? colors.primary : colors.cardBorder}`,
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.muted }}>
                  Note for your therapist (optional)
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. I'd like to discuss my BAS score and diet changes…"
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                  style={{
                    backgroundColor: colors.accent,
                    border: `1px solid ${colors.cardBorder}`,
                    color: colors.foreground,
                  }}
                />
              </div>

              {/* Summary + CTA */}
              {selectedSlot && (
                <div
                  className="rounded-xl p-3 mb-4 text-sm flex items-center justify-between"
                  style={{ backgroundColor: `${colors.primary}15`, border: `1px solid ${colors.primary}40` }}
                >
                  <span style={{ color: colors.foreground }}>
                    {day} · {selectedSlot}
                  </span>
                  <span className="font-bold" style={{ color: colors.primary }}>
                    £{therapist.pricePerSession}
                  </span>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={!selectedSlot}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 hover:opacity-90"
                style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
              >
                Confirm Booking
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Therapist card ───────────────────────────────────────────────────────────

function TherapistCard({ therapist, onBook }: { therapist: Therapist; onBook: () => void }) {
  const { colors } = useTheme();

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4 transition-all hover:scale-[1.01]"
      style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      {/* Top row */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: `${therapist.avatarColor}20`, color: therapist.avatarColor }}
        >
          {therapist.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base" style={{ color: colors.foreground }}>{therapist.name}</p>
          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>{therapist.title}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold" style={{ color: colors.foreground }}>{therapist.rating}</span>
            <span className="text-xs" style={{ color: colors.muted }}>({therapist.reviews} reviews)</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold" style={{ color: colors.primary }}>£{therapist.pricePerSession}</p>
          <p className="text-xs" style={{ color: colors.muted }}>{therapist.sessionLength} min</p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{therapist.bio}</p>

      {/* Specialties */}
      <div className="flex flex-wrap gap-1.5">
        {therapist.tags.map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${therapist.avatarColor}15`, color: therapist.avatarColor }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Credentials */}
      <div className="flex flex-wrap gap-1.5">
        {therapist.credentials.map((cred) => (
          <span
            key={cred}
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: colors.accent, color: colors.muted, border: `1px solid ${colors.cardBorder}` }}
          >
            {cred}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs" style={{ color: colors.muted }}>Next: {therapist.nextAvailable}</span>
        </div>
        <button
          onClick={onBook}
          className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
        >
          Book Session
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { colors } = useTheme();
  const [bookingFor, setBookingFor] = useState<Therapist | null>(null);
  const [filter, setFilter] = useState<string>('All');

  const specialtyFilters = ['All', 'Metabolic Health', 'Insulin Resistance', 'Biological Age Optimisation', 'Lifestyle Medicine'];

  const filtered = filter === 'All'
    ? THERAPISTS
    : THERAPISTS.filter((t) => t.specialties.includes(filter));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-5 py-10 w-full">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: colors.primary }}>
            Therapist Marketplace
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.foreground }}>
            Book a Health Session
          </h1>
          <p className="text-sm" style={{ color: colors.muted }}>
            BANT-registered nutritional therapists and functional medicine practitioners specialising in metabolic health — all verified by Meterbolic.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {specialtyFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f ? colors.primary : colors.accent,
                color: filter === f ? colors.primaryForeground : colors.muted,
                border: `1px solid ${filter === f ? colors.primary : colors.cardBorder}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {filtered.map((t) => (
            <TherapistCard key={t.id} therapist={t} onBook={() => setBookingFor(t)} />
          ))}
        </div>

        {/* Trust bar */}
        <div
          className="mt-10 rounded-2xl p-5 flex flex-wrap gap-4 justify-between items-center"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          {[
            { label: 'BANT Verified', sub: 'All therapists credentialled' },
            { label: 'Secure Booking', sub: 'Encrypted & GDPR compliant' },
            { label: 'Meo-Integrated', sub: 'Share data with your therapist' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: colors.primary }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: colors.foreground }}>{item.label}</p>
                <p className="text-xs" style={{ color: colors.muted }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {bookingFor && (
        <BookingModal therapist={bookingFor} onClose={() => setBookingFor(null)} />
      )}
    </AppShell>
  );
}
