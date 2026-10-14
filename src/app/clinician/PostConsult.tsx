'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/app/lib/auth';

/**
 * The post-consult composer — the practitioner end of the loop.
 *
 * Writes straight into the patient's record. Three things are deliberate:
 *
 * - **Nothing is drafted by the model.** This is the one surface where a human's
 *   clinical instruction reaches a patient, and a suggested draft would quietly
 *   become the practitioner's words once accepted. The safety guard scans model
 *   output; it would not scan this, and it should not have to.
 * - **A plan line must declare what checks it.** Picking "not automatically
 *   checked" is allowed and honest — what is not allowed is a target that
 *   silently never reports.
 * - **Existing notes are shown while writing**, so a practitioner does not
 *   contradict a colleague or repeat an instruction the patient already has.
 */

const SOURCES = [
  { id: 'meals', label: 'Meal log' },
  { id: 'readings', label: 'Readings' },
  { id: 'steps', label: 'Steps' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'none', label: 'Not checked' },
];

interface Note {
  id: number;
  kind: string;
  body: string;
  target: string | null;
  source: string | null;
  practitioner_name: string | null;
  created_at: string;
}

export function PostConsult({ patientSessionId, colors }: { patientSessionId: string; colors: any }) {
  const [kind, setKind] = useState<'note' | 'plan'>('note');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('');
  const [source, setSource] = useState('meals');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Note[]>([]);

  const load = useCallback(() => {
    if (!patientSessionId) return;
    apiFetch(`/api/clinician/${patientSessionId}/notes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setExisting(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [patientSessionId]);

  useEffect(load, [load]);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/clinician/${patientSessionId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: text,
          kind,
          target: kind === 'plan' ? target.trim() || null : null,
          source: kind === 'plan' ? source : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || d.error || `Server returned ${res.status}`);
      }
      setBody('');
      setTarget('');
      load();
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) => ({
    fontSize: 11.5,
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
    color: active ? '#a4d65e' : 'rgba(255,255,255,.65)',
    background: active ? 'rgba(164,214,94,.12)' : 'rgba(255,255,255,.06)',
    border: `1px solid ${active ? 'rgba(164,214,94,.45)' : 'rgba(255,255,255,.14)'}`,
  });

  return (
    <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,.03)', border: `1px solid ${colors.cardBorder}` }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>After the consult</div>
      <div style={{ fontSize: 12, color: '#a3b4b4', marginBottom: 12 }}>
        Goes straight onto the patient&apos;s record, in your name and your words.
        Nothing here is written or rephrased by MeO.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button onClick={() => setKind('note')} style={chip(kind === 'note')}>Note</button>
        <button onClick={() => setKind('plan')} style={chip(kind === 'plan')}>Plan line</button>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={kind === 'plan' ? 'Dinner before 21:00' : 'What you want them to know…'}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
          background: 'rgba(0,0,0,.2)', border: `1px solid ${colors.cardBorder}`,
          color: '#fff', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical',
        }}
      />

      {kind === 'plan' && (
        <>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target — e.g. 4 nights a week"
            style={{
              width: '100%', boxSizing: 'border-box', marginTop: 8, padding: '9px 12px',
              borderRadius: 10, background: 'rgba(0,0,0,.2)', border: `1px solid ${colors.cardBorder}`,
              color: '#fff', fontSize: 13, fontFamily: 'inherit',
            }}
          />
          <div style={{ fontSize: 11, color: '#a3b4b4', margin: '10px 0 6px' }}>
            Checked against
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SOURCES.map((s) => (
              <button key={s.id} onClick={() => setSource(s.id)} style={chip(source === s.id)}>{s.label}</button>
            ))}
          </div>
        </>
      )}

      {error && <div style={{ fontSize: 12, color: '#f97316', marginTop: 10 }}>{error}</div>}

      <button
        onClick={submit}
        disabled={saving || !body.trim()}
        style={{
          marginTop: 12, padding: '10px 18px', borderRadius: 10, border: 0,
          background: colors.primary, color: colors.primaryForeground,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          opacity: saving || !body.trim() ? 0.5 : 1,
        }}
      >
        {saving ? 'Sending…' : 'Send to patient'}
      </button>

      {existing.length > 0 && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${colors.cardBorder}`, paddingTop: 14 }}>
          {/* The frame's heading, and it is the right one: these are not notes
              on file, they are things the system will check. */}
          <div className="t-label" style={{ color: '#a3b4b4', marginBottom: 10 }}>
            What MeO will hold them to
          </div>
          {existing.map((n, i) => {
            const src = SOURCES.find((x) => x.id === n.source);
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0',
                  borderBottom: i === existing.length - 1 ? undefined : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span
                  style={{
                    width: 20, height: 20, flex: 'none', borderRadius: 6, marginTop: 1,
                    background: n.kind === 'plan' ? 'rgba(164,214,94,0.15)' : 'rgba(255,255,255,0.06)',
                    color: n.kind === 'plan' ? '#a4d65e' : '#a3b4b4',
                    fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {n.kind === 'plan' ? '✓' : '•'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: '#ffffff' }}>
                    {n.body}
                    {n.target ? <span style={{ color: '#a4d65e' }}> — {n.target}</span> : null}
                  </div>
                  <div style={{ fontSize: 11, color: '#a3b4b4', marginTop: 2 }}>
                    {n.kind === 'plan'
                      ? (src && n.source !== 'none'
                          ? `checked from ${src.label.toLowerCase()}`
                          : 'not automatically checked')
                      : 'note — visible to them, not checked'}
                  </div>
                </div>
              </div>
            );
          })}

          {/* The frame carries a "Not built yet" banner here. It is now out of
              date: this screen writes into the patient's record, and /plan and
              /from-practitioner read it back. Said plainly rather than left for
              someone to wonder. */}
          <p style={{ fontSize: 11.5, color: '#a3b4b4', marginTop: 12, lineHeight: 1.5 }}>
            Everything above is on their record now — they see it under
            <b style={{ color: '#ffffff' }}> My plan</b> and
            <b style={{ color: '#ffffff' }}> From your practitioner</b>, in your
            name and your words.
          </p>
        </div>
      )}
    </div>
  );
}

export default PostConsult;
