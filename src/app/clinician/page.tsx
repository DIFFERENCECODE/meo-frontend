'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import {
  Users, Sparkles, ArrowRight, Target, Activity,
  ChevronRight, UserCheck, Brain,
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
        {sub && <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>}
      </div>
      {href && <ArrowRight className="h-4 w-4 flex-shrink-0 mt-1" style={{ color: colors.muted }} />}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

function PatientCard({ patient }: { patient: Patient }) {
  const { colors } = useTheme();
  const initials = (patient.name || patient.session_id).slice(0, 2).toUpperCase();
  const hasGoals = patient.metabolic_goals?.length > 0;

  return (
    <Link
      href={`/clinician/patients/${patient.session_id}`}
      className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:opacity-90 group"
      style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: `${colors.primary}22`, color: colors.primary }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: colors.foreground }}>
              {patient.name || 'Anonymous'}
            </p>
            <span
              className="inline-block text-xs px-1.5 py-0.5 rounded-md mt-0.5"
              style={{ background: `${colors.primary}12`, color: colors.primary }}
            >
              {patient.vendor_id}
            </span>
          </div>
        </div>
        <ChevronRight
          className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
          style={{ color: colors.muted }}
        />
      </div>

      {/* Goals */}
      {hasGoals ? (
        <div className="flex flex-wrap gap-1.5">
          {patient.metabolic_goals.slice(0, 3).map((g, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(255,255,255,0.06)', color: colors.muted }}
            >
              {g}
            </span>
          ))}
          {patient.metabolic_goals.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-md" style={{ color: `${colors.muted}80` }}>
              +{patient.metabolic_goals.length - 3}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs" style={{ color: `${colors.muted}60` }}>No goals set</p>
      )}

      {/* Clinical AI CTA */}
      <div
        className="flex items-center gap-1.5 text-xs"
        style={{ color: colors.muted }}
      >
        <Sparkles className="h-3 w-3" style={{ color: colors.primary }} />
        <span>Clinical AI ready</span>
      </div>
    </Link>
  );
}

export default function ClinicianDashboard() {
  const { colors } = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Patient[]) => setPatients(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const withGoals = patients.filter(p => p.metabolic_goals?.length > 0);
  const patientRole = patients.filter(p => p.role === 'patient');

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.foreground }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: colors.muted }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={Users} label="Total Patients" value={loading ? '—' : patients.length}
          color={colors.primary} href="/clinician/patients"
          sub={loading ? '' : `${patientRole.length} full patients`}
        />
        <StatCard
          icon={Target} label="With Goals Set" value={loading ? '—' : withGoals.length}
          color="#6ee7b7"
          sub={loading ? '' : `${patients.length - withGoals.length} not yet onboarded`}
        />
        <StatCard
          icon={Brain} label="Clinical AI" value="Ready"
          color="#a78bfa"
          sub="Briefs · Q&amp;A · Risk flags"
        />
      </div>

      {/* Patient panel grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: colors.foreground }}>Patient Panel</h2>
          <Link href="/clinician/patients" className="text-xs font-medium flex items-center gap-1 hover:opacity-80" style={{ color: colors.primary }}>
            All patients <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl p-12 text-center" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <div className="inline-block h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${colors.primary} transparent` }} />
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-xl p-12 text-center space-y-2" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <Users className="h-10 w-10 mx-auto opacity-30" style={{ color: colors.muted }} />
            <p className="text-sm" style={{ color: colors.muted }}>No patients yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {patients.map((p) => (
              <PatientCard key={p.session_id} patient={p} />
            ))}
          </div>
        )}
      </div>

      {/* What Clinical AI can do */}
      <div
        className="rounded-xl p-5"
        style={{ background: `${colors.primary}08`, border: `1px solid ${colors.primary}20` }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: `${colors.primary}15` }}>
            <Sparkles className="h-4 w-4" style={{ color: colors.primary }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: colors.foreground }}>Clinical AI — what you can ask</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                'Pre-session brief',
                'Adherence & engagement',
                'Outstanding questions',
                'Risk flags',
                'BAS progress summary',
                'Behaviour change patterns',
              ].map((item) => (
                <span
                  key={item}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: `${colors.primary}12`, color: colors.primary }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
