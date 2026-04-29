/**
 * Metabolic Report PDF generator.
 *
 * Color palette
 * ─────────────
 * Brand (from product_landing_page MarketingLandingPage.tsx `C` object):
 *   bgDeep   #143730  — page background
 *   bgCard   #1e463c  — card / section panels
 *   border   #2d5548  — dividers  (≈ rgba(255,255,255,0.10) on #1c4a40)
 *   primary  #a4d65e  — lime-green accent, values, highlights
 *   fg       #ffffff  — body text
 *   muted    #8ab5a0  — labels, secondary text
 *   danger   #f59e0b  — amber warning
 *
 * Graph series (from Grafana panel overrides):
 *   Glucose  #FADE2A  — "yellow" (Grafana fixedColor for Glucose FASTING)
 *   Insulin  #37872D  — "semi-dark-green" (Grafana fixedColor for Insulin POSTPRANDIAL)
 *
 * Score thresholds (from ScoreGauges.tsx, which mirrors Grafana gauges):
 *   BAS  green#22c55e → #EAB839@57.6 → #f97316@70 → #ef4444@80
 *   VAT  green#22c55e → #EAB839@1200
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

// ─── Brand palette (RGB triples) ─────────────────────────────────────────────

const BG_DEEP:    [number, number, number] = [20,  55,  48];   // #143730
const BG_CARD:    [number, number, number] = [30,  70,  60];   // #1e463c
const BG_HEADER:  [number, number, number] = [10,  30,  24];   // #0a1e18 (darker strip)
const BORDER:     [number, number, number] = [45,  85,  72];   // #2d5548
const PRIMARY:    [number, number, number] = [164, 214, 94];   // #a4d65e  lime
const PRIMARY_FG: [number, number, number] = [26,  58,  42];   // #1a3a2a  dark on lime
const FG:         [number, number, number] = [255, 255, 255];
const MUTED:      [number, number, number] = [138, 181, 160];  // #8ab5a0
const DANGER:     [number, number, number] = [245, 158, 11];   // #f59e0b

// Grafana series colours
const GLUCOSE_COLOR: [number, number, number] = [250, 222, 42];  // #FADE2A
const INSULIN_COLOR: [number, number, number] = [55,  135, 45];  // #37872D

// Grafana / ScoreGauges threshold colours
const T_GREEN:  [number, number, number] = [34,  197, 94];   // #22c55e
const T_YELLOW: [number, number, number] = [234, 184, 57];   // #EAB839
const T_ORANGE: [number, number, number] = [249, 115, 22];   // #f97316
const T_RED:    [number, number, number] = [239, 68,  68];   // #ef4444

// ─── Helpers ──────────────────────────────────────────────────────────────────

function basColor(bas: number): [number, number, number] {
  if (bas >= 80)   return T_RED;
  if (bas >= 70)   return T_ORANGE;
  if (bas >= 57.6) return T_YELLOW;
  return T_GREEN;
}

function vatColor(vat: number): [number, number, number] {
  return vat >= 1200 ? T_YELLOW : T_GREEN;
}

function riskColor(score: number): [number, number, number] {
  if (score >= 70) return T_RED;
  if (score >= 50) return T_ORANGE;
  return T_GREEN;
}

function drawBar(
  doc: jsPDF,
  x: number, y: number,
  width: number, height: number,
  fraction: number,
  filledColor: [number, number, number],
) {
  doc.setFillColor(...BORDER);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
  const fillW = Math.max(height, Math.min(width, fraction * width));
  doc.setFillColor(...filledColor);
  doc.roundedRect(x, y, fillW, height, height / 2, height / 2, 'F');
}

function dot(doc: jsPDF, cx: number, cy: number, r: number, c: [number, number, number]) {
  doc.setFillColor(...c);
  doc.circle(cx, cy, r, 'F');
}

/** Fill every page's background with the brand deep-green. */
function fillPageBg(doc: jsPDF, pw: number, ph: number) {
  doc.setFillColor(...BG_DEEP);
  doc.rect(0, 0, pw, ph, 'F');
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateMetabolicReportPDF(
  profile: ReportProfile,
  measurements: ReportMeasurement[],
  scores: ReportScores | null,
  kraft: ReportKraftMetrics,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = 210;
  const PH = 297;
  const ML = 18;
  const MR = 18;
  const INNER = PW - ML - MR;

  // ── Page 1 background ──────────────────────────────────────────────────────
  fillPageBg(doc, PW, PH);

  let y = 0;

  // ─── Utilities ───────────────────────────────────────────────────────────

  const t = (
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

  const rule = () => {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.line(ML, y, PW - MR, y);
    y += 5;
  };

  const label = (str: string, x = ML) => {
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    // Letter-spacing via individual chars is not natively supported —
    // uppercase + small size achieves the same effect
    doc.text(str.toUpperCase(), x, y);
  };

  // ─── Header bar ───────────────────────────────────────────────────────────

  doc.setFillColor(...BG_HEADER);
  doc.rect(0, 0, PW, 24, 'F');

  // Lime badge
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(ML, 5, 14, 14, 2.5, 2.5, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_FG);
  doc.setFont('helvetica', 'bold');
  doc.text('M', ML + 7, 14, { align: 'center' });

  // Wordmark
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('METERBOLIC', ML + 19, 14);

  // Date (right-aligned)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    PW - MR,
    14,
    { align: 'right' },
  );

  y = 32;

  // ─── Report title ─────────────────────────────────────────────────────────

  t('Metabolic Health Report', ML, 17, FG, { bold: true });
  y += 7;
  rule();

  // ─── Patient ──────────────────────────────────────────────────────────────

  label('Patient');
  y += 6;

  const displayName = profile.name || profile.email;
  t(displayName, ML, 13, FG, { bold: true });
  y += 6;
  t(profile.email, ML, 9, MUTED);
  y += 6;

  if (profile.metabolic_goals && profile.metabolic_goals.length > 0) {
    const wrapped = doc.setFontSize(8.5)
      && doc.splitTextToSize('Goals: ' + profile.metabolic_goals.join(', '), INNER);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(wrapped, ML, y);
    y += (wrapped.length as number) * 5;
  }

  y += 4;
  rule();

  // ─── Scores ───────────────────────────────────────────────────────────────

  label('Metabolic Scores');
  y += 7;

  if (scores && (scores.bas !== null || scores.vat !== null)) {
    if (scores.measurementSeries) {
      // Pill tag for session
      const pillLabel = `Session: ${scores.measurementSeries}`;
      const pillW = doc.setFontSize(7.5) || 0;
      void pillW;
      doc.setFontSize(7.5);
      const tw = (doc.getStringUnitWidth(pillLabel) * 7.5) / doc.internal.scaleFactor + 6;
      doc.setFillColor(...BG_CARD);
      doc.roundedRect(ML, y - 4, tw, 6, 1.5, 1.5, 'F');
      doc.setTextColor(...PRIMARY);
      doc.setFont('helvetica', 'bold');
      doc.text(pillLabel, ML + 3, y);
      y += 8;
    }

    // ── BAS gauge bar ────────────────────────────────────────────────────
    if (scores.bas !== null) {
      const bColor = basColor(scores.bas);

      // Card background
      doc.setFillColor(...BG_CARD);
      doc.roundedRect(ML, y, INNER, 22, 2, 2, 'F');

      dot(doc, ML + 6, y + 6, 2.5, bColor);
      t('Biological Age Score', ML + 11, 9.5, FG, { bold: true });
      // Value right-aligned
      doc.setFontSize(13);
      doc.setTextColor(...bColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${scores.bas.toFixed(1)} Age`, PW - MR - 2, y + 8, { align: 'right' });

      const basFrac = Math.max(0, Math.min(1, (scores.bas - 21) / (85 - 21)));
      drawBar(doc, ML + 5, y + 13, INNER - 10, 4, basFrac, bColor);

      // Scale labels
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'normal');
      doc.text('21', ML + 5, y + 21);
      doc.text('85', PW - MR - 5, y + 21, { align: 'right' });

      y += 27;
    }

    // ── VAT gauge bar ────────────────────────────────────────────────────
    if (scores.vat !== null) {
      const vColor = vatColor(scores.vat);

      doc.setFillColor(...BG_CARD);
      doc.roundedRect(ML, y, INNER, 22, 2, 2, 'F');

      dot(doc, ML + 6, y + 6, 2.5, vColor);
      t('KRAFT Deep Fat Score', ML + 11, 9.5, FG, { bold: true });
      doc.setFontSize(13);
      doc.setTextColor(...vColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${scores.vat.toFixed(0)} g`, PW - MR - 2, y + 8, { align: 'right' });

      const vatFrac = Math.max(0, Math.min(1, scores.vat / 2400));
      drawBar(doc, ML + 5, y + 13, INNER - 10, 4, vatFrac, vColor);

      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'normal');
      doc.text('0', ML + 5, y + 21);
      doc.text('2400 g', PW - MR - 5, y + 21, { align: 'right' });

      y += 27;
    }
  } else {
    t('No scores available for this account.', ML, 9, MUTED);
    y += 10;
  }

  y += 3;
  rule();

  // ─── Kraft Curve ──────────────────────────────────────────────────────────

  label('Kraft Curve Analysis');
  y += 7;

  if (kraft.hasRealData) {
    const rColor = riskColor(kraft.riskScore);

    // 4-metric grid (2 cols × 2 rows)
    const colW = INNER / 2;
    const ROW_H = 22;
    const metrics: Array<{ label: string; value: string; color: [number, number, number] }> = [
      { label: 'Peak Glucose', value: `${kraft.peakGlucose} mMol`,   color: GLUCOSE_COLOR },
      { label: 'Peak Insulin', value: `${kraft.peakInsulin} µIU/mL`, color: INSULIN_COLOR },
      { label: 'Recovery Time', value: kraft.recoveryTime,             color: PRIMARY },
      { label: 'Risk Score',    value: `${kraft.riskScore} / 100`,    color: rColor },
    ];

    metrics.forEach((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const mx = ML + col * colW;
      const my = y + row * ROW_H;

      doc.setFillColor(...BG_CARD);
      doc.roundedRect(mx, my, colW - 3, ROW_H - 2, 2, 2, 'F');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...m.color);
      doc.text(m.value, mx + 5, my + 11);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(m.label, mx + 5, my + 17);
    });

    y += metrics.length / 2 * ROW_H + 4;

    // Risk bar
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text('Risk', ML, y + 3.5);
    drawBar(doc, ML + 9, y, INNER - 9, 5, kraft.riskScore / 100, rColor);
    y += 11;

    // Grafana series legend pill row
    const pills: Array<{ label: string; color: [number, number, number] }> = [
      { label: 'Glucose',  color: GLUCOSE_COLOR },
      { label: 'Insulin',  color: INSULIN_COLOR },
    ];
    let px = ML;
    for (const pill of pills) {
      const lbl = pill.label;
      doc.setFontSize(7.5);
      const tw = (doc.getStringUnitWidth(lbl) * 7.5) / doc.internal.scaleFactor + 12;
      doc.setFillColor(...BG_CARD);
      doc.roundedRect(px, y, tw, 7, 1.5, 1.5, 'F');
      doc.setFillColor(...pill.color);
      doc.circle(px + 4, y + 3.5, 1.8, 'F');
      doc.setTextColor(...FG);
      doc.setFont('helvetica', 'normal');
      doc.text(lbl, px + 8, y + 5);
      px += tw + 4;
    }
    y += 12;

  } else {
    t('No Kraft curve data. Upload test results via the Personalise flow.', ML, 9, MUTED);
    y += 10;
  }

  y += 2;
  rule();

  // ─── Measurements table ───────────────────────────────────────────────────

  label('Measurements');
  y += 7;

  if (measurements.length === 0) {
    t('No measurements found.', ML, 9, MUTED);
    y += 10;
  } else {
    const cols = [
      { label: 'Date',    x: ML,        w: 30 },
      { label: 'Analyte', x: ML + 30,   w: 45 },
      { label: 'Value',   x: ML + 75,   w: 28 },
      { label: 'Unit',    x: ML + 103,  w: 35 },
    ];

    const drawTableHeader = () => {
      doc.setFillColor(14, 42, 34);
      doc.rect(ML, y - 4.5, INNER, 8, 'F');
      cols.forEach((c) => {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MUTED);
        doc.text(c.label.toUpperCase(), c.x + 2, y);
      });
      y += 5;
    };

    drawTableHeader();

    const ROW_H = 7;

    measurements.forEach((m, i) => {
      if (y + ROW_H > PH - 18) {
        // Footer on current page then new page
        doc.setFillColor(...BG_HEADER);
        doc.rect(0, PH - 12, PW, 12, 'F');
        doc.setFontSize(6.5);
        doc.setTextColor(...MUTED);
        doc.setFont('helvetica', 'normal');
        doc.text('METERBOLIC — Metabolic Health Platform', ML, PH - 5);
        const pg = doc.getCurrentPageInfo().pageNumber;
        doc.text(`Page ${pg}`, PW - MR, PH - 5, { align: 'right' });

        doc.addPage();
        fillPageBg(doc, PW, PH);

        // Slim header strip on continuation pages
        doc.setFillColor(...BG_HEADER);
        doc.rect(0, 0, PW, 10, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(...PRIMARY);
        doc.setFont('helvetica', 'bold');
        doc.text('METERBOLIC', ML, 7);

        y = 18;
        drawTableHeader();
      }

      if (i % 2 === 0) {
        doc.setFillColor(25, 60, 50);
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
        // Analyte name in white, value in lime, others in muted
        const color: [number, number, number] =
          ci === 1 ? FG : ci === 2 ? PRIMARY : MUTED;
        doc.setTextColor(...color);
        doc.text(val, cols[ci].x + 2, y);
      });

      y += ROW_H;
    });
  }

  // ─── Footer on every page ─────────────────────────────────────────────────

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(...BG_HEADER);
    doc.rect(0, PH - 12, PW, 12, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('METERBOLIC — Metabolic Health Platform', ML, PH - 5);
    doc.text(`Page ${p} of ${total}`, PW - MR, PH - 5, { align: 'right' });
    doc.text(
      'For informational purposes only — not a substitute for medical advice.',
      PW / 2, PH - 5,
      { align: 'center' },
    );
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  doc.save(`meterbolic-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
