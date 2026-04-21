/**
 * Web App Manifest — served at /manifest.webmanifest.
 *
 * Lets users "install" the site as a PWA on Android / iOS / desktop.
 * Icons reference the same SVG pair as the favicon so we don't maintain
 * a separate set of PNG sizes — Next.js generates the raster fallbacks
 * from the SVG at build time.
 */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MeO by Meterbolic',
    short_name: 'MeO',
    description:
      'AI companion for metabolic health — Kraft curve, biological age, and evidence-based lifestyle guidance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08241c',
    theme_color: '#0f3e2f',
    orientation: 'portrait',
    categories: ['health', 'medical', 'lifestyle'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
