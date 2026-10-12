'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The header every storyboard frame opens with, to the frame's own geometry.
 *
 * Measured from the exported HTML and identical across all ten frames:
 *
 *   header  padding: 20px 28px 0; flex; align-items:center; justify-content:space-between
 *   title   22px / 700 / -0.01em
 *   sub     13px / #c3d0d0 / margin-top: 3px
 *   chip    12px / 600 / #c3d0d0 on rgba(255,255,255,.07), 1px rgba(255,255,255,.14),
 *           radius 999, padding 5px 12px
 *
 * Title and subtitle set their colours explicitly rather than inheriting. The
 * app's root --foreground was a near-black that only .dark overrode, so every
 * heading that trusted inheritance rendered black on the dark ground. The root
 * is fixed, but a shared header should not depend on that being true.
 */
export function Chip({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 12, fontWeight: 600, color: colors.muted,
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3"
      style={{ padding: '20px 28px 0' }}
    >
      <div className="min-w-0">
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: colors.foreground, margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: colors.muted, marginTop: 3 }}>{subtitle}</p>
        )}
      </div>
      {right && <div className="flex items-center" style={{ gap: 10 }}>{right}</div>}
    </header>
  );
}

/** The body wrapper the frames use under the header. */
export function ScreenBody({ children, gap = 14 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ padding: '18px 28px 24px', gap }}>
      {children}
    </div>
  );
}

export default ScreenHeader;
