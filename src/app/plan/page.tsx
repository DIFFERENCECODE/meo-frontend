'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import {
  usePractitionerNotes, fmtNoteDate, PROGRESS_META, type PractitionerNote,
} from '@/components/record/PractitionerNotes';
import { shortPractitionerName } from '@/components/record/PractitionerNotes';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';
import { InfoTip } from '@/components/tour/InfoTip';

/**
 * My plan (storyboard frame 09): the practitioner's plan, not a generated one.
 *
 * What a named human asked this patient to do, in their words, with the count
 * MeO keeps beside each line. MeO's job here is narrow on purpose: it holds the
 * lines and checks them against what the meter and phone record. It does not
 * write them, rank them, or soften them, and the screen says so.
 */

const C = {
  card: 'var(--mc-card)', border: 'rgba(var(--mc-fg-rgb),0.12)', lime: 'var(--mc-accent)',
  muted: 'var(--mc-text)', dim: 'var(--mc-text)', row: 'rgba(var(--mc-fg-rgb),0.08)',
};

const FROM: Record<string, string> = {
  meals: 'from your food log', steps: 'from your steps', sleep: 'from your sleep',
  readings: 'from your meter', none: 'not checked automatically',
};

function Label({ children, color = C.dim }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>{children}</div>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 22px', ...style }}>{children}</section>;
}

/** "5 of 8" in the line's own colour, or the verdict when there is nothing to count. */
function Count({ n }: { n: PractitionerNote }) {
  const p = n.progress;
  const meta = PROGRESS_META[p?.status ?? ''] ?? PROGRESS_META.unavailable;
  const counted = p && p.expected != null && !['no_data', 'too_early', 'not_measurable'].includes(p.status);
  return (
    <span title={p?.summary} style={{ fontSize: 15, fontWeight: 700, color: meta.color, whiteSpace: 'nowrap' }}>
      {counted ? `${p!.qualifying_days ?? 0} of ${p!.expected}` : meta.label.toLowerCase()}
    </span>
  );
}

function PlanInner() {
  const { notes, state } = usePractitionerNotes();
  const plan = (notes ?? []).filter((n) => n.kind === 'plan');
  const note = (notes ?? []).find((n) => n.kind === 'note');
  const author = plan[0]?.practitioner_name || note?.practitioner_name || 'Your practitioner';
  const first = shortPractitionerName(author);
  const initial = (author || 'P').replace(/^(dr|prof)\.?\s+/i, '').slice(0, 1).toUpperCase();
  const agreed = plan.length ? fmtNoteDate(plan[plan.length - 1].created_at) : null;

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title="My plan"
        subtitle={plan.length ? `Set by ${author} on ${agreed} · reviewed at every consult` : 'Written by your practitioner after a consultation'}
        right={plan.length ? <Chip>{plan.length} line{plan.length === 1 ? '' : 's'}</Chip> : undefined}
      />
      <ScreenBody>
        {state === 'loading' && <p style={{ fontSize: 15.5, color: C.dim }}>Loading your plan…</p>}
        {state === 'error' && <p style={{ fontSize: 15.5, color: C.muted }}>Couldn&apos;t load your plan. Refresh to try again.</p>}

        {state === 'ready' && plan.length === 0 && (
          <Card style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No plan yet</p>
            <p style={{ fontSize: 15.5, color: C.muted, margin: '6px 0 0', lineHeight: 1.55 }}>
              A plan appears here after a consultation, written by the practitioner you book with.
              Nothing on this screen is generated.
            </p>
            <Link href="/marketplace" className="meo-press inline-block no-underline"
              style={{ marginTop: 14, padding: '10px 16px', borderRadius: 10, background: C.lime, color: 'var(--mc-on-accent)', fontSize: 15.5, fontWeight: 600 }}>
              Find a practitioner
            </Link>
          </Card>
        )}

        {state === 'ready' && plan.length > 0 && (
          <div className="flex flex-col min-w-0" style={{ gap: 14 }}>
            <div className="flex flex-col min-w-0" style={{ gap: 14 }}>
              {/* Who wrote it, and why, in their words. A plan with no author is advice from nobody. */}
              <div data-tour="plan-author">
              <Card style={{ borderColor: 'rgba(var(--mc-accent-rgb),0.35)' }}>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <div className="flex items-center justify-center" style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: 'rgba(var(--mc-accent-rgb),0.2)', color: C.lime, fontWeight: 700 }}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{author}</div>
                    <div style={{ fontSize: 13.5, color: C.dim }}>wrote this plan after your {agreed} consult</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.lime, border: '1px solid rgba(var(--mc-accent-rgb),0.45)', borderRadius: 999, padding: '4px 12px', whiteSpace: 'nowrap' }}>
                    your practitioner
                  </span>
                </div>
                {note && (
                  <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'var(--mc-text)', margin: '14px 0 0', whiteSpace: 'pre-wrap' }}>
                    &ldquo;{note.body}&rdquo;
                  </p>
                )}
              </Card>
              </div>

              <div data-tour="plan-lines">
              <Card>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <Label color={C.lime}>What {first} asked for</Label>
                  <span><Chip>MeO checks each one</Chip><InfoTip text="MeO counts each line against what you log over the last 14 days. '4 of 8' means 4 of the 8 times expected. 'Nothing recorded' means nothing was logged, not that you didn't do it." /></span>
                </div>
                {plan.map((n, i) => (
                  <div key={n.id} className="flex items-center" style={{ gap: 12, padding: '11px 0', borderTop: i ? `1px solid ${C.row}` : undefined }}>
                    <div className="flex items-center justify-center" style={{ width: 24, height: 24, flex: 'none', borderRadius: 7, background: 'rgba(var(--mc-accent-rgb),0.18)' }}>
                      <Check className="h-3.5 w-3.5" style={{ color: C.lime }} />
                    </div>
                    <div className="flex-1 min-w-0" style={{ fontSize: 16 }}>
                      {n.body}{n.target ? <span style={{ color: C.muted }}>, {n.target}</span> : null}
                    </div>
                    <Count n={n} />
                    <div className="hidden md:block" style={{ width: 150, textAlign: 'right', fontSize: 13.5, color: C.dim }}>{FROM[n.source ?? 'none'] ?? FROM.none}</div>
                  </div>
                ))}
                <div style={{ fontSize: 13.5, color: C.dim, borderTop: `1px solid ${C.row}`, paddingTop: 10, marginTop: 2 }}>
                  {first} sets the plan. MeO only checks it against what your meter and phone already record.
                </div>
              </Card>
              </div>
            </div>

            <div className="grid gap-[14px] md:grid-cols-2 items-start">
              <Card>
                <Label>At your next consult</Label>
                <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, margin: '8px 0 0' }}>
                  {first} sees the same {plan.length} line{plan.length === 1 ? '' : 's'}, with what actually happened beside each.
                  Nothing you do here is hidden from {first}, and nothing {first} writes is hidden from you.
                </p>
              </Card>
              <Card style={{ padding: '14px 18px' }}>
                <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.55, margin: 0 }}>
                  Log meals in the MeO app on your phone; they count here the same day.
                </p>
              </Card>
            </div>
          </div>
        )}
      </ScreenBody>
    </div>
  );
}

export default function PlanPage() {
  return (
    <AppShell askPlaceholder="Ask MeO about your plan…">
      <PlanInner />
    </AppShell>
  );
}
