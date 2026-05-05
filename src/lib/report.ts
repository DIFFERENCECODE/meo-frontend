/**
 * Metabolic Report — full PDF generator.
 *
 * Brand palette  ← product_landing_page MarketingLandingPage.tsx `C` object
 * Graph colours  ← Grafana panel overrides (named-colour → hex table below)
 * Gauge colours  ← Grafana threshold steps (exact JSON values from dashboards)
 *
 * Grafana named-colour hex map (used verbatim from Grafana source):
 *   green            #73BF69    dark-green     #37872D
 *   semi-dark-green  #56A64B    light-green    #96D98D
 *   yellow           #FADE2A    dark-yellow    #E0B400
 *   orange           #FF9830    dark-orange    #E0752D
 *   red              #F2495C    dark-red       #C4162A
 *
 * BAS gauge thresholds (from 🔶 Biological Age Score.json):
 *   green @ 0 → #EAB839 @ 57.6 → orange @ 70 → red @ 80   (min 21, max 85, unit Age)
 *
 * VAT gauge thresholds (from 🔶 Biological Age Score.json):
 *   green @ 0 → #EAB839 @ 1200                             (min 0, max 2400, unit g)
 *
 * Kraft series colours (from timeseries panel overrides):
 *   Glucose  → yellow         #FADE2A
 *   Insulin  → semi-dark-green #56A64B
 */

import { jsPDF } from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportProfile {
  name: string | null;
  email: string;
  metabolic_goals?: string[];
}
export interface ReportMeasurement {
  time: string;
  name: string;
  value: number;
  unit: string;
}
export interface ReportScores {
  measurementSeries: string | null;
  bas: number | null;
  vat: number | null;
}
export interface ReportKraftMetrics {
  peakGlucose: number;
  peakInsulin: number;
  recoveryTime: string;
  riskScore: number;
  hasRealData: boolean;
}
export interface ReportHistoryPoint {
  time: number;       // epoch ms
  bas: number;
}

// ─── Brand palette ────────────────────────────────────────────────────────────

const BG_DEEP    = '#143730';
const BG_CARD    = '#1e463c';
const BG_HEADER  = '#0a1e18';
const BORDER     = '#2d5548';
const PRIMARY    = '#a4d65e';   // lime-green
const PRIMARY_FG = '#1a3a2a';
const FG         = '#ffffff';
const MUTED      = '#8ab5a0';

// Grafana gauge threshold colours
const G_GREEN    = '#73BF69';
const G_YELLOW   = '#EAB839';
const G_ORANGE   = '#FF9830';
const G_RED      = '#F2495C';

// Grafana series colours
const GLUCOSE_HEX = '#FADE2A';   // yellow
const INSULIN_HEX = '#56A64B';   // semi-dark-green

// Helper: hex string → [r, g, b]
function hex(h: string): [number, number, number] {
  const c = h.replace('#', '');
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
}

// ─── Gauge segments type ──────────────────────────────────────────────────────

interface Seg { from: number; to: number; color: string; }

// ─── Clinical analysis ────────────────────────────────────────────────────────

interface Analysis {
  statusLabel: string;
  statusColor: string;
  headline: string;
  detail: string;
  tips: string[];
}

function basAnalysis(v: number): Analysis {
  if (v < 57.6) return {
    statusLabel: 'Healthy', statusColor: G_GREEN,
    headline: 'Your biological age is within the healthy range.',
    detail: 'Your Kraft Age Score indicates that your metabolic function is well-preserved relative to your chronological age. This reflects good glucose and insulin regulation.',
    tips: [
      'Continue regular metabolic testing (every 6–12 months).',
      'Maintain a balanced diet low in refined carbohydrates.',
      'Prioritise resistance training and 150+ min/week of aerobic activity.',
      'Protect sleep quality — 7–9 hours supports metabolic health.',
    ],
  };
  if (v < 70) return {
    statusLabel: 'Elevated', statusColor: G_YELLOW,
    headline: 'Early metabolic stress detected.',
    detail: 'Your biological age score is above the healthy threshold, suggesting the body may be ageing faster metabolically than chronologically. Early intervention is the most effective approach.',
    tips: [
      'Reduce refined carbohydrates, sugar, and ultra-processed foods.',
      'Add resistance training 3× per week to improve insulin sensitivity.',
      'Consider fasting protocols (16:8 time-restricted eating).',
      'Request a fasting insulin panel from your therapist.',
      'Re-test within 3–6 months to track progress.',
    ],
  };
  if (v < 80) return {
    statusLabel: 'High', statusColor: G_ORANGE,
    headline: 'Significant metabolic dysfunction present.',
    detail: 'Your Kraft Age Score indicates accelerated biological ageing. This is often associated with chronic hyperinsulinemia, impaired glucose metabolism, or elevated visceral adiposity.',
    tips: [
      'Consult your metabolic health therapist promptly.',
      'Consider a low-glycaemic or therapeutic ketogenic diet.',
      'Request a comprehensive hormone and metabolic panel.',
      'Structured supervised exercise programme recommended.',
      'Prioritise stress reduction and sleep optimisation.',
    ],
  };
  return {
    statusLabel: 'Critical', statusColor: G_RED,
    headline: 'Critically elevated — immediate action required.',
    detail: 'Your biological age score is critically high, indicating severe metabolic dysfunction. Without intervention, this trajectory significantly increases cardiometabolic disease risk.',
    tips: [
      'Seek clinical review immediately.',
      'Full metabolic, hormonal, and cardiovascular workup needed.',
      'Therapeutic dietary and lifestyle intervention required under supervision.',
      'Consider referral to an endocrinologist or metabolic specialist.',
    ],
  };
}

function vatAnalysis(v: number): Analysis {
  if (v < 1200) return {
    statusLabel: 'Healthy', statusColor: G_GREEN,
    headline: 'Visceral fat within healthy limits.',
    detail: 'Your KRAFT Deep Fat Score is in the healthy range. Visceral adipose tissue is well-managed, which is strongly associated with lower cardiometabolic risk.',
    tips: [
      'Maintain current lifestyle and dietary habits.',
      'Continue regular metabolic testing.',
      'Monitor trends over time — even small increases warrant attention.',
    ],
  };
  return {
    statusLabel: 'Elevated', statusColor: G_YELLOW,
    headline: 'Excess visceral adiposity detected.',
    detail: 'Your deep fat score is elevated. Visceral fat is metabolically active, releasing inflammatory cytokines that drive insulin resistance, cardiovascular disease, and accelerated ageing.',
    tips: [
      'Reduce refined carbohydrates and added sugar significantly.',
      'Add 150+ min/week of moderate cardiovascular exercise.',
      'Incorporate strength training — muscle tissue reduces visceral fat.',
      'Consider time-restricted eating (16:8) to reduce fasting insulin.',
      'Prioritise 7–9 hours of quality sleep nightly.',
      'Manage chronic stress — cortisol drives visceral fat accumulation.',
    ],
  };
}

function riskAnalysis(risk: number, peakGlucose: number, peakInsulin: number): Analysis {
  const glucoseHigh = peakGlucose >= 7.8;
  const insulinHigh = peakInsulin >= 40;

  if (risk < 50) return {
    statusLabel: 'Low Risk', statusColor: G_GREEN,
    headline: 'Healthy Kraft curve pattern.',
    detail: `Your glucose (peak ${peakGlucose} mMol) and insulin (peak ${peakInsulin} µIU/mL) dynamics during the test are within normal parameters, indicating healthy metabolic flexibility and insulin sensitivity.`,
    tips: [
      'Maintain your current dietary and exercise habits.',
      'Continue metabolic testing annually to track any changes.',
      'Support insulin sensitivity with adequate sleep and stress management.',
    ],
  };
  if (risk < 70) return {
    statusLabel: 'Elevated', statusColor: G_ORANGE,
    headline: 'Impaired metabolic response detected.',
    detail: `Your Kraft curve shows ${glucoseHigh ? `elevated peak glucose (${peakGlucose} mMol, threshold 7.8)` : `normal glucose`}${insulinHigh ? ` and elevated peak insulin (${peakInsulin} µIU/mL, threshold 40 µIU/mL)` : ''}, suggesting developing insulin resistance.`,
    tips: [
      'Reduce post-meal glucose spikes: lower carbohydrate load per meal.',
      'Add a 10–15 min walk after meals to improve glucose clearance.',
      'Increase dietary fibre (vegetables, legumes, nuts).',
      'Consider targeted supplementation: berberine, magnesium glycinate.',
      'Discuss dietary adjustments with your metabolic health therapist.',
    ],
  };
  return {
    statusLabel: 'High Risk', statusColor: G_RED,
    headline: 'Significant insulin resistance pattern.',
    detail: `Your Kraft curve is consistent with marked insulin resistance. Peak glucose ${peakGlucose} mMol and peak insulin ${peakInsulin} µIU/mL indicate the pancreas is overcompensating to manage glucose, a key driver of metabolic disease.`,
    tips: [
      'Clinical review is strongly recommended.',
      'Adopt a low-carbohydrate or therapeutic ketogenic diet.',
      'Structured resistance and aerobic exercise programme (supervised).',
      'Consider extended fasting protocols under clinical supervision.',
      'Request HbA1c, fasting insulin, HOMA-IR, and lipid panel.',
      'Discuss medication review if applicable with your GP.',
    ],
  };
}

// ─── Canvas speedometer gauge ─────────────────────────────────────────────────
//
// Gauge arc: clockwise from 150° (8 o'clock, lower-left) to 30° (4 o'clock, lower-right)
// = 240° total sweep.  Canvas 0° = East (3 o'clock), positive = clockwise.
//
// Angle mapping:
//   fraction f  →  canvas degrees = 150 + f * 240
//   value v     →  f = (v - min) / (max - min)

function drawSpeedometer(opts: {
  value: number;
  min: number;
  max: number;
  segs: Seg[];
  title: string;
  unitSuffix: string;
  decimals: number;
  accentColor: string;
  size?: number;
}): HTMLCanvasElement {
  const { value, min, max, segs, title, unitSuffix, decimals, accentColor, size = 440 } = opts;

  const canvas = document.createElement('canvas');
  const W = size;
  const H = Math.round(size * 0.68);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = BG_CARD;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H * 0.82;
  const R  = W * 0.355;
  const TW = R * 0.20;   // track width

  const deg = (d: number) => d * Math.PI / 180;
  const START = 150;     // canvas degrees, lower-left
  const SWEEP = 240;     // total span

  const valToDeg = (v: number) =>
    START + Math.max(0, Math.min(1, (v - min) / (max - min))) * SWEEP;

  // ── Track background ──────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, R, deg(START), deg(START + SWEEP), false);
  ctx.lineWidth = TW;
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineCap = 'butt';
  ctx.stroke();

  // ── Threshold segments ────────────────────────────────────────────────────
  for (const seg of segs) {
    const sa = deg(valToDeg(Math.max(seg.from, min)));
    const ea = deg(valToDeg(Math.min(seg.to,  max)));
    if (sa >= ea) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, R, sa, ea, false);
    ctx.lineWidth = TW;
    ctx.strokeStyle = seg.color;
    ctx.lineCap = 'butt';
    ctx.stroke();
  }

  // ── Value-fill highlight (thin inner ring up to current value) ────────────
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (fraction > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, R - TW * 0.55, deg(START), deg(START + fraction * SWEEP), false);
    ctx.lineWidth = TW * 0.18;
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ── End-cap dots at min and max ────────────────────────────────────────────
  const dotR = TW * 0.35;
  const minX = cx + Math.cos(deg(START))          * R;
  const minY = cy + Math.sin(deg(START))          * R;
  const maxX = cx + Math.cos(deg(START + SWEEP))  * R;
  const maxY = cy + Math.sin(deg(START + SWEEP))  * R;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(minX, minY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(maxX, maxY, dotR, 0, Math.PI * 2); ctx.fill();

  // ── Needle ────────────────────────────────────────────────────────────────
  const needleAngle = deg(valToDeg(value));
  const nLen = R * 0.80;
  const nx = cx + Math.cos(needleAngle) * nLen;
  const ny = cy + Math.sin(needleAngle) * nLen;
  const baseLen = TW * 0.45;
  const perpAngle = needleAngle + Math.PI / 2;
  const bx = Math.cos(perpAngle) * baseLen;
  const by = Math.sin(perpAngle) * baseLen;

  // Shadow
  ctx.beginPath();
  ctx.moveTo(cx + bx * 0.6, cy + by * 0.6);
  ctx.lineTo(nx + bx * 0.1, ny + by * 0.1);
  ctx.lineWidth = W * 0.012;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle body
  ctx.beginPath();
  ctx.moveTo(cx - bx, cy - by);
  ctx.lineTo(nx, ny);
  ctx.lineTo(cx + bx, cy + by);
  ctx.closePath();
  ctx.fillStyle = FG;
  ctx.fill();

  // Pivot cap
  ctx.beginPath();
  ctx.arc(cx, cy, TW * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = BG_HEADER;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, TW * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = FG;
  ctx.fill();

  // ── Value label ───────────────────────────────────────────────────────────
  const valStr = value.toFixed(decimals);
  const valFs = Math.round(W * 0.115);
  ctx.font = `bold ${valFs}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = accentColor;
  ctx.fillText(valStr, cx, cy - R * 0.40);

  const unitFs = Math.round(W * 0.062);
  ctx.font = `${unitFs}px -apple-system, system-ui, sans-serif`;
  ctx.fillStyle = MUTED;
  ctx.fillText(unitSuffix, cx, cy - R * 0.40 + unitFs * 1.4);

  // ── Scale labels at arc ends ──────────────────────────────────────────────
  const scalFs = Math.round(W * 0.055);
  ctx.font = `${scalFs}px -apple-system, system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'right';
  ctx.fillText(String(min), minX - dotR * 1.4, minY + scalFs * 0.4);
  ctx.textAlign = 'left';
  ctx.fillText(String(max), maxX + dotR * 1.4, maxY + scalFs * 0.4);

  // ── Title ─────────────────────────────────────────────────────────────────
  const titleFs = Math.round(W * 0.072);
  ctx.font = `bold ${titleFs}px -apple-system, system-ui, sans-serif`;
  ctx.fillStyle = FG;
  ctx.textAlign = 'center';
  ctx.fillText(title, cx, titleFs * 1.2);

  return canvas;
}

// ─── PDF layout helpers ───────────────────────────────────────────────────────

const PW = 210, PH = 297, ML = 16, MR = 16;
const INNER = PW - ML - MR;

function fillBg(doc: jsPDF) {
  doc.setFillColor(...hex(BG_DEEP));
  doc.rect(0, 0, PW, PH, 'F');
}

function sectionLabel(doc: jsPDF, text: string, y: number) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hex(MUTED));
  doc.text(text.toUpperCase(), ML, y);
}

function rule(doc: jsPDF, y: number): number {
  doc.setDrawColor(...hex(BORDER));
  doc.setLineWidth(0.25);
  doc.line(ML, y, PW - MR, y);
  return y + 5;
}

function statusPill(doc: jsPDF, label: string, color: string, x: number, y: number) {
  const [r, g, b] = hex(color);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const tw = (doc.getStringUnitWidth(label) * 7.5) / doc.internal.scaleFactor + 8;
  doc.setFillColor(r, g, b, 0.18);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y - 4, tw, 5.5, 1.5, 1.5, 'FD');
  doc.setTextColor(r, g, b);
  doc.text(label, x + 4, y);
  return x + tw + 4;
}

/** Wrap text and return updated y */
function wrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  size: number,
  color: string,
  bold = false,
): number {
  doc.setFontSize(size);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(...hex(color));
  const lines = doc.splitTextToSize(text, maxW) as string[];
  doc.text(lines, x, y);
  return y + lines.length * (size * 0.4);
}

/** Draw analysis card next to / below a gauge. Returns new y. */
function analysisCard(
  doc: jsPDF,
  analysis: Analysis,
  x: number,
  y: number,
  w: number,
): number {
  const pad = 4;
  let cy = y + pad + 5;

  // Status pill
  statusPill(doc, analysis.statusLabel, analysis.statusColor, x + pad, cy);
  cy += 7;

  // Headline
  cy = wrappedText(doc, analysis.headline, x + pad, cy, w - pad * 2, 9.5, FG, true) + 2;

  // Detail
  cy = wrappedText(doc, analysis.detail, x + pad, cy, w - pad * 2, 8, MUTED) + 3;

  // Tips
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hex(PRIMARY));
  doc.text('RECOMMENDATIONS', x + pad, cy);
  cy += 5;

  for (const tip of analysis.tips) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hex(FG));
    // Bullet dot
    doc.setFillColor(...hex(PRIMARY));
    doc.circle(x + pad + 1.5, cy - 1.2, 0.9, 'F');
    const lines = doc.splitTextToSize(tip, w - pad * 2 - 5) as string[];
    doc.text(lines, x + pad + 5, cy);
    cy += lines.length * 3.5 + 1.5;
  }

  const cardH = cy - y + pad;
  // Draw card background (behind content) — re-draw
  doc.setFillColor(...hex(BG_CARD));
  doc.roundedRect(x, y, w, cardH, 2, 2, 'F');

  // Left accent bar
  doc.setFillColor(...hex(analysis.statusColor));
  doc.rect(x, y, 2, cardH, 'F');

  // Re-draw content on top
  cy = y + pad + 5;
  statusPill(doc, analysis.statusLabel, analysis.statusColor, x + pad + 2, cy);
  cy += 7;
  cy = wrappedText(doc, analysis.headline, x + pad + 2, cy, w - pad * 2 - 2, 9.5, FG, true) + 2;
  cy = wrappedText(doc, analysis.detail, x + pad + 2, cy, w - pad * 2 - 2, 8, MUTED) + 3;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...hex(PRIMARY));
  doc.text('RECOMMENDATIONS', x + pad + 2, cy);
  cy += 5;
  for (const tip of analysis.tips) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...hex(FG));
    doc.setFillColor(...hex(PRIMARY));
    doc.circle(x + pad + 3.5, cy - 1.2, 0.9, 'F');
    const lines = doc.splitTextToSize(tip, w - pad * 2 - 7) as string[];
    doc.text(lines, x + pad + 7, cy);
    cy += lines.length * 3.5 + 1.5;
  }

  return y + cardH + 5;
}

// ─── BAS progress line chart (canvas) ─────────────────────────────────────────
//
// Mirrors the Grafana "Biological Age Score" time-series panel.
// Lime-green line (#a3e635) with circle markers, yellow mean line,
// subtle area fill, grid lines.

function drawProgressChart(points: ReportHistoryPoint[]): HTMLCanvasElement {
  const W = 880, H = 320;
  const PAD_L = 60, PAD_R = 20, PAD_T = 30, PAD_B = 50;
  const PW2 = W - PAD_L - PAD_R;
  const PH2 = H - PAD_T - PAD_B;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = BG_CARD;
  ctx.fillRect(0, 0, W, H);

  // Title
  const titleFs = 22;
  ctx.font = `bold ${titleFs}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = FG;
  ctx.fillText('Biological Age Score — Progress', PAD_L, 22);

  if (points.length === 0) {
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('No session data available', W / 2, H / 2);
    return canvas;
  }

  // Data range
  const basValues = points.map((p) => p.bas);
  const rawMin = Math.min(...basValues);
  const rawMax = Math.max(...basValues);
  const yMin = Math.floor(rawMin - 2);
  const yMax = Math.ceil(rawMax + 2);
  const yRange = yMax - yMin || 1;
  const mean = basValues.reduce((s, v) => s + v, 0) / basValues.length;

  const toX = (i: number) => PAD_L + (i / Math.max(points.length - 1, 1)) * PW2;
  const toY = (v: number) => PAD_T + PH2 - ((v - yMin) / yRange) * PH2;

  // Grid lines (horizontal, 5 ticks)
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const v = yMin + (yRange / gridSteps) * i;
    const gy = toY(v);
    ctx.beginPath();
    ctx.moveTo(PAD_L, gy); ctx.lineTo(W - PAD_R, gy);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Y label
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(1), PAD_L - 6, gy + 4);
  }

  // Mean reference line
  const meanY = toY(mean);
  ctx.beginPath();
  ctx.setLineDash([8, 5]);
  ctx.moveTo(PAD_L, meanY); ctx.lineTo(W - PAD_R, meanY);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'left';
  ctx.fillText(`Mean ${mean.toFixed(1)}`, W - PAD_R + 2, meanY + 4);

  // Area fill
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0].bas));
  for (let i = 1; i < points.length; i++) ctx.lineTo(toX(i), toY(points[i].bas));
  ctx.lineTo(toX(points.length - 1), PAD_T + PH2);
  ctx.lineTo(toX(0), PAD_T + PH2);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + PH2);
  grad.addColorStop(0, 'rgba(163,230,53,0.18)');
  grad.addColorStop(1, 'rgba(163,230,53,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0].bas));
  for (let i = 1; i < points.length; i++) ctx.lineTo(toX(i), toY(points[i].bas));
  ctx.strokeStyle = '#a3e635';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots + x labels
  points.forEach((p, i) => {
    const px = toX(i), py = toY(p.bas);
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#a3e635';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = BG_CARD;
    ctx.fill();

    // Value label above dot
    ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = FG;
    ctx.textAlign = 'center';
    ctx.fillText(p.bas.toFixed(1), px, py - 12);

    // X axis date label
    const label = new Date(p.time).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText(label, px, H - 10);
  });

  return canvas;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateMetabolicReportPDF(
  profile: ReportProfile,
  measurements: ReportMeasurement[],
  scores: ReportScores | null,
  kraft: ReportKraftMetrics,
  history: ReportHistoryPoint[] = [],
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  fillBg(doc);

  const GAUGE_W = (INNER - 5) / 2;   // two side-by-side gauges
  const GAUGE_H = GAUGE_W * 0.68;    // match canvas aspect ratio

  const MINI_W  = (INNER - 5) / 2;
  const MINI_H  = MINI_W * 0.68;

  let y = 0;

  // ─── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(...hex(BG_HEADER));
  doc.rect(0, 0, PW, 22, 'F');

  doc.setFillColor(...hex(PRIMARY));
  doc.roundedRect(ML, 4, 14, 14, 2.5, 2.5, 'F');
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hex(PRIMARY_FG));
  doc.text('M', ML + 7, 13, { align: 'center' });

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hex(PRIMARY));
  doc.text('METERBOLIC', ML + 18, 13);

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hex(MUTED));
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    PW - MR, 13, { align: 'right' },
  );

  y = 30;

  // ─── Page title ───────────────────────────────────────────────────────────
  doc.setFontSize(17); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hex(FG));
  doc.text('Metabolic Health Report', ML, y);
  y += 7;
  y = rule(doc, y);

  // ─── Patient ──────────────────────────────────────────────────────────────
  sectionLabel(doc, 'Patient', y);
  y += 6;

  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...hex(FG));
  doc.text(profile.name || profile.email, ML, y);
  y += 5;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...hex(MUTED));
  doc.text(profile.email, ML, y);
  y += 5;

  if (profile.metabolic_goals?.length) {
    y = wrappedText(doc, 'Goals: ' + profile.metabolic_goals.join(', '), ML, y, INNER, 8, MUTED) + 2;
  }
  y += 3;
  y = rule(doc, y);

  // ─── Metabolic Scores ─────────────────────────────────────────────────────
  sectionLabel(doc, 'Metabolic Scores', y);
  y += 6;

  if (scores && (scores.bas !== null || scores.vat !== null)) {
    if (scores.measurementSeries) {
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...hex(PRIMARY));
      const pillLabel = `Session: ${scores.measurementSeries}`;
      const pw2 = (doc.getStringUnitWidth(pillLabel) * 7.5) / doc.internal.scaleFactor + 8;
      doc.setFillColor(...hex(BG_CARD));
      doc.roundedRect(ML, y - 3.5, pw2, 5.5, 1.5, 1.5, 'F');
      doc.text(pillLabel, ML + 4, y);
      y += 7;
    }

    const BAS_SEGS: Seg[] = [
      { from: 21,   to: 57.6, color: G_GREEN },
      { from: 57.6, to: 70,   color: G_YELLOW },
      { from: 70,   to: 80,   color: G_ORANGE },
      { from: 80,   to: 85,   color: G_RED },
    ];
    const VAT_SEGS: Seg[] = [
      { from: 0,    to: 1200, color: G_GREEN },
      { from: 1200, to: 2400, color: G_YELLOW },
    ];

    // Render BAS gauge (left)
    if (scores.bas !== null) {
      const ba = basAnalysis(scores.bas);
      const gCanvas = drawSpeedometer({
        value: scores.bas, min: 21, max: 85, segs: BAS_SEGS,
        title: 'Biological Age Score', unitSuffix: 'Age',
        decimals: 1, accentColor: ba.statusColor, size: 440,
      });
      doc.addImage(gCanvas, 'PNG', ML, y, GAUGE_W, GAUGE_H);
    }

    // Render VAT gauge (right)
    if (scores.vat !== null) {
      const va = vatAnalysis(scores.vat);
      const gCanvas = drawSpeedometer({
        value: scores.vat, min: 0, max: 2400, segs: VAT_SEGS,
        title: 'KRAFT Deep Fat Score', unitSuffix: 'g',
        decimals: 0, accentColor: va.statusColor, size: 440,
      });
      doc.addImage(gCanvas, 'PNG', ML + GAUGE_W + 5, y, GAUGE_W, GAUGE_H);
    }

    y += GAUGE_H + 4;

    // Analysis cards side by side
    const analysisY = y;
    let leftEnd = analysisY;
    let rightEnd = analysisY;

    if (scores.bas !== null) {
      leftEnd = analysisCard(doc, basAnalysis(scores.bas), ML, analysisY, GAUGE_W);
    }
    if (scores.vat !== null) {
      rightEnd = analysisCard(doc, vatAnalysis(scores.vat), ML + GAUGE_W + 5, analysisY, GAUGE_W);
    }

    y = Math.max(leftEnd, rightEnd) + 3;
  } else {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...hex(MUTED));
    doc.text('No score data available. Contact your therapist to capture your data.', ML, y);
    y += 10;
  }

  y = rule(doc, y);

  // ─── BAS Progress Chart ───────────────────────────────────────────────────
  if (history.length > 0) {
    sectionLabel(doc, 'Biological Age Score — Progress Over Time', y);
    y += 6;

    const CHART_W = INNER;
    const CHART_H = CHART_W * (320 / 880);   // match canvas aspect ratio

    if (y + CHART_H + 10 > PH - 14) {
      doc.addPage(); fillBg(doc);
      doc.setFillColor(...hex(BG_HEADER)); doc.rect(0, 0, PW, 10, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hex(PRIMARY)); doc.text('METERBOLIC', ML, 7);
      y = 18;
    }

    const chartCanvas = drawProgressChart(history);
    doc.addImage(chartCanvas, 'PNG', ML, y, CHART_W, CHART_H);
    y += CHART_H + 5;

    y = rule(doc, y);
  }

  // ─── Kraft Curve Analysis ─────────────────────────────────────────────────
  sectionLabel(doc, 'Kraft Curve Analysis', y);
  y += 6;

  if (kraft.hasRealData) {
    const RISK_SEGS: Seg[] = [
      { from: 0,  to: 50,  color: G_GREEN },
      { from: 50, to: 70,  color: G_ORANGE },
      { from: 70, to: 100, color: G_RED },
    ];
    const GLUCOSE_SEGS: Seg[] = [
      { from: 0,    to: 7.8,  color: G_GREEN },
      { from: 7.8,  to: 11.1, color: G_YELLOW },
      { from: 11.1, to: 15,   color: G_RED },
    ];
    const INSULIN_SEGS: Seg[] = [
      { from: 0,   to: 40,  color: G_GREEN },
      { from: 40,  to: 100, color: G_YELLOW },
      { from: 100, to: 150, color: G_RED },
    ];

    const rAnalysis = riskAnalysis(kraft.riskScore, kraft.peakGlucose, kraft.peakInsulin);

    // Page break check before Risk gauge
    if (y + GAUGE_H + 80 > PH - 14) {
      doc.addPage(); fillBg(doc);
      doc.setFillColor(...hex(BG_HEADER)); doc.rect(0, 0, PW, 10, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hex(PRIMARY)); doc.text('METERBOLIC', ML, 7);
      y = 18;
    }

    // Risk score gauge — centered, slightly larger
    const riskW = INNER * 0.6;
    const riskH = riskW * 0.68;
    const riskX = ML + (INNER - riskW) / 2;
    const riskCanvas = drawSpeedometer({
      value: kraft.riskScore, min: 0, max: 100, segs: RISK_SEGS,
      title: 'Metabolic Risk Score', unitSuffix: '/ 100',
      decimals: 0, accentColor: rAnalysis.statusColor, size: 500,
    });
    doc.addImage(riskCanvas, 'PNG', riskX, y, riskW, riskH);
    y += riskH + 4;

    y = analysisCard(doc, rAnalysis, ML, y, INNER) + 3;

    // Page break before mini gauges
    if (y + MINI_H + 20 > PH - 14) {
      doc.addPage(); fillBg(doc);
      doc.setFillColor(...hex(BG_HEADER)); doc.rect(0, 0, PW, 10, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hex(PRIMARY)); doc.text('METERBOLIC', ML, 7);
      y = 18;
    }

    // Glucose + Insulin mini gauges side by side
    sectionLabel(doc, 'Kraft Curve — Biomarker Gauges', y);
    y += 6;

    const glucoseCanvas = drawSpeedometer({
      value: Math.min(kraft.peakGlucose, 15), min: 0, max: 15, segs: GLUCOSE_SEGS,
      title: 'Peak Glucose', unitSuffix: 'mMol',
      decimals: 1, accentColor: GLUCOSE_HEX, size: 380,
    });
    const insulinCanvas = drawSpeedometer({
      value: Math.min(kraft.peakInsulin, 150), min: 0, max: 150, segs: INSULIN_SEGS,
      title: 'Peak Insulin', unitSuffix: 'µIU/mL',
      decimals: 1, accentColor: INSULIN_HEX, size: 380,
    });
    doc.addImage(glucoseCanvas, 'PNG', ML, y, MINI_W, MINI_H);
    doc.addImage(insulinCanvas, 'PNG', ML + MINI_W + 5, y, MINI_W, MINI_H);
    y += MINI_H + 3;

    // Recovery time tile
    doc.setFillColor(...hex(BG_CARD));
    doc.roundedRect(ML, y, INNER, 14, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...hex(MUTED));
    doc.text('Glucose Recovery Time', ML + 5, y + 6);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...hex(PRIMARY));
    doc.text(kraft.recoveryTime, ML + 5, y + 12);
    y += 19;

  } else {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...hex(MUTED));
    doc.text('No Kraft curve data available. Use the Personalise flow to upload your test results.', ML, y);
    y += 10;
  }

  y = rule(doc, y);

  // ─── Measurements table ───────────────────────────────────────────────────

  const drawTableHeader = (doc: jsPDF, ty: number): number => {
    const cols = [
      { label: 'Date',    x: ML,        w: 30 },
      { label: 'Analyte', x: ML + 30,   w: 45 },
      { label: 'Value',   x: ML + 75,   w: 25 },
      { label: 'Unit',    x: ML + 100,  w: 32 },
    ];
    doc.setFillColor(14, 42, 34);
    doc.rect(ML, ty - 4.5, INNER, 8, 'F');
    cols.forEach((c) => {
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...hex(MUTED));
      doc.text(c.label.toUpperCase(), c.x + 2, ty);
    });
    return ty + 5;
  };

  if (measurements.length > 0) {
    // Page break if needed
    if (y + 20 > PH - 14) {
      doc.addPage(); fillBg(doc);
      doc.setFillColor(...hex(BG_HEADER)); doc.rect(0, 0, PW, 10, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hex(PRIMARY)); doc.text('METERBOLIC', ML, 7);
      y = 18;
    }

    sectionLabel(doc, 'Measurement History', y);
    y += 7;
    y = drawTableHeader(doc, y);

    const ROW_H = 7;
    const cols2 = [ML, ML + 30, ML + 75, ML + 100];

    for (let i = 0; i < measurements.length; i++) {
      if (y + ROW_H > PH - 14) {
        // Footer
        addFooter(doc, doc.getCurrentPageInfo().pageNumber, -1);
        doc.addPage(); fillBg(doc);
        doc.setFillColor(...hex(BG_HEADER)); doc.rect(0, 0, PW, 10, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...hex(PRIMARY)); doc.text('METERBOLIC', ML, 7);
        y = 18;
        y = drawTableHeader(doc, y);
      }

      if (i % 2 === 0) {
        doc.setFillColor(25, 60, 50); doc.rect(ML, y - 4.5, INNER, ROW_H, 'F');
      }

      const m = measurements[i];
      const row = [
        new Date(m.time).toLocaleDateString('en-GB'),
        m.name,
        typeof m.value === 'number' ? m.value.toFixed(2) : String(m.value),
        m.unit,
      ];
      row.forEach((val, ci) => {
        const c: string = ci === 1 ? FG : ci === 2 ? PRIMARY : MUTED;
        doc.setFontSize(8);
        doc.setFont('helvetica', ci === 1 ? 'bold' : 'normal');
        doc.setTextColor(...hex(c));
        doc.text(val, cols2[ci] + 2, y);
      });
      y += ROW_H;
    }
  }

  // ─── Footer on every page ─────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    addFooter(doc, p, total);
  }

  doc.save(`meterbolic-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function addFooter(doc: jsPDF, page: number, total: number) {
  doc.setFillColor(...hex(BG_HEADER));
  doc.rect(0, PH - 12, PW, 12, 'F');
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...hex(MUTED));
  doc.text('METERBOLIC — Metabolic Health Platform', ML, PH - 5);
  if (total > 0) doc.text(`Page ${page} of ${total}`, PW - MR, PH - 5, { align: 'right' });
  doc.text(
    'For informational purposes only — not a substitute for medical advice.',
    PW / 2, PH - 5, { align: 'center' },
  );
}
