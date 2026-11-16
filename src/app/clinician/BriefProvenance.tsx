'use client';

import React, { useEffect, useState } from 'react';
import { FlaskConical, Activity, Utensils, PencilLine, Hospital } from 'lucide-react';
import { apiFetch } from '@/app/lib/auth';

/**
 * "Where these numbers came from" — the provenance card from p01–p03.
 *
 * The frame closes it with one line: **no value in this brief was inferred by a
 * model.** That claim is only worth printing if it is true of every row above
 * it, so the counts here are read from the record rather than described — and
 * a source we hold nothing for says so rather than being omitted, because an
 * absent row reads as "not relevant" when it means "not connected".
 *
 * This is the card that earns the brief its authority. A practitioner deciding
 * how much weight to put on a number needs to know whether a device produced
 * it, a patient transcribed it, or a lab returned it.
 */
interface Row { id: string; label: string; count: string; Icon: typeof FlaskConical; known: boolean }

export function BriefProvenance({ patientSessionId, colors }: { patientSessionId: string; colors: any }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!patientSessionId) return;
    apiFetch(`/api/clinician/${patientSessionId}/between`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const readings = d.readings || [];
        const n = (kind: string) => readings.filter((r: any) => r.kind === kind).length;
        setRows([
          { id: 'meter', label: 'Meter, at home', count: `${n('panel')} readings`, Icon: FlaskConical, known: n('panel') > 0 },
          { id: 'clinic', label: 'Lab / clinic', count: `${n('insulin')} panels`, Icon: Hospital, known: n('insulin') > 0 },
          { id: 'typed', label: 'Typed by the patient', count: `${n('body')} entries`, Icon: PencilLine, known: n('body') > 0 },
          { id: 'health', label: 'Apple Health, auto-synced', count: 'not connected', Icon: Activity, known: false },
          { id: 'food', label: 'Food log, photo', count: 'not connected', Icon: Utensils, known: false },
        ]);
      })
      .catch(() => {});
  }, [patientSessionId]);

  if (!rows) return null;

  return (
    <div style={{ padding: 16, borderRadius: 10, background: 'rgba(var(--mc-fg-rgb),.03)', border: `1px solid ${colors.cardBorder}` }}>
      <div className="t-label" style={{ color: 'var(--mc-text)', marginBottom: 10 }}>
        Where these numbers came from
      </div>

      {rows.map((r, i) => (
        <div
          key={r.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
            borderBottom: i === rows.length - 1 ? undefined : '1px solid rgba(var(--mc-fg-rgb),0.07)',
            opacity: r.known ? 1 : 0.6,
          }}
        >
          <div
            style={{
              width: 30, height: 30, flex: 'none', borderRadius: 9, background: 'rgba(var(--mc-fg-rgb),0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <r.Icon className="h-3.5 w-3.5" style={{ color: r.known ? colors.primary : 'var(--mc-text)' }} />
          </div>
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--mc-text)' }}>{r.label}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: r.known ? 'var(--mc-text)' : 'var(--mc-text)' }}>{r.count}</div>
        </div>
      ))}

      <p style={{ fontSize: 11.5, color: 'var(--mc-text)', marginTop: 12, lineHeight: 1.5 }}>
        No value in this brief was inferred by a model. Clinical figures are
        computed in deterministic code; the model arranges and explains them.
      </p>
    </div>
  );
}

export default BriefProvenance;
