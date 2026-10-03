'use client';

/**
 * Which lens this practitioner reads a brief through.
 *
 * It is a view preference, not a property of the account: the same person may
 * want the clinical arrangement on one patient and the coaching one on another,
 * and a practice may have a physician and a therapist sharing a login. Backed by
 * localStorage because it is a per-viewer convenience — losing it costs a click,
 * and the backend defaults to the physician lens, which is the most complete and
 * least interpreted of the three.
 *
 * The lens changes ordering and register only. It never changes a value, a
 * threshold, or whether a flag is raised — see PRACTITIONER_PERSONAS in
 * app/agent/prompts.py for why that boundary is load-bearing.
 */
export type Persona = 'physician' | 'therapist' | 'coach';

export const PERSONAS: { id: Persona; label: string; blurb: string }[] = [
  { id: 'physician', label: 'Physician', blurb: 'Biomarkers and scores lead' },
  { id: 'therapist', label: 'Nutritional therapist', blurb: 'Meal timing, macros and adherence lead' },
  { id: 'coach', label: 'Coach', blurb: 'Training load, sleep and recovery lead' },
];

const KEY = 'meo.clinician.persona';

export function getPersona(): Persona {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'physician' || v === 'therapist' || v === 'coach') return v;
  } catch {
    // Private windows and blocked site data both throw here; the default is fine.
  }
  return 'physician';
}

export function setPersona(p: Persona): void {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    // Not worth surfacing: the lens still applies for this page view.
  }
}
