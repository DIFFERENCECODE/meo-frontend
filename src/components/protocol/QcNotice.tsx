'use client';

import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { checkValue, QcField, QcVerdict } from '@/lib/qc';

/**
 * The inline quality-control line under a measurement input.
 *
 * Deliberately not a modal or a toast: the correction belongs next to the
 * number that caused it, while the patient still has the meter in their hand.
 * A `suspect` verdict offers the converted value as a button rather than
 * silently rewriting the field: the patient measured it, so the patient
 * confirms what it was. A `confirm` verdict asks them to look again and keeps
 * the value only once they say that is what the meter showed.
 */
export function useQc(field: QcField, raw: string, enabled = true): QcVerdict {
  // A `confirm` verdict clears once the patient says the value is what the
  // meter showed, for that exact value only: retyping asks again.
  const [confirmedRaw, setConfirmedRaw] = React.useState<string | null>(null);
  return React.useMemo<QcVerdict>(() => {
    if (!enabled || raw.trim() === '') return { level: 'ok' };
    const verdict = checkValue(field, parseFloat(raw));
    if (verdict.level !== 'confirm') return verdict;
    if (confirmedRaw === raw) return { level: 'ok' };
    return { ...verdict, confirm: () => setConfirmedRaw(raw) };
  }, [field, raw, enabled, confirmedRaw]);
}

export function QcNotice({
  verdict,
  onAccept,
}: {
  verdict: QcVerdict;
  /** Called with the corrected value when the patient accepts the conversion. */
  onAccept?: (value: number) => void;
}) {
  if (verdict.level === 'ok') return null;
  const colour =
    verdict.level === 'confirm' ? 'var(--mc-amber)' : verdict.level === 'suspect' ? 'var(--mc-orange)' : '#e57373';

  return (
    <div className="flex items-start gap-2 mt-2" role="status">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: colour }} />
      <div className="min-w-0">
        <p className="t-body2" style={{ color: colour }}>{verdict.message}</p>
        {verdict.suggestion && onAccept && (
          <button
            type="button"
            onClick={() => onAccept(verdict.suggestion!.value)}
            className="inline-flex items-center gap-1 mt-1 t-body2 font-medium underline underline-offset-2"
            style={{ color: colour }}
          >
            {verdict.suggestion.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {verdict.confirm && (
          <button
            type="button"
            onClick={verdict.confirm}
            className="inline-flex items-center gap-1 mt-1 t-body2 font-medium underline underline-offset-2"
            style={{ color: colour }}
          >
            That is what it showed, keep it
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default QcNotice;
