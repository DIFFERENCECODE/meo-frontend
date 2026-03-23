'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { Users, MessageSquare, Key, Building, UserCheck, Clock, Database, Activity } from 'lucide-react';

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

export default function AdminDashboard() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Record<string, HealthCheck> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/stats', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/health', { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, h]) => {
        setStats(s);
        setHealth(h);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.total_users, icon: Users, color: colors.primary },
        { label: 'Active Chats', value: stats.total_chats, icon: MessageSquare, color: '#3b82f6' },
        { label: 'Licensed Users', value: stats.licensed_users, icon: UserCheck, color: colors.success },
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
                </div>
              );
            })}
          </div>

          {/* System Health */}
          <h2 className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>System Health</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
        </>
      )}
    </div>
  );
}
