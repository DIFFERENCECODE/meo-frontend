'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { RefreshCw, Database, Brain, HardDrive, Wifi } from 'lucide-react';

interface HealthCheck {
  status: string;
  detail?: string;
  vendors_count?: number;
  knowledge_count?: number;
  model?: string;
}

const serviceIcons: Record<string, typeof Database> = {
  rds: Database,
  qdrant: HardDrive,
  bedrock: Brain,
  redis: Wifi,
};

export default function MonitoringPage() {
  const { colors } = useTheme();
  const [health, setHealth] = useState<Record<string, HealthCheck> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = () => {
    const token = getIdToken();
    if (!token) return;
    setLoading(true);
    fetch('/api/admin/health', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setHealth(data);
        setLastRefresh(new Date());
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHealth(); }, []);

  const okCount = health ? Object.values(health).filter((c) => c.status === 'ok').length : 0;
  const totalCount = health ? Object.keys(health).length : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>System Monitoring</h1>
          <p className="text-sm" style={{ color: colors.muted }}>
            {lastRefresh ? `Last checked: ${lastRefresh.toLocaleTimeString()}` : 'Checking...'}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
      >
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: okCount === totalCount ? `${colors.success}20` : `${colors.error}20` }}
          >
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: okCount === totalCount ? colors.success : colors.error }}
            />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: colors.foreground }}>
              {okCount === totalCount ? 'All Systems Operational' : `${totalCount - okCount} Service(s) Down`}
            </p>
            <p className="text-sm" style={{ color: colors.muted }}>{okCount}/{totalCount} services healthy</p>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {health &&
          Object.entries(health).map(([service, check]) => {
            const Icon = serviceIcons[service] || Database;
            const isOk = check.status === 'ok';
            return (
              <div
                key={service}
                className="rounded-xl border p-5"
                style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: isOk ? `${colors.success}15` : `${colors.error}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: isOk ? colors.success : colors.error }} />
                    </div>
                    <div>
                      <p className="font-semibold capitalize" style={{ color: colors.foreground }}>{service}</p>
                      <p className="text-xs" style={{ color: colors.muted }}>
                        {service === 'rds' && 'PostgreSQL Database'}
                        {service === 'qdrant' && 'Vector Store (RAG)'}
                        {service === 'bedrock' && 'AWS LLM Service'}
                        {service === 'redis' && 'Cache / Rate Limiting'}
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: isOk ? `${colors.success}20` : `${colors.error}20`,
                      color: isOk ? colors.success : colors.error,
                    }}
                  >
                    {isOk ? 'Healthy' : 'Down'}
                  </span>
                </div>

                {/* Details */}
                <div className="text-xs space-y-1" style={{ color: colors.muted }}>
                  {check.vendors_count !== undefined && <p>Vendors: {check.vendors_count} | Knowledge: {check.knowledge_count}</p>}
                  {check.model && <p>Model: {check.model}</p>}
                  {!isOk && check.detail && (
                    <p className="mt-2 p-2 rounded text-xs break-all" style={{ backgroundColor: `${colors.error}10`, color: colors.error }}>
                      {check.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
