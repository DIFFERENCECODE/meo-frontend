'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import {
  X, Calendar, Clock, Star, CheckCircle2,
  ChevronLeft, ChevronRight, Sparkles, Send, Search,
} from 'lucide-react';
import { THERAPISTS, SLOTS, SLOT_DAYS, matchTherapists, type Therapist } from './data';
import { saveBooking } from './bookings';

// ─── Booking modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  therapist: Therapist;
  onClose: () => void;
}

function BookingModal({ therapist, onClose }: BookingModalProps) {
  const { colors } = useTheme();
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const day = SLOT_DAYS[dayIndex];
  const slots = SLOTS[day] ?? [];

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
          className="rounded-2xl p-8 max-w-sm w-full text-center space-y-4"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <CheckCircle2 className="h-14 w-14 mx-auto" style={{ color: colors.primary }} />
          <h2 className="text-xl font-bold" style={{ color: colors.foreground }}>Booking Confirmed</h2>
          <p className="text-sm" style={{ color: colors.muted }}>
            Your session with <strong style={{ color: colors.foreground }}>{therapist.name}</strong> on{' '}
            <strong style={{ color: colors.foreground }}>{day}</strong> at{' '}
            <strong style={{ color: colors.foreground }}>{selectedSlot}</strong> is confirmed.
            You'll receive a calendar invite shortly.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: therapist.avatarColor + '30', color: therapist.avatarColor }}
            >
              {therapist.avatar}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: colors.foreground }}>{therapist.name}</p>
              <p className="text-xs" style={{ color: colors.muted }}>£{therapist.pricePerSession} · {therapist.sessionLength} min</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="h-4 w-4" style={{ color: colors.muted }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Day picker */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: colors.muted }}>
              <Calendar className="h-3.5 w-3.5" /> Select a day
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDayIndex((i) => Math.max(0, i - 1))}
                disabled={dayIndex === 0}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" style={{ color: colors.muted }} />
              </button>
              <div
                className="flex-1 text-center py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: colors.accent, color: colors.foreground }}
              >
                {day}
              </div>
              <button
                onClick={() => setDayIndex((i) => Math.min(SLOT_DAYS.length - 1, i + 1))}
                disabled={dayIndex === SLOT_DAYS.length - 1}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" style={{ color: colors.muted }} />
              </button>
            </div>
          </div>

          {/* Time slots */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: colors.muted }}>
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.muted }}>
              Note for therapist (optional)
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. I've just had my Kraft test results..."
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
                border: `1px solid ${colors.cardBorder}`,
              }}
            />
          </div>

          {/* Summary */}
          {selectedSlot && (
            <div
              className="rounded-xl p-3 text-sm flex items-center justify-between"
              style={{ backgroundColor: colors.primary + '15', border: `1px solid ${colors.primary}30` }}
            >
              <span style={{ color: colors.muted }}>{day} · {selectedSlot}</span>
              <span className="font-bold" style={{ color: colors.primary }}>£{therapist.pricePerSession}</span>
            </div>
          )}

          <button
            disabled={!selectedSlot}
            onClick={() => {
              if (selectedSlot) {
                saveBooking({
                  therapistId: therapist.id,
                  therapistName: therapist.name,
                  therapistAvatar: therapist.avatar,
                  therapistAvatarColor: therapist.avatarColor,
                  day,
                  slot: selectedSlot,
                  price: therapist.pricePerSession,
                  sessionLength: therapist.sessionLength,
                  note,
                });
              }
              setConfirmed(true);
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI recommender chat panel ────────────────────────────────────────────────

interface ChatMsg { role: 'ai' | 'user'; text: string; matches?: Therapist[] }

const AI_INTRO: ChatMsg = {
  role: 'ai',
  text: "Hi! I'm your Meo AI assistant. Tell me about your health goals or concerns and I'll match you with the right therapist. For example: 'I want to lower my biological age' or 'I have insulin resistance'.",
};

function AIChatPanel({ onBook, onClose }: { onBook: (t: Therapist) => void; onClose: () => void }) {
  const { colors } = useTheme();
  const [msgs, setMsgs] = useState<ChatMsg[]>([AI_INTRO]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
    setMsgs((prev) => [...prev, { role: 'user', text: q }]);
    setTyping(true);
    setTimeout(() => {
      const matches = matchTherapists(q);
      let reply: string;
      if (matches.length === 0) {
        reply = "I wasn't able to find a specific match for that — but all our therapists work with general metabolic health. You can browse the cards above or try rephrasing (e.g. 'weight loss', 'insulin resistance', 'biological age').";
      } else {
        const top = matches[0];
        const names = matches.slice(0, 2).map((t) => t.name).join(' and ');
        reply = `Based on what you've shared, I'd recommend ${names}. ${top.name} specialises in ${top.specialties.slice(0, 2).join(' and ')} — ${top.bio}`;
      }
      setTyping(false);
      setMsgs((prev) => [...prev, { role: 'ai', text: reply, matches: matches.slice(0, 2) }]);
    }, 900);
  };

  return (
    <div
      className="fixed bottom-0 right-0 sm:right-6 sm:bottom-6 z-40 w-full sm:w-96 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl"
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.cardBorder}`,
        maxHeight: '70vh',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-2xl flex-shrink-0"
        style={{ borderBottom: `1px solid ${colors.cardBorder}` }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: colors.primary }} />
          <span className="font-semibold text-sm" style={{ color: colors.foreground }}>Find my therapist</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
          <X className="h-4 w-4" style={{ color: colors.muted }} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                style={{
                  backgroundColor: m.role === 'user' ? colors.primary : colors.accent,
                  color: m.role === 'user' ? colors.primaryForeground : colors.foreground,
                }}
              >
                {m.text}
              </div>
            </div>
            {m.matches && m.matches.length > 0 && (
              <div className="mt-2 space-y-2">
                {m.matches.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl p-3 flex items-center justify-between gap-3"
                    style={{ backgroundColor: colors.background, border: `1px solid ${colors.cardBorder}` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: t.avatarColor + '30', color: t.avatarColor }}
                      >
                        {t.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: colors.foreground }}>{t.name}</p>
                        <p className="text-xs" style={{ color: colors.muted }}>£{t.pricePerSession} · {t.nextAvailable}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onBook(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
                    >
                      Book
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-2 text-sm flex items-center gap-1"
              style={{ backgroundColor: colors.accent, color: colors.muted }}
            >
              <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>·</span>
              <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>·</span>
              <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>·</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${colors.cardBorder}` }}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. I want to lower my insulin..."
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: colors.background,
              color: colors.foreground,
              border: `1px solid ${colors.cardBorder}`,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 rounded-xl disabled:opacity-40 transition-all"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Therapist card ───────────────────────────────────────────────────────────

function TherapistCard({ therapist, onBook }: { therapist: Therapist; onBook: () => void }) {
  const { colors } = useTheme();
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 h-full transition-all hover:scale-[1.01]"
      style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      {/* Avatar + name + price */}
      <div className="flex items-start gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: therapist.avatarColor + '25', color: therapist.avatarColor }}
        >
          {therapist.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug" style={{ color: colors.foreground }}>{therapist.name}</p>
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: colors.muted }}>{therapist.title}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold" style={{ color: colors.foreground }}>{therapist.rating}</span>
            <span className="text-xs" style={{ color: colors.muted }}>({therapist.reviews})</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold" style={{ color: colors.primary }}>£{therapist.pricePerSession}</p>
          <p className="text-xs" style={{ color: colors.muted }}>{therapist.sessionLength} min</p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: colors.muted }}>{therapist.bio}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {therapist.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: therapist.avatarColor + '20', color: therapist.avatarColor }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Credentials */}
      <div className="flex flex-wrap gap-1">
        {therapist.credentials.map((c) => (
          <span
            key={c}
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: colors.accent, color: colors.muted, border: `1px solid ${colors.cardBorder}` }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs" style={{ color: colors.muted }}>Next: {therapist.nextAvailable}</span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/marketplace/${therapist.id}`}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{ border: `1px solid ${colors.cardBorder}`, color: colors.foreground }}
          >
            Profile
          </Link>
          <button
            onClick={onBook}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { colors } = useTheme();
  const [bookingFor, setBookingFor] = useState<Therapist | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showAI, setShowAI] = useState(false);

  const specialtyFilters = ['All', 'Metabolic Health', 'Insulin Resistance', 'Biological Age Optimisation', 'Lifestyle Medicine'];

  const filtered = THERAPISTS.filter((t) => {
    const matchesFilter = filter === 'All' || t.specialties.includes(filter);
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.specialties.some((s) => s.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-5 py-10 w-full">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: colors.primary }}>
            Therapist Marketplace
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: colors.foreground }}>
                Book a Health Session
              </h1>
              <p className="text-sm" style={{ color: colors.muted }}>
                BANT-registered nutritional therapists specialising in metabolic health — all verified by Meterbolic.
              </p>
            </div>
            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
            >
              <Sparkles className="h-4 w-4" />
              Ask AI
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Name / keyword search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 sm:w-64"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
          >
            <Search className="h-4 w-4 flex-shrink-0" style={{ color: colors.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or specialty..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: colors.foreground }}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="h-3.5 w-3.5" style={{ color: colors.muted }} />
              </button>
            )}
          </div>

          {/* Specialty filter pills */}
          <div className="flex flex-wrap gap-2">
            {specialtyFilters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
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
        </div>

        {/* Cards — horizontal scroll row */}
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: colors.muted }}>
            No therapists match your search. Try a different name or specialty.
          </p>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-4 -mx-5 px-5 snap-x snap-mandatory">
            {filtered.map((t) => (
              <div key={t.id} className="flex-shrink-0 w-80 snap-start">
                <TherapistCard therapist={t} onBook={() => setBookingFor(t)} />
              </div>
            ))}
          </div>
        )}

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
      {showAI && (
        <AIChatPanel
          onBook={(t) => { setShowAI(false); setBookingFor(t); }}
          onClose={() => setShowAI(false)}
        />
      )}
    </AppShell>
  );
}
