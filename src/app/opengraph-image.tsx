/**
 * Dynamic Open Graph share card.
 *
 * Next.js 16's ImageResponse API renders a PNG at build/request time
 * from JSX, served at /opengraph-image. Referenced automatically by
 * Next's metadata resolver — no need for a static /og.png.
 *
 * Kept deliberately simple: dark MeO background + droplet mark + one
 * headline + one subheadline. Nothing dynamic per-URL for now; if we
 * want per-page OG cards later, duplicate this file into the relevant
 * route folder.
 */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MeO — AI assistant for metabolic health';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background:
            'linear-gradient(135deg, #0f3e2f 0%, #08241c 55%, #031410 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Droplet + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
          <svg width="96" height="96" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="drop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b7f178" />
                <stop offset="100%" stopColor="#5cbf3f" />
              </linearGradient>
            </defs>
            <path
              d="M32 8 C32 8, 16 26, 16 40 A16 16 0 0 0 48 40 C48 26, 32 8, 32 8 Z"
              fill="url(#drop)"
            />
          </svg>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>MeO</div>
        </div>

        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 960,
            color: '#ecfdf5',
          }}
        >
          AI assistant for metabolic health
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            lineHeight: 1.35,
            color: '#a7d4b7',
            maxWidth: 900,
          }}
        >
          Understand your Kraft curve, biological age, and visceral fat — with evidence-based guidance.
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 80,
            fontSize: 24,
            color: '#6fb48c',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          meterbolic.com
        </div>
      </div>
    ),
    size,
  );
}
