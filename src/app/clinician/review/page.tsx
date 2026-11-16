'use client';

/**
 * Needs review: the part of the caseload MeO has moved up, each opening on its
 * flags. A row is here because of a stated rule (see the sidebar), never a model's
 * judgement.
 */

import React from 'react';
import { PanelRows } from '../PanelTriage';
import { usePanel } from '../panel-context';
import { PageHeader, Screen, T } from '../ui';

export default function NeedsReviewPage() {
  const { rows, loading } = usePanel();
  const flagged = rows.filter((r) => r.urgency_level !== 'low');
  return (
    <Screen header={<PageHeader title="Needs review" sub={`${flagged.length} of ${rows.length} patients, flagged by the rules in the sidebar`} />}>
      {loading && rows.length === 0 ? (
        <div style={{ fontSize: 13.5, color: T.dim }}>Loading your caseload…</div>
      ) : flagged.length === 0 ? (
        <div style={{ padding: '18px 20px', borderRadius: 12, background: T.row, border: `1px solid ${T.rowBorder}`, fontSize: 13.5, color: T.muted }}>
          Nobody needs a look right now. Patients appear here when one of MeO&apos;s rules is met.
        </div>
      ) : (
        <PanelRows rows={flagged} to="/review" />
      )}
    </Screen>
  );
}
