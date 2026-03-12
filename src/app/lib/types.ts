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