'use client';

/** Briefs: every patient in the caseload, each opening on their pre-consultation brief. */

import React from 'react';
import { PanelRows } from '../PanelTriage';
import { usePanel } from '../panel-context';
import { PageHeader, Screen, T } from '../ui';

export default function BriefsPage() {
  const { rows, loading } = usePanel();
  return (
    <Screen header={<PageHeader title="Briefs" sub="Each brief is prepared from the record when you open it" />}>
      {loading && rows.length === 0 ? (
        <div style={{ fontSize: 13.5, color: T.dim }}>Loading your caseload…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13.5, color: T.muted }}>No patients are linked to you yet.</div>
      ) : (
        <PanelRows rows={rows} />
      )}
    </Screen>
  );
}
