'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { getListings, getClinicianBookings } from './store';
import {
  Users, ListChecks, CalendarDays, TrendingUp,
  ArrowRight, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react';

interface Patient {
  session_id: string;
  name: string | null;
  metabolic_goals: string[];
  role: string;
  vendor_id: string;
}

function StatCard({ icon: Icon, label, value, sub, color, href }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; href?: string;
}) {
  const { colors } = useTheme();
  const inner = (
    <div
      className="rounded-xl p-5 flex items-start gap-4 transition-all"
      style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold" style={{ color: colors.foreground }}>{value}</p>
        <p className="text-sm font-medium" style={{ color: colors.muted }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: `${color}` }}>{sub}</p>}
      </div>
      {href && <ArrowRight className="h-4 w-4 flex-shrink-0 mt-1" style={{ color: colors.muted }} />}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

export default function ClinicianDashboard() {
  const { colors } = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Patient[]) => setPatients(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    setListings(getListings().length);
    const bookings = getClinicianBookings();
    setUpcomingBookings(bookings.filter((b) => b.status === 'upcoming').length);
    setCompletedBookings(bookings.filter((b) => b.status === 'completed').length);
  }, []);

  const recent = patients.slice(0, 6);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.foreground }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: colors.muted }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Users} label="Total Patients" value={loading ? '—' : patients.length}
          color={colors.primary} href="/clinician/patients"
          sub={loading ? '' : `${patients.filter(p => p.role === 'patient').length} active`}
        />
        <StatCard
          icon={ListChecks} label="Listings" value={listings}
          color="#6366f1" href="/clinician/listings"
          sub={listings === 0 ? 'Add your first' : 'services offered'}
        />
        <StatCard
          icon={CalendarDays} label="Upcoming" value={upcomingBookings}
          color="#f59e0b" href="/clinician/bookings"
          sub="booked sessions"
        />
        <StatCard
          icon={CheckCircle2} label="Completed" value={completedBookings}
          color="#22c55e" href="/clinician/bookings"
          sub="all time"
        />
      </div>

      {/* Recent patients */}
      <div className="rounded-xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: colors.cardBorder }}>
          <h2 className="text-sm font-semibold" style={{ color: colors.foreground }}>Recent Patients</h2>
          <Link href="/clinician/patients" className="text-xs font-medium flex items-center gap-1 hover:opacity-80" style={{ color: colors.primary }}>
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${colors.primary} transparent` }} />
          </div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Users className="h-10 w-10 mx-auto opacity-30" style={{ color: colors.muted }} />
            <p className="text-sm" style={{ color: colors.muted }}>No patients yet.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: colors.cardBorder }}>
            {recent.map((p) => {
              const initials = (p.name || p.session_id.slice(0, 2)).slice(0, 2).toUpperCase();
              return (
                <div key={p.session_id} className="px-5 py-3.5 flex items-center gap-4">
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: `${colors.primary}25`, color: colors.primary }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: colors.foreground }}>
                      {p.name || 'Anonymous'}
                    </p>
                    <p className="text-xs truncate" style={{ color: colors.muted }}>
                      {p.metabolic_goals?.slice(0, 2).join(' · ') || 'No goals set'}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: p.role === 'patient' ? `${colors.primary}18` : 'rgba(255,255,255,0.07)',
                      color: p.role === 'patient' ? colors.primary : colors.muted,
                    }}
                  >
                    {p.role}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/clinician/listings"
          className="rounded-xl p-4 flex items-center gap-4 transition-all hover:opacity-90"
          style={{ background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}
        >
          <ListChecks className="h-5 w-5 flex-shrink-0" style={{ color: colors.primary }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.foreground }}>Manage Listings</p>
            <p className="text-xs" style={{ color: colors.muted }}>Add or edit your services</p>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" style={{ color: colors.primary }} />
        </Link>
        <Link
          href="/clinician/bookings"
          className="rounded-xl p-4 flex items-center gap-4 transition-all hover:opacity-90"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <CalendarDays className="h-5 w-5 flex-shrink-0" style={{ color: '#6366f1' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.foreground }}>View Bookings</p>
            <p className="text-xs" style={{ color: colors.muted }}>Upcoming sessions & history</p>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" style={{ color: '#6366f1' }} />
        </Link>
      </div>

      {/* Coming soon strip */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
        <div className="text-xs space-y-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <p className="font-semibold" style={{ color: '#f59e0b' }}>Coming soon</p>
          <p>Session transcripts · AI clinical notes · Custom domain · Whitelabel branding · EHR sync · Video meetings</p>
        </div>
      </div>
    </div>
  );
}
