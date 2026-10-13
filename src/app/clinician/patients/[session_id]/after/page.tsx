'use client';

/**
 * After the session (storyboard p06): what goes back into the patient's record.
 *
 * The practitioner's note and plan lines are stored verbatim and attributed;
 * nothing here is drafted or rephrased by a model (see PostConsult's rationale
 * and app/services/practitioner_notes.py). Each line declares what checks it,
 * because a line nobody checks is a line nobody follows.
 */

import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { getIdToken } from '@/app/lib/auth';
import { Btn, Card, Label, Screen, T, firstName, useAuthed, usePatient } from '../../../ui';
import { usePanel } from '../../../panel-context';
import { Columns, Note, PatientHeader, SOURCE_LABEL, VERDICT, fmtDay, usePatientId } from '../shared';

interface Draft { key: number; body: string; target: string; source: string }

const SOURCES = ['meals', 'steps', 'sleep', 'readings', 'none'];
const blank = (key: number): Draft => ({ key, body: '', target: '', source: 'meals' });

const field: React.CSSProperties = {
  background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  color: T.text, fontFamily: 'inherit', fontSize: 13.5, padding: '9px 12px', outline: 'none', minWidth: 0,
};

export default function AfterPage() {
  const id = usePatientId();
  const patient = usePatient(id);
  const notes = useAuthed<Note[]>(id ? `/api/clinician/${encodeURIComponent(id)}/notes` : null);
  const { reload: reloadPanel } = usePanel();
  const name = firstName(patient.data?.patient_name);

  const [note, setNote] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([blank(1)]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = drafts.filter((d) => d.body.trim());
  const canSend = (note.trim() || ready.length) && !sending;
  const update = (key: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const post = async (payload: object) => {
    const res = await fetch(`/api/clinician/${id}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getIdToken()}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.detail || d.error || `The record refused it (${res.status}).`);
    }
  };

  const send = async () => {
    setSending(true);
    setError(null);
    setSent(null);
    try {
      if (note.trim()) await post({ body: note.trim(), kind: 'note' });
      for (const d of ready) {
        await post({ body: d.body.trim(), kind: 'plan', target: d.target.trim() || null, source: d.source });
      }
      const n = ready.length;
      setSent(`Sent to ${name}'s record: ${note.trim() ? 'your note' : ''}${note.trim() && n ? ' and ' : ''}${n ? `${n} plan line${n === 1 ? '' : 's'}` : ''}.`);
      setNote('');
      setDrafts([blank(Date.now())]);
      notes.reload();
      reloadPanel();
    } catch (e: any) {
      setError(`${e.message} Nothing after that point was sent; check the record and try again.`);
    } finally {
      setSending(false);
    }
  };

  const active = (notes.data ?? []);
  const activePlan = active.filter((n) => n.kind === 'plan');

  return (
    <Screen
      header={
        <PatientHeader id={id} title="After the session" sub={(nm) => `${nm} · what goes back into their record`} />
      }
    >
      <Columns
        left={
          <>
            <Card>
              <Label color={T.lime} style={{ marginBottom: 10 }}>Your note to {name}</Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                aria-label={`Your note to ${name}`}
                placeholder="In your words. They see it exactly as written, with your name on it."
                style={{ ...field, width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.55, fontSize: 14.5, padding: '12px 16px' }}
              />
            </Card>

            <Card>
              <Label color={T.lime} style={{ marginBottom: 6 }}>What MeO will hold {name} to</Label>
              <div style={{ fontSize: 12, color: T.dim, marginBottom: 8 }}>
                One line per habit. Say what checks it, so the line can report how it&apos;s going.
              </div>
              {drafts.map((d, i) => (
                <div key={d.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0', borderTop: i ? `1px solid ${T.rowBorder}` : undefined }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 24, height: 24, flex: 'none', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.body.trim() ? 'rgba(164,214,94,0.18)' : 'rgba(255,255,255,0.06)' }}>
                      <Check size={14} color={d.body.trim() ? T.lime : T.dim} aria-hidden />
                    </div>
                    <input value={d.body} onChange={(e) => update(d.key, { body: e.target.value })} placeholder="Dinner before 21:00"
                      aria-label="Plan line" style={{ ...field, flex: 1 }} />
                    <input value={d.target} onChange={(e) => update(d.key, { target: e.target.value })} placeholder="4 nights a week"
                      aria-label="How often" style={{ ...field, width: 170 }} />
                    {drafts.length > 1 && (
                      <button aria-label="Remove this line" className="mc-press" onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                        style={{ background: 'transparent', border: 0, color: T.dim, cursor: 'pointer', padding: 4 }}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div role="radiogroup" aria-label="Checked against" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 32 }}>
                    {SOURCES.map((s) => (
                      <button key={s} role="radio" aria-checked={d.source === s} className="mc-press" onClick={() => update(d.key, { source: s })}
                        style={{
                          fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 999, padding: '4px 11px',
                          color: d.source === s ? T.ink : T.muted, background: d.source === s ? T.lime : T.chip,
                          border: `1px solid ${d.source === s ? T.lime : T.chipBorder}`,
                        }}>
                        {SOURCE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button className="mc-press" onClick={() => setDrafts((ds) => [...ds, blank(Date.now())])}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, background: 'transparent', border: 0, color: T.lime, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0' }}>
                <Plus size={15} /> Add a line
              </button>
            </Card>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Btn primary onClick={send} disabled={!canSend}>{sending ? 'Sending…' : `Send to ${name}'s record`}</Btn>
              {sent && <span role="status" style={{ fontSize: 13, color: T.lime }}>{sent}</span>}
              {error && <span role="alert" style={{ fontSize: 13, color: T.orange }}>{error}</span>}
            </div>
          </>
        }
        right={
          <>
            <Card>
              <Label style={{ marginBottom: 6 }}>What happens next</Label>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                {name === 'them' ? 'They see' : `${name} sees`} each line on their plan, in your words and under your name.
                Their assistant explains the lines and never changes them; a change is yours to make.
                Each line with a check is counted from their data, and a line well short over two weeks
                moves them up your panel.
              </div>
            </Card>
            <Card>
              <Label style={{ marginBottom: 6 }}>Already in their record</Label>
              {activePlan.length === 0 && active.length === 0 ? (
                <div style={{ fontSize: 13, color: T.muted }}>Nothing yet.</div>
              ) : (
                active.map((n) => {
                  const v = n.kind === 'plan' ? VERDICT[n.progress?.status ?? ''] : null;
                  return (
                    <div key={n.id} style={{ padding: '7px 0', borderTop: `1px solid ${T.rowBorder}` }}>
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.45 }}>
                        {n.kind === 'plan' ? n.body : `"${n.body.length > 140 ? `${n.body.slice(0, 140)}…` : n.body}"`}
                        {n.target ? <span style={{ color: T.lime }}>: {n.target}</span> : null}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>
                        {n.practitioner_name || 'Practitioner'} · {fmtDay(n.created_at)}
                        {v && <span style={{ color: v.color }}> · {v.label}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </>
        }
      />
    </Screen>
  );
}
