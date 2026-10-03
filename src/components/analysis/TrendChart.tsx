'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

export interface TrendPoint {
  date: string;
  value: number;
  series?: string;
}

interface Props {
  points: TrendPoint[];
  /** Drawn as a dashed line across the plot — the patient's own target. */
  target?: number | null;
  unit?: string;
  height?: number;
  /** Lower is better for most metabolic markers; HDL is the exception. */
  lowerIsBetter?: boolean;
}

/**
 * A single biomarker over time, compared with the patient's own history.
 *
 * Hand-drawn SVG rather than a chart library: the whole visual is a polyline,
 * a dashed target and a dot per reading, and pulling in a charting dependency
 * for that costs more in bundle size and theme-fighting than it saves. It also
 * keeps the one rule that matters here — a reading with no value produces no
 * point — rather than relying on a library's null handling.
 *
 * Deliberately has no y-axis zero: metabolic markers move in narrow bands and
 * anchoring to zero flattens every real change into a straight line.
 */
export function TrendChart({
  points,
  target = null,
  unit = '',
  height = 220,
  lowerIsBetter = true,
}: Props) {
  const { colors } = useTheme();

  if (points.length === 0) {
    return (
      <div
        style={{ height, color: colors.muted }}
        className="flex items-center justify-center text-sm"
      >
        No readings yet.
      </div>
    );
  }

  // One point is not a trend. Saying so is more honest than drawing a line
  // through a single value, and it is the day-one state of every new patient.
  if (points.length === 1) {
    return (
      <div
        style={{ height, color: colors.muted }}
        className="flex flex-col items-center justify-center gap-2 text-sm"
      >
        <span style={{ color: colors.foreground }} className="text-2xl font-bold">
          {points[0].value}
          {unit ? ` ${unit}` : ''}
        </span>
        <span>One reading. Your next one makes this a line.</span>
      </div>
    );
  }

  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const values = points.map((p) => p.value);
  const candidates = target != null ? [...values, target] : values;
  let lo = Math.min(...candidates);
  let hi = Math.max(...candidates);
  if (hi === lo) {
    // A flat series still needs a band to draw in.
    hi = hi + 1;
    lo = lo - 1;
  }
  const pad = (hi - lo) * 0.15;
  lo -= pad;
  hi += pad;

  const x = (i: number) =>
    padL + (i * (W - padL - padR)) / Math.max(points.length - 1, 1);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const improved = lowerIsBetter ? last < first : last > first;
  const lineColor = improved ? colors.success : colors.chartPrimary;

  const ticks = [hi - pad, (hi + lo) / 2, lo + pad];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      role="img"
      aria-label={`${points.length} readings from ${points[0].date} to ${
        points[points.length - 1].date
      }, ${first} to ${last}${unit ? ` ${unit}` : ''}`}
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke={colors.cardBorder}
            strokeWidth={1}
          />
          <text
            x={padL - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize={11}
            fill={colors.muted}
          >
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {target != null && (
        <>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(target)}
            y2={y(target)}
            stroke={colors.primary}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={0.7}
          />
          <text
            x={W - padR}
            y={y(target) - 6}
            textAnchor="end"
            fontSize={11}
            fill={colors.primary}
          >
            target {target}
          </text>
        </>
      )}

      <polyline
        points={line}
        fill="none"
        stroke={lineColor}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <circle
            key={`${p.series ?? p.date}-${i}`}
            cx={x(i)}
            cy={y(p.value)}
            r={isLast ? 6 : 4}
            fill={isLast ? colors.foreground : colors.card}
            stroke={lineColor}
            strokeWidth={2.5}
          >
            <title>
              {p.date}: {p.value}
              {unit ? ` ${unit}` : ''}
            </title>
          </circle>
        );
      })}

      <text x={padL} y={H - 8} fontSize={11} fill={colors.muted}>
        {points[0].date}
      </text>
      <text x={W - padR} y={H - 8} fontSize={11} fill={colors.muted} textAnchor="end">
        {points[points.length - 1].date}
      </text>
    </svg>
  );
}
