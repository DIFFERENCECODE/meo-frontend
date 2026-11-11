// Shared helpers for the Activity list + measurement-detail pages.
import { Sigma, Waves, FlaskConical, Droplet, ClipboardPen, Activity, TestTube } from 'lucide-react';

export interface Measurement {
  time: string;
  name: string;
  unit: string;
  value: number;
  source?: string | null;
  measurementSeries?: string | null;
  recordType?: string | null;
  subjectState?: string | null;
  sampleSource?: string | null;
  deviceClass?: string | null;
  recordId?: string | null;
}

export type SrcType = 'computed' | 'lipid' | 'cgm' | 'ketone' | 'lab' | 'integration' | 'manual' | 'recorded';

// Composite/derived metrics — shown in their own group, never mixed with raw
// device readings. Fallback for rows whose source tag isn't set yet.
export const INDEX_ANALYTES = new Set([
  'BAS', 'VAT', 'BMI', 'WWI', 'LAP', 'HOMA_IR', 'HOMA-IR', 'MetsIR', 'MetsVF', 'TyG',
]);

// Metrics we surface as the session "headline" on the collapsed card.
export const HEADLINE_ORDER = ['BAS', 'Glucose', 'Insulin', 'Total Cholesterol', 'HDL', 'LDL'];

export function classify(m: Measurement): SrcType {
  const s = (m.source || '').toUpperCase();
  const dc = (m.deviceClass || '').toUpperCase();
  if (s === 'INDICES' || dc === 'COMPUTED' || INDEX_ANALYTES.has(m.name)) return 'computed';
  if (dc === 'LIPID_METER') return 'lipid';
  if (dc === 'CGM') return 'cgm';
  if (dc === 'KETONE_METER') return 'ketone';
  if (dc === 'LAB' || dc === 'LABORATORY') return 'lab';
  if (dc === 'MANUAL') return 'manual';
  if (s === 'INTEGRATION') return 'integration';
  if (s === 'INCOMING') return 'manual';
  return 'recorded';
}

export const SRC_META: Record<SrcType, { label: string; color: string; Icon: any; title: string }> = {
  computed: { label: 'Computed', color: '#b79ce0', Icon: Sigma, title: 'Metabolic metrics' },
  lipid: { label: 'Lipid meter', color: '#e58a72', Icon: Droplet, title: 'Lipid panel' },
  cgm: { label: 'CGM', color: '#6fb7d6', Icon: Activity, title: 'Continuous glucose' },
  ketone: { label: 'Ketone meter', color: '#e6b95a', Icon: FlaskConical, title: 'Blood ketones' },
  lab: { label: 'Lab', color: '#a4d65e', Icon: TestTube, title: 'Lab panel' },
  integration: { label: 'Integration', color: '#6fb7d6', Icon: Waves, title: 'Device panel' },
  manual: { label: 'Manual entry', color: '#8fa89c', Icon: ClipboardPen, title: 'Panel' },
  recorded: { label: 'Recorded', color: '#8fa89c', Icon: Droplet, title: 'Panel' },
};

export interface Session {
  id: string;
  dateKey: string;
  dateLabel: string;
  type: SrcType;
  series?: string | null;
  timeStart: string;
  timeEnd: string;
  items: Measurement[];
}

// The measurement ID for a reading. Prefers the stored recordId tag; when a
// legacy row was written before recordId existed, derive the SAME deterministic
// id the backend would assign ({series}__{analyte} for computed, +__{HHMMSS} for
// timed readings) so an id is always shown.
export function displayId(m: Measurement): string {
  if (m.recordId) return String(m.recordId);
  const series = m.measurementSeries || '';
  if (!series) return '';
  const analyte = (m.name || '').replace(/[^A-Za-z0-9]+/g, '');
  if (classify(m) === 'computed') return `${series}__${analyte}`;
  const hhmmss = new Date(m.time).toISOString().slice(11, 19).replace(/:/g, '');
  return `${series}__${analyte}__${hhmmss}`;
}

export const dateKeyOf = (t: string) => new Date(t).toISOString().slice(0, 10);
export const dateLabelOf = (t: string) =>
  new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
export const timeLabelOf = (t: string) =>
  new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const CANONICAL_UNITS: Record<string, string[]> = {
  Glucose: ['mMol', 'mmol/L'],
  Insulin: ['uIU/mL', 'µIU/ml', 'uIU/ml'],
  LDL: ['mMol'], HDL: ['mMol'], 'Total Cholesterol': ['mMol'], Triglycerides: ['mMol'],
  HbA1c: ['pct', '%'], Weight: ['kg'], Height: ['cm'], Waist: ['cm'], Hip: ['cm'],
};

// Extract measurements from the /api/user-data response + dedupe unit variants.
export function extractMeasurements(data: any): Measurement[] {
  let entries: Measurement[] = [];
  if (data?.measurements?.length > 0) {
    entries = data.measurements;
  } else if (data?.bio_age_data?.records?.length > 0) {
    entries = data.bio_age_data.records.map((r: any) => ({
      time: new Date(r.time).toISOString(),
      name: r.analyte || 'BAS',
      unit: r.unit || '',
      value: r.value,
      source: 'INDICES',
    }));
  }
  entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const byKey = new Map<string, Measurement>();
  for (const m of entries) {
    const key = `${m.time}|${m.name}`;
    const existing = byKey.get(key);
    const canonical = CANONICAL_UNITS[m.name];
    const isCanonical = canonical ? canonical.includes(m.unit) : true;
    if (!existing) byKey.set(key, m);
    else {
      const existingIsCanonical = canonical ? canonical.includes(existing.unit) : true;
      if (isCanonical && !existingIsCanonical) byKey.set(key, m);
    }
  }
  return Array.from(byKey.values());
}

const byTimeDescName = (a: Measurement, b: Measurement) =>
  new Date(b.time).getTime() - new Date(a.time).getTime() || a.name.localeCompare(b.name);

// Build sessions for one day's measurements: computed metrics collapse into one
// card; raw readings group by their test session (measurementSeries).
function sessionsForDay(dayKey: string, dayLabel: string, items: Measurement[]): Session[] {
  const sessions: Session[] = [];
  const computed = items.filter((m) => classify(m) === 'computed');
  const raw = items.filter((m) => classify(m) !== 'computed');

  if (computed.length) {
    const times = computed.map((m) => m.time).sort();
    sessions.push({
      id: `computed-${dayKey}`,
      dateKey: dayKey, dateLabel: dayLabel, type: 'computed',
      timeStart: times[0], timeEnd: times[times.length - 1],
      items: computed.slice().sort(byTimeDescName),
    });
  }

  const groups = new Map<string, Measurement[]>();
  for (const m of raw) {
    const gk = m.measurementSeries || `t-${new Date(m.time).toISOString().slice(0, 16)}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk)!.push(m);
  }
  for (const [gk, gitems] of groups) {
    const times = gitems.map((m) => m.time).sort();
    sessions.push({
      id: gk,
      dateKey: dayKey, dateLabel: dayLabel, type: classify(gitems[0]),
      series: gitems[0].measurementSeries,
      timeStart: times[0], timeEnd: times[times.length - 1],
      items: gitems.slice().sort(byTimeDescName),
    });
  }
  // latest session (by end time) first within the day
  return sessions.sort((a, b) => new Date(b.timeEnd).getTime() - new Date(a.timeEnd).getTime());
}

export interface DayGroup { dateKey: string; dateLabel: string; sessions: Session[]; }

export function buildDayGroups(measurements: Measurement[]): DayGroup[] {
  const byDate = new Map<string, Measurement[]>();
  for (const m of measurements) {
    const k = dateKeyOf(m.time);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(m);
  }
  const groups: DayGroup[] = [];
  for (const [k, items] of byDate) {
    groups.push({ dateKey: k, dateLabel: dateLabelOf(items[0].time), sessions: sessionsForDay(k, dateLabelOf(items[0].time), items) });
  }
  // newest day first; tiebreak by newest session timestamp
  return groups.sort(
    (a, b) =>
      b.dateKey.localeCompare(a.dateKey) ||
      new Date(b.sessions[0]?.timeEnd || 0).getTime() - new Date(a.sessions[0]?.timeEnd || 0).getTime(),
  );
}

export function findSessionById(measurements: Measurement[], id: string): Session | null {
  for (const day of buildDayGroups(measurements)) {
    const s = day.sessions.find((x) => x.id === id);
    if (s) return s;
  }
  return null;
}

// The value shown on the collapsed card as the session summary.
export function headlineOf(sess: Session): { value: string; unit: string; name: string } | null {
  if (!sess.items.length) return null;
  for (const h of HEADLINE_ORDER) {
    const m = sess.items.find((x) => x.name === h);
    if (m) return { value: typeof m.value === 'number' ? m.value.toFixed(m.name === 'BAS' ? 1 : 2) : String(m.value), unit: m.name === 'BAS' ? 'yrs' : m.unit, name: m.name };
  }
  const m = sess.items[0];
  return { value: typeof m.value === 'number' ? m.value.toFixed(2) : String(m.value), unit: m.unit, name: m.name };
}
