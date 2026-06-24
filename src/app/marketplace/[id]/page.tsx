'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import {
  ArrowLeft, Star, CheckCircle2, Calendar, Clock,
  ChevronLeft, ChevronRight, X, Stethoscope, BookOpen, Tag,
} from 'lucide-react';
import { THERAPISTS, SLOTS, SLOT_DAYS, type Therapist } from '../data';
import { saveBooking } from '../bookings';
import { buildCalendarEvent, googleCalendarUrl, outlookCalendarUrl, downloadICS } from '../calendar';
import { getIdToken, getEmailFromIdToken } from '@/app/lib/auth';

// ─── Booking modal (inline) ───────────────────────────────────────────────────

function BookingModal({ therapist, onClose }: { therapist: Therapist; onClose: () => void }) {
  const { colors } = useTheme();
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const day = SLOT_DAYS[dayIndex];
  const slots = SLOTS[day] ?? [];

  if (confirmed) {
    const ev = buildCalendarEvent(therapist.name, day, selectedSlot!, therapist.sessionLength, note);
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
          </p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: colors.muted }}>
              Add to Calendar
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={googleCalendarUrl(ev)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
              >
                <Calendar className="h-4 w-4" />
                Google Calendar
              </a>
              <button
                onClick={() => downloadICS(ev)}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
              >
                <Calendar className="h-4 w-4" />
                Apple Calendar (.ics)
              </button>
              <a
                href={outlookCalendarUrl(ev)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
              >
                <Calendar className="h-4 w-4" />
                Outlook Calendar
              </a>
            </div>
          </div>
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
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="font-bold text-sm" style={{ color: colors.foreground }}>Book with {therapist.name}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="h-4 w-4" style={{ color: colors.muted }} />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: colors.muted }}>
              <Calendar className="h-3.5 w-3.5" /> Select a day
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setDayIndex((i) => Math.max(0, i - 1))} disabled={dayIndex === 0} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" style={{ color: colors.muted }} />
              </button>
              <div className="flex-1 text-center py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: colors.accent, color: colors.foreground }}>{day}</div>
              <button onClick={() => setDayIndex((i) => Math.min(SLOT_DAYS.length - 1, i + 1))} disabled={dayIndex === SLOT_DAYS.length - 1} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" style={{ color: colors.muted }} />
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: colors.muted }}>
              <Clock className="h-3.5 w-3.5" /> Available times
            </p>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button key={slot} onClick={() => setSelectedSlot(slot)} className="py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ backgroundColor: selectedSlot === slot ? colors.primary : colors.accent, color: selectedSlot === slot ? colors.primaryForeground : colors.foreground, border: `1px solid ${selectedSlot === slot ? colors.primary : colors.cardBorder}` }}>
                  {slot}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.muted }}>Note (optional)</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="e.g. I've just had my Kraft results..."
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
              style={{ backgroundColor: colors.background, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }} />
          </div>
          {selectedSlot && (
            <div className="rounded-xl p-3 text-sm flex items-center justify-between"
              style={{ backgroundColor: colors.primary + '15', border: `1px solid ${colors.primary}30` }}>
              <span style={{ color: colors.muted }}>{day} · {selectedSlot}</span>
              <span className="font-bold" style={{ color: colors.primary }}>£{therapist.pricePerSession}</span>
            </div>
          )}
          <button
            disabled={!selectedSlot}
            onClick={async () => {
              if (selectedSlot) {
                saveBooking({
                  therapistId: therapist.id,
                  therapistName: therapist.name,
                  therapistImage: therapist.image,
                  therapistAvatar: therapist.avatar,
                  therapistAvatarColor: therapist.avatarColor,
                  day,
                  slot: selectedSlot,
                  price: therapist.pricePerSession,
                  sessionLength: therapist.sessionLength,
                  note,
                });
                const token = getIdToken();
                const email = token ? getEmailFromIdToken(token) : null;
                if (email) {
                  fetch('/api/marketplace/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userEmail: email,
                      therapistName: therapist.name,
                      day,
                      slot: selectedSlot,
                      sessionLength: therapist.sessionLength,
                      price: therapist.pricePerSession,
                    }),
                  }).catch(() => {});
                }
              }
              setConfirmed(true);
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Details page ─────────────────────────────────────────────────────────────

export default function TherapistDetailPage() {
  const { colors } = useTheme();
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(false);

  const therapist = THERAPISTS.find((t) => t.id === params.id);

  if (!therapist) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p style={{ color: colors.muted }}>Therapist not found.</p>
          <Link href="/marketplace" className="text-sm underline" style={{ color: colors.primary }}>Back to Marketplace</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8 w-full">
        {/* Back */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 mb-6 text-sm hover:underline"
          style={{ color: colors.muted }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        {/* Hero card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <div className="flex items-start gap-5">
            <img
              src={therapist.image}
              alt={therapist.name}
              className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>{therapist.name}</h1>
              <p className="text-sm mt-0.5" style={{ color: colors.muted }}>{therapist.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-sm" style={{ color: colors.foreground }}>{therapist.rating}</span>
                  <span className="text-sm" style={{ color: colors.muted }}>({therapist.reviews} reviews)</span>
                </div>
                <span className="text-sm" style={{ color: colors.muted }}>·</span>
                <span className="text-sm font-semibold" style={{ color: colors.primary }}>£{therapist.pricePerSession} / {therapist.sessionLength} min</span>
                <span className="text-sm" style={{ color: colors.muted }}>·</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm" style={{ color: colors.muted }}>Next: {therapist.nextAvailable}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="flex flex-wrap gap-2 mt-4">
            {therapist.credentials.map((c) => (
              <span
                key={c}
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
              >
                {c}
              </span>
            ))}
          </div>

          <button
            onClick={() => setBooking(true)}
            className="mt-5 w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Book a Session
          </button>
        </div>

        {/* About */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <h2 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: colors.foreground }}>
            <BookOpen className="h-4 w-4" style={{ color: colors.primary }} />
            About
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{therapist.longBio}</p>
        </div>

        {/* Specialties + Conditions grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
          >
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: colors.foreground }}>
              <Stethoscope className="h-4 w-4" style={{ color: colors.primary }} />
              Approach
            </h2>
            <ul className="space-y-1.5">
              {therapist.approach.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm" style={{ color: colors.muted }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: colors.primary }} />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
          >
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: colors.foreground }}>
              <Tag className="h-4 w-4" style={{ color: colors.primary }} />
              Conditions
            </h2>
            <div className="flex flex-wrap gap-2">
              {therapist.conditions.map((c) => (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: therapist.avatarColor + '20', color: therapist.avatarColor }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <h2 className="font-bold text-sm mb-3" style={{ color: colors.foreground }}>Focus Areas</h2>
          <div className="flex flex-wrap gap-2">
            {[...therapist.specialties, ...therapist.tags].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {booking && <BookingModal therapist={therapist} onClose={() => setBooking(false)} />}
    </AppShell>
  );
}
