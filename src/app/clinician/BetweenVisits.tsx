'use client';

import React, { useEffect, useState } from 'react';
import { getIdToken } from '@/app/lib/auth';
import { ProgressBadge, type PlanProgress } from '@/components/record/PractitionerNotes';

/**
 * Between visits — the gap, as data.
 *
 * The practitioner's blind spot is the six weeks they cannot see: they lose the
 * patient after an appointment and reconstruct the interval from memory at the
 * start of the next one. This screen is the whole product argument in one view,
 * and it is also where we must be most careful, because a confident-looking
 * summary of a gap we cannot fully see is worse than an honest partial one.
 *
 * So: every row is a stored fact, nothing is generated, and the absence of
 * lifestyle data is stated rather than left to look like a quiet patient.
 */

interface Reading {
  date: string | null;
  kind: string | null;
  bas: number | null;
  has_score: boolean;
  captured_by: string | null;
  marker_count: number;
}
interface Commitment {
  commitment?: string;
  category?: string;
  timeframe?: string;
  committed_at?: string;
  followed_up?: boolean;
}
interface Note {
  id: number;
  kind: string;
  body: string;
  target: string | null;
  practitioner_name: string | null;
  created_at: string;
  progress?: PlanProgress | null;
}
interface Between {
  readings: Reading[];
  commitments: Commitment[];
  notes: Note[];
  lifestyle_available: boolean;
  lifestyle_note: string;
}

const KIND_LABEL: Record<string, string> = {
  panel: 'Lipid panel',
  insulin: 'Insulin panel · clinic',
  body: 'Measurements',
  other: 'Entry',
};

export function BetweenVisits({ patientSessionId, colors }: { patientSessionId: string; colors: any }) {
  const [data, setData] = useState<Between | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getIdToken();
    if (!token || !patientSessionId) return;
    setLoading(true);
    fetch(`/api/clinician/${patientSessionId}/between`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientSessionId]);

  const plan = (data?.notes ?? []).filter((n) => n.kind === 'plan');
  const otherNotes = (data?.notes ?? []).filter((n) => n.kind !== 'plan');
  const label = { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#a3b4b4', marginBottom: 8 };

  return (
    <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,.03)', border: `1px solid ${colors.cardBorder}` }}>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Between visits</div>
      <div style={{ fontSize: 12, color: '#a3b4b4', marginTop: 2, marginBottom: 14 }}>
        What happened since you last saw them. Every row is stored or counted; nothing here is generated.
      </div>

      {loading && <div style={{ fontSize: 12.5, color: '#a3b4b4' }}>Loading…</div>}

      {!loading && data && (
        <>
          {/* The plan leads: the consult starts from what was agreed and how it
              went, counted by the Truth Engine, before any other evidence. */}
          <div style={label}>How your plan went</div>
          {plan.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#a3b4b4', marginBottom: 14 }}>
              No plan lines yet. Lines you write after this consult are tracked here.
            </div>
          ) : (
            <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.map((n) => (
                <div key={n.id} style={{ fontSize: 12.5, color: '#c3d0d0' }}>
                  <div>
                    <span style={{ color: '#a4d65e' }}>◆</span> {n.body}
                    {n.target ? <span style={{ color: '#a4d65e' }}>: {n.target}</span> : null}
                  </div>
                  <div style={{ marginTop: 4, paddingLeft: 16 }}>
                    <ProgressBadge progress={n.progress} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={label}>Readings taken ({data.readings.length})</div>
          {data.readings.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#a3b4b4', marginBottom: 14 }}>
              No readings in this period.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {data.readings.map((r, i) => (
                <div key={`${r.date}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i ? `1px solid ${colors.cardBorder}` : undefined }}>
                  <span style={{ fontSize: 12, color: '#a3b4b4', width: 86, flexShrink: 0 }}>{r.date}</span>
                  <span style={{ flex: 1, fontSize: 12.5, minWidth: 0 }}>{KIND_LABEL[r.kind || 'other'] || 'Entry'}</span>
                  {r.bas != null ? (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#a4d65e', flexShrink: 0 }}>BAS {r.bas.toFixed(1)}</span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: '#f97316', flexShrink: 0 }}>no score</span>
                  )}
                  <span style={{ fontSize: 11, flexShrink: 0, color: r.captured_by ? '#a3b4b4' : 'rgba(255,255,255,.3)', fontStyle: r.captured_by ? 'normal' : 'italic' }}>
                    {r.captured_by || 'source not recorded'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={label}>Their own commitments, made with the coach ({data.commitments.length})</div>
          {data.commitments.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#a3b4b4', marginBottom: 14 }}>
              Nothing recorded.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {data.commitments.map((c, i) => (
                <div key={i} style={{ fontSize: 12.5, padding: '5px 0', color: '#c3d0d0' }}>
                  • {c.commitment || c.category || 'Commitment'}
                  {c.timeframe ? <span style={{ color: '#a3b4b4' }}> · {c.timeframe}</span> : null}
                  {c.followed_up ? <span style={{ color: '#a4d65e' }}> · followed up</span> : <span style={{ color: '#f97316' }}> · open</span>}
                </div>
              ))}
            </div>
          )}

          {otherNotes.length > 0 && (
            <>
              <div style={label}>Your notes ({otherNotes.length})</div>
              <div style={{ marginBottom: 14 }}>
                {otherNotes.map((n) => (
                  <div key={n.id} style={{ fontSize: 12.5, padding: '5px 0', color: '#c3d0d0' }}>
                    <span style={{ color: '#a3b4b4' }}>•</span> {n.body}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* The honest handover the storyboard asks for at the end of this
              frame: say what is missing rather than letting a sparse view read
              as a quiet patient. */}
          {!data.lifestyle_available && (
            <div style={{ fontSize: 11.5, lineHeight: 1.5, padding: '10px 12px', borderRadius: 9, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)', color: '#f97316' }}>
              {data.lifestyle_note} A sparse view here means we cannot see the
              gap, not that nothing happened in it.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BetweenVisits;
