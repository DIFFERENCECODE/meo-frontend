/**
 * robots.txt — served at /robots.txt by Next.js.
 *
 * Allow crawling of marketing / landing surfaces, block everything
 * that requires auth or leaks user data. Stripe/webhook/auth routes
 * are explicitly disallowed even though most of them return 401 to
 * unauthenticated requests — keeps them out of search indexes entirely
 * and saves crawl budget.
 */
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing'],
        disallow: [
          '/api/',
          '/admin/',
          '/activity',
          '/profile',
          '/personalize',
        ],
      },
    ],
    sitemap: 'https://app.meterbolic.com/sitemap.xml',
    host: 'https://app.meterbolic.com',
  };
}
