/**
 * Metabolic Report PDF generator.
 * Uses jsPDF (no canvas dependency) to produce a clean, branded report.
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

// ─── Theme constants ──────────────────────────────────────────────────────────

const BRAND_DARK   = [13, 15, 18] as [number, number, number];      // #0d0f12
const BRAND_GREEN  = [30, 174, 96] as [number, number, number];     // #1eae60
const MUTED        = [120, 130, 145] as [number, number, number];
const FOREGROUND   = [230, 235, 240] as [number, number, number];
const CARD_BG      = [22, 27, 34] as [number, number, number];
const SECTION_LINE = [45, 55, 68] as [number, number, number];

const RISK_GREEN   = [34, 197, 94] as [number, number, number];     // #22c55e
const RISK_YELLOW  = [234, 184, 57] as [number, number, number];    // #EAB839
const RISK_ORANGE  = [249, 115, 22] as [number, number, number];    // #f97316
const RISK_RED     = [239, 68, 68] as [number, number, number];     // #ef4444

// ─── Helpers ──────────────────────────────────────────────────────────────────

function basColor(bas: number): [number, number, number] {
  if (bas >= 80) return RISK_RED;
  if (bas >= 70) return RISK_ORANGE;
  if (bas >= 57.6) return RISK_YELLOW;
  return RISK_GREEN;
}

function vatColor(vat: number): [number, number, number] {
  return vat >= 1200 ? RISK_YELLOW : RISK_GREEN;
}

function riskColor(score: number): [number, number, number] {
  if (score >= 70) return RISK_RED;
  if (score >= 50) return RISK_ORANGE;
  return RISK_GREEN;
}

/** Draw a horizontal progress bar. Returns the rightmost x after the bar. */
function drawBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  fraction: number,          // 0–1
  filledColor: [number, number, number],
) {
  // Track
  doc.setFillColor(45, 55, 68);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
  // Fill
  const fillW = Math.max(height, fraction * width); // at least a circle
  doc.setFillColor(...filledColor);
  doc.roundedRect(x, y, fillW, height, height / 2, height / 2, 'F');
}

/** Draw a small colored dot */
function dot(doc: jsPDF, cx: number, cy: number, r: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  doc.circle(cx, cy, r, 'F');
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateMetabolicReportPDF(
  profile: ReportProfile,
  measurements: ReportMeasurement[],
  scores: ReportScores | null,
  kraft: ReportKraftMetrics,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = 210;   // page width
  const PH = 297;   // page height
  const ML = 18;    // margin left
  const MR = 18;    // margin right
  const INNER = PW - ML - MR;

  let y = 0;

  // ─── Helpers that advance y ──────────────────────────────────────────────

  const gap = (mm: number) => { y += mm; };

  const text = (
    str: string,
    x: number,
    size: number,
    color: [number, number, number],
    opts?: { align?: 'left' | 'center' | 'right'; bold?: boolean },
  ) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.text(str, x, y, { align: opts?.align ?? 'left' });
  };

  const rule = (color: [number, number, number] = SECTION_LINE) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PW - MR, y);
    y += 4;
  };

  // ─── Header bar ─────────────────────────────────────────────────────────

  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, PW, 22, 'F');

  // "M" badge
  doc.setFillColor(...BRAND_GREEN);
  doc.roundedRect(ML, 4, 14, 14, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('M', ML + 7, 13, { align: 'center' });

  // Wordmark
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('METERBOLIC', ML + 18, 12);

  // Report date (top-right)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 190, 200);
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    PW - MR,
    12,
    { align: 'right' },
  );

  y = 30;

  // ─── Report title ────────────────────────────────────────────────────────

  text('Metabolic Health Report', ML, 18, FOREGROUND, { bold: true });
  y += 7;
  rule();

  // ─── Patient section ─────────────────────────────────────────────────────

  text('PATIENT', ML, 7.5, MUTED, { bold: true });
  y += 6;

  const displayName = profile.name || profile.email;
  text(displayName, ML, 13, FOREGROUND, { bold: true });
  y += 6;
  text(profile.email, ML, 9, MUTED);
  y += 6;

  if (profile.metabolic_goals && profile.metabolic_goals.length > 0) {
    const goalsStr = 'Goals: ' + profile.metabolic_goals.join(', ');
    const wrapped = doc.splitTextToSize(goalsStr, INNER);
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(wrapped, ML, y);
    y += wrapped.length * 5;
  }

  y += 4;
  rule();

  // ─── Metabolic Scores section ────────────────────────────────────────────

  text('METABOLIC SCORES', ML, 7.5, MUTED, { bold: true });
  y += 8;

  if (scores && (scores.bas !== null || scores.vat !== null)) {
    if (scores.measurementSeries) {
      text(`Session: ${scores.measurementSeries}`, ML, 8, MUTED);
      y += 6;
    }

    // BAS
    if (scores.bas !== null) {
      const bColor = basColor(scores.bas);
      dot(doc, ML + 2.5, y - 1.5, 2, bColor);
      text('Biological Age Score', ML + 8, 10, FOREGROUND, { bold: true });
      doc.setFontSize(10);
      doc.setTextColor(...bColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${scores.bas.toFixed(1)} Age`, PW - MR, y - 2, { align: 'right' });
      y += 6;
      const basFrac = Math.max(0, Math.min(1, (scores.bas - 21) / (85 - 21)));
      drawBar(doc, ML + 8, y, INNER - 8, 4, basFrac, bColor);
      y += 10;
    }

    // VAT
    if (scores.vat !== null) {
      const vColor = vatColor(scores.vat);
      dot(doc, ML + 2.5, y - 1.5, 2, vColor);
      text('KRAFT Deep Fat Score', ML + 8, 10, FOREGROUND, { bold: true });
      doc.setFontSize(10);
      doc.setTextColor(...vColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${scores.vat.toFixed(0)} g`, PW - MR, y - 2, { align: 'right' });
      y += 6;
      const vatFrac = Math.max(0, Math.min(1, scores.vat / 2400));
      drawBar(doc, ML + 8, y, INNER - 8, 4, vatFrac, vColor);
      y += 10;
    }
  } else {
    text('No scores available for this account.', ML, 9, MUTED);
    y += 8;
  }

  y += 2;
  rule();

  // ─── Kraft Curve section ─────────────────────────────────────────────────

  text('KRAFT CURVE ANALYSIS', ML, 7.5, MUTED, { bold: true });
  y += 8;

  if (kraft.hasRealData) {
    const rColor = riskColor(kraft.riskScore);

    // 2×2 metric grid
    const colW = INNER / 2;
    const metrics = [
      { label: 'Peak Glucose', value: `${kraft.peakGlucose} mMol`, color: [59, 130, 246] as [number, number, number] },
      { label: 'Peak Insulin', value: `${kraft.peakInsulin} µIU/mL`, color: RISK_ORANGE },
      { label: 'Recovery Time', value: kraft.recoveryTime, color: BRAND_GREEN },
      { label: 'Risk Score', value: `${kraft.riskScore} / 100`, color: rColor },
    ];

    const rowH = 20;
    metrics.forEach((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const mx = ML + col * colW;
      const my = y + row * rowH;

      doc.setFillColor(...CARD_BG);
      doc.roundedRect(mx, my, colW - 3, rowH - 3, 2, 2, 'F');
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...m.color);
      doc.text(m.value, mx + 5, my + 11);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(m.label, mx + 5, my + 16);
    });

    y += metrics.length / 2 * rowH + 2;

    // Risk bar
    const rFrac = kraft.riskScore / 100;
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text('Risk', ML, y + 3.5);
    drawBar(doc, ML + 10, y, INNER - 10, 5, rFrac, rColor);
    y += 12;
  } else {
    text('No Kraft curve data available. Upload test results to see your analysis.', ML, 9, MUTED);
    y += 10;
  }

  y += 2;
  rule();

  // ─── Measurements table ───────────────────────────────────────────────────

  if (measurements.length === 0) {
    text('MEASUREMENTS', ML, 7.5, MUTED, { bold: true });
    y += 7;
    text('No measurements found.', ML, 9, MUTED);
    y += 10;
  } else {
    text('MEASUREMENTS', ML, 7.5, MUTED, { bold: true });
    y += 7;

    // Table header
    const cols = [
      { label: 'Date',    x: ML,       w: 32 },
      { label: 'Analyte', x: ML + 32,  w: 40 },
      { label: 'Value',   x: ML + 72,  w: 28 },
      { label: 'Unit',    x: ML + 100, w: 32 },
    ];

    doc.setFillColor(...CARD_BG);
    doc.rect(ML, y - 4, INNER, 8, 'F');
    cols.forEach((c) => {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...MUTED);
      doc.text(c.label.toUpperCase(), c.x + 2, y);
    });
    y += 5;

    const ROW_H = 7;

    measurements.forEach((m, i) => {
      // Page break if needed
      if (y + ROW_H > PH - 20) {
        doc.addPage();
        doc.setFillColor(...BRAND_DARK);
        doc.rect(0, 0, PW, 10, 'F');
        y = 18;
        // Repeat header on new page
        doc.setFillColor(...CARD_BG);
        doc.rect(ML, y - 4, INNER, 8, 'F');
        cols.forEach((c) => {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...MUTED);
          doc.text(c.label.toUpperCase(), c.x + 2, y);
        });
        y += 5;
      }

      if (i % 2 === 0) {
        doc.setFillColor(28, 34, 42);
        doc.rect(ML, y - 4.5, INNER, ROW_H, 'F');
      }

      const row = [
        new Date(m.time).toLocaleDateString('en-GB'),
        m.name,
        typeof m.value === 'number' ? m.value.toFixed(2) : String(m.value),
        m.unit,
      ];

      row.forEach((val, ci) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', ci === 1 ? 'bold' : 'normal');
        doc.setTextColor(...(ci === 2 ? BRAND_GREEN : ci === 1 ? FOREGROUND : MUTED));
        doc.text(val, cols[ci].x + 2, y);
      });

      y += ROW_H;
    });
  }

  // ─── Footer on every page ────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, PH - 12, PW, 12, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 115, 130);
    doc.text('METERBOLIC — Metabolic Health Platform', ML, PH - 5);
    doc.text(
      `Page ${p} of ${totalPages}`,
      PW - MR,
      PH - 5,
      { align: 'right' },
    );
    doc.text(
      'This report is for informational purposes only and does not constitute medical advice.',
      PW / 2,
      PH - 5,
      { align: 'center' },
    );
  }

  // ─── Save ────────────────────────────────────────────────────────────────

  const filename = `meterbolic-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
