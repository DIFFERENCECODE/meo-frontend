/**
 * sitemap.xml — listed at /sitemap.xml, referenced from robots.txt.
 *
 * Only public, crawlable surfaces. Auth-gated pages (personalize,
 * profile, activity, admin) stay out. Add future marketing pages here
 * when they ship.
 */
import type { MetadataRoute } from 'next';

const BASE = 'https://app.meterbolic.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
