'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { Users, MessageSquare, Key, Building, UserCheck, Clock, TrendingUp, ArrowRight } from 'lucide-react';

interface Stats {
  total_users: number;
  total_profiles: number;
  total_chats: number;
  licensed_users: number;
  pending_provision: number;
  total_licenses: number;
  used_licenses: number;
  total_organizations: number;
}

interface HealthCheck {
  status: string;
  detail?: string;
  vendors_count?: number;
  knowledge_count?: number;
  model?: string;
}

interface AdminUser {
  cognito_sub: string;
  email: string;
  name: string | null;
  meterbolic_userid: string | null;
  created_at: string | null;
  role: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminDashboard() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Record<string, HealthCheck> | null>(null);
  // Recent signups feed — pulled from /admin/users (already returns
  // created_at DESC ordering on the backend) and sliced to the last 10.
  // No new endpoint needed.
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [usersThisWeek, setUsersThisWeek] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/stats', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/health', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/users', { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, h, u]: [Stats | null, Record<string, HealthCheck> | null, AdminUser[]]) => {
        setStats(s);
        setHealth(h);
        const users = Array.isArray(u) ? u : [];
        setRecentUsers(users.slice(0, 10));
        const cutoff = Date.now() - SEVEN_DAYS_MS;
        setUsersThisWeek(
          users.filter((x) => x.created_at && new Date(x.created_at).getTime() > cutoff).length,
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // Derived: provisioning rate. Provisioned = total_users − pending_provision.
  // Render as percentage so the admin sees "85% provisioned" at a glance
  // rather than having to mentally divide.
  const provisioningRate = stats
    ? stats.total_users > 0
      ? Math.round(((stats.total_users - stats.pending_provision) / stats.total_users) * 100)
      : 0
    : 0;

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.total_users, icon: Users, color: colors.primary,
          // Show "+N this week" sub-label when there are recent signups, so
          // the dashboard answers "are people still signing up?" at a glance.
          sub: usersThisWeek > 0 ? `+${usersThisWeek} this week` : undefined },
        { label: 'Active Chats', value: stats.total_chats, icon: MessageSquare, color: '#3b82f6' },
        { label: 'Licensed Users', value: stats.licensed_users, icon: UserCheck, color: colors.success },
        // New: provisioning rate (derived from existing fields, no backend change).
        // Shows what fraction of users have a Meterbolic ID issued — a
        // direct signal for ops health since unprovisioned users can't
        // submit measurements.
        { label: 'Provisioning Rate', value: `${provisioningRate}%`, icon: TrendingUp,
          color: provisioningRate >= 80 ? colors.success : provisioningRate >= 50 ? colors.warning : colors.error,
          sub: stats.pending_provision > 0 ? `${stats.pending_provision} pending` : 'all clear' },
        { label: 'Pending Provision', value: stats.pending_provision, icon: Clock, color: colors.warning },
        { label: 'License Codes', value: `${stats.used_licenses}/${stats.total_licenses}`, icon: Key, color: '#8b5cf6' },
        { label: 'Organizations', value: stats.total_organizations, icon: Building, color: '#ec4899' },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: colors.foreground }}>Dashboard</h1>
      <p className="text-sm mb-8" style={{ color: colors.muted }}>Platform overview and system health</p>

      {loading ? (
        <p className="animate-pulse" style={{ color: colors.muted }}>Loading stats...</p>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border p-5"
                  style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>
                      {card.label}
                    </span>
                    <Icon className="h-4 w-4" style={{ color: card.color }} />
                  </div>
                  <p className="text-3xl font-bold" style={{ color: colors.foreground }}>{card.value}</p>
                  {card.sub && (
                    <p className="text-xs mt-1" style={{ color: card.color }}>{card.sub}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* System Health */}
          <h2 className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>System Health</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {health &&
              Object.entries(health).map(([service, check]) => (
                <div
                  key={service}
                  className="rounded-xl border p-4 flex items-center gap-4"
                  style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
                >
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: check.status === 'ok' ? colors.success : colors.error }}
                  />
                  <div>
                    <p className="font-medium text-sm capitalize" style={{ color: colors.foreground }}>{service}</p>
                    <p className="text-xs" style={{ color: colors.muted }}>
                      {check.status === 'ok'
                        ? check.vendors_count !== undefined
                          ? `${check.vendors_count} vendors, ${check.knowledge_count} docs`
                          : check.model || 'Connected'
                        : check.detail || 'Error'}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          {/* Recent Signups — last 10 users by created_at, with a "View all"
              link to the Users page. Useful for catching new account
              activity at a glance without leaving the dashboard. */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: colors.foreground }}>Recent Signups</h2>
            <Link
              href="/admin/users"
              className="text-xs flex items-center gap-1 hover:underline"
              style={{ color: colors.primary }}
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
            {recentUsers.length === 0 ? (
              <p className="px-4 py-8 text-sm text-center" style={{ color: colors.muted }}>
                No users yet
              </p>
            ) : (
              recentUsers.map((u, i) => (
                <div
                  key={u.cognito_sub}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.cardBorder}` }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                  >
                    {(u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: colors.foreground }}>
                      {u.name || u.email}
                    </p>
                    <p className="text-xs truncate" style={{ color: colors.muted }}>
                      {u.email}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor:
                        u.role === 'admin' ? `${colors.error}20` :
                        u.role === 'patient' ? `${colors.success}20` :
                        `${colors.warning}20`,
                      color:
                        u.role === 'admin' ? colors.error :
                        u.role === 'patient' ? colors.success :
                        colors.warning,
                    }}
                  >
                    {u.role}
                  </span>
                  <span className="text-xs whitespace-nowrap" style={{ color: colors.muted }}>
                    {u.created_at ? formatRelative(u.created_at) : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Relative time formatter for the recent-signups feed. Keeps the rows
// scannable ("3h ago") instead of forcing the eye to parse a full date.
function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  const yr = Math.floor(mon / 12);
  return `${yr}y ago`;
}
