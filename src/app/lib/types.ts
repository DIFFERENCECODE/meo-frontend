export interface Source {
  source_name: string;
  // original_url can be undefined or null depending on downstream data; accept both
  original_url?: string | null;
  // page_number can be undefined or null
  page_number?: number | null;
  // New fields for graph data from Grafana service
  title?: string;
  category?: string;
  type?: string;
  gap_solved?: string;
}

export type Sender = 'user' | 'meo';

export interface Message {
  text: string;
  sender: Sender;
  sources?: Source[];
}

// --- Grafana Service Data Types ---
export interface BioAgeRecord {
  time: number;
  value: number;
  analyte: string;
  recordType: "CLINICAL" | "TARGET";
  subjectState: string;
  unit?: string;
  measurementSeries?: string;
}

export interface BioAgeData {
  userid: string;
  records: BioAgeRecord[];
  count: number;
}

export interface KraftDataPoint {
  time: number;
  measurementSeries: string;
  analyte: "Insulin" | "Glucose" | "Triglyceride";
  value: number;
  sessionlabel: string;
}

export interface GraphData {
  user_email: string;
  bio_age_data: BioAgeData;
  kraft_curve_data: KraftDataPoint[];
}

export interface BioAgeMetrics {
  baseline: number | null;
  target: number | null;
  improvement: number | null;
  baselineDate: string | null;
  targetDate: string | null;
}


// Sanitise biomarker values before passing to markdown
export function sanitiseBiomarkerValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

// The 4 captured test biomarkers
export interface ClockTestResult {
  glucose_0: number | null;    // mmol/L
  insulin_0: number | null;    // µIU/mL
  glucose_120: number | null;  // mmol/L
  insulin_120: number | null;  // µIU/mL
}
// Verification Checklist
//
// Once done, paste this into a chat message to confirm everything renders:
// ```
// | Biomarker | Value | Unit | Status |
// |---|---|---|---|
// | Glucose_0 | 4.8 | mmol/L | ✅ Normal |
// | Insulin_0 | 9.2 | µIU/mL | ✅ Normal |
// | Glucose_120 | 8.4 | mmol/L | ⚠️ High |
// | Insulin_120 | 78 | µIU/mL | ⚠️ High |
// | HOMA-IR | 1.98 | — | ✅ Normal |
//
// - Clock Score calculated from paired Glucose + Insulin response
// - No partial scoring applied
// ```
