/**
 * Entry-time quality control for measurements.
 *
 * This mirrors `PLAUSIBLE_RANGES` in app/api/personalize.py. It does not
 * replace it: the server stays the authority and still returns 422, because a
 * check that only runs in the browser is a check an API client can skip. What
 * this buys is the *diagnosis* — the server can only say "outside the plausible
 * range", whereas at the point of entry we still know which field was typed and
 * can name the likely cause.
 *
 * Why that matters here specifically: four of seven real panels came back with
 * no BAS score, and two of them were traced to a waist entered as 32 — inches,
 * typed into a centimetres field. That drove METS-VF to -8.36 and the score's
 * domain guard correctly refused to produce a number. Rejecting that input
 * would have been right and useless; 32 is not a typo, it is a correct
 * measurement in the wrong unit, and the reading is recoverable if we say so.
 *
 * So there are three verdicts, not two:
 *   ok      — inside range, submit it
 *   suspect — outside range, but a single unit conversion lands it inside;
 *             offer the converted value and let the patient confirm
 *   reject   — outside range with no plausible reading; ask them to check
 *
 * The conversions below are unit arithmetic (inches→cm, lb→kg, mg/dL→mmol/L),
 * not clinical inference. Nothing here decides anything about a patient; it
 * decides what number they meant to type.
 */

export type QcField =
  | 'Waist'
  | 'Height'
  | 'Weight'
  | 'Glucose'
  | 'Triglyceride'
  | 'HDL'
  | 'LDL'
  | 'Cholesterol'
  | 'Age';

interface Range {
  min: number;
  max: number;
  unit: string;
  /** The unit someone plausibly used instead, and how to get back to ours. */
  confusion?: { from: string; factor: number };
}

const RANGES: Record<QcField, Range> = {
  Waist:        { min: 40,  max: 200, unit: 'cm',      confusion: { from: 'inches', factor: 2.54 } },
  Height:       { min: 100, max: 250, unit: 'cm',      confusion: { from: 'inches', factor: 2.54 } },
  Weight:       { min: 25,  max: 350, unit: 'kg',      confusion: { from: 'pounds', factor: 1 / 2.2046 } },
  Glucose:      { min: 1,   max: 40,  unit: 'mmol/L',  confusion: { from: 'mg/dL', factor: 1 / 18.016 } },
  Triglyceride: { min: 0.1, max: 30,  unit: 'mmol/L',  confusion: { from: 'mg/dL', factor: 1 / 88.57 } },
  HDL:          { min: 0.1, max: 10,  unit: 'mmol/L',  confusion: { from: 'mg/dL', factor: 1 / 38.67 } },
  LDL:          { min: 0.1, max: 20,  unit: 'mmol/L',  confusion: { from: 'mg/dL', factor: 1 / 38.67 } },
  Cholesterol:  { min: 1,   max: 30,  unit: 'mmol/L',  confusion: { from: 'mg/dL', factor: 1 / 38.67 } },
  Age:          { min: 16,  max: 120, unit: 'years' },
};

export interface QcVerdict {
  level: 'ok' | 'suspect' | 'reject';
  message?: string;
  /** Present only on `suspect`: the converted value, ready to accept in one tap. */
  suggestion?: { value: number; label: string };
}

const OK: QcVerdict = { level: 'ok' };

function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

export function checkValue(field: QcField, raw: number): QcVerdict {
  if (!Number.isFinite(raw)) return { level: 'reject', message: 'Enter a number.' };

  const range = RANGES[field];
  if (raw >= range.min && raw <= range.max) return OK;

  // One conversion, tried once. If it lands inside the range, the patient
  // almost certainly measured correctly in a different unit.
  if (range.confusion) {
    const converted = raw * range.confusion.factor;
    if (converted >= range.min && converted <= range.max) {
      const dp = range.unit === 'mmol/L' ? 2 : range.unit === 'kg' ? 1 : 0;
      const value = round(converted, dp);
      return {
        level: 'suspect',
        message: `${raw.toLocaleString()} looks like ${range.confusion.from}, not ${range.unit}.`,
        suggestion: { value, label: `Use ${value} ${range.unit}` },
      };
    }
  }

  return {
    level: 'reject',
    message: `${field.toLowerCase()} should be between ${range.min} and ${range.max} ${range.unit}. Worth re-checking the reading.`,
  };
}

/** True when a value must not be submitted as typed. */
export function blocks(verdict: QcVerdict): boolean {
  return verdict.level !== 'ok';
}
