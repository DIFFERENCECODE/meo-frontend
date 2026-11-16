'use client';

/**
 * The caseload, fetched once for the whole portal. The sidebar's "Needs review"
 * count, the panel, the review list and the briefs list all read the same rows,
 * so they can never disagree, and the panel's per-patient enrichment (readings,
 * plan progress) is paid for once rather than on every screen.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '@/app/lib/auth';
import type { PanelRow } from './PanelTriage';

interface PanelState {
  rows: PanelRow[];
  loading: boolean;
  loadedAt: Date | null;
  reload: () => void;
}

const Ctx = createContext<PanelState>({ rows: [], loading: true, loadedAt: null, reload: () => {} });

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<PanelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/patients/panel')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setRows(Array.isArray(d) ? d : []); setLoadedAt(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [n]);

  const reload = useCallback(() => setN((x) => x + 1), []);
  return <Ctx.Provider value={{ rows, loading, loadedAt, reload }}>{children}</Ctx.Provider>;
}

export function usePanel() {
  return useContext(Ctx);
}
