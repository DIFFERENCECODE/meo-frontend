'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The two decorative layers behind every screen: a faint grid and one lime glow.
 *
 * They carry most of the difference between "a dark app" and the brand look.
 * The gradient alone reads as a flat dark surface; the grid gives it a measured,
 * instrument-panel quality, and the single off-centre glow stops the whole
 * thing feeling like a void.
 *
 * Rules, because these are easy to overdo:
 *  - one glow per screen, never two
 *  - the grid sits at 3.5% white and the whole layer at 55% opacity, so it
 *    reads as texture rather than as a table
 *  - `pointer-events: none` throughout: this layer must never eat a click
 *  - `aria-hidden`, since none of it carries meaning
 *
 * Rendered once in AppShell rather than per page, so a new screen inherits the
 * look without having to remember it.
 */
export function Backdrop() {
  const { colors } = useTheme();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Grid — two repeating gradients rather than a background image, so it
          scales with the viewport and costs no request. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.55,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
        }}
      />
      {/* Glow — bleeds off the top-right so its centre is never on screen,
          which is what keeps it feeling like light rather than a circle. */}
      <div
        className="absolute"
        style={{
          left: '30%',
          top: '-380px',
          width: '1100px',
          height: '1100px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${hexToRgba(
            colors.primary,
            0.15,
          )} 0%, ${hexToRgba(colors.primary, 0.045)} 35%, ${hexToRgba(
            colors.primary,
            0,
          )} 65%)`,
        }}
      />
    </div>
  );
}

/** Tokens are hex; the glow needs alpha. Falls back to the input unchanged. */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default Backdrop;
