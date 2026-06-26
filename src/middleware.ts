import { NextRequest, NextResponse } from 'next/server';

// Clinician portal is served on its own subdomain. This middleware:
//  - on the clinician.* host, serves the /clinician app from the root
//    (/, /register, deep links) so URLs read as clinician.<env>.meterbolic.com/...
//  - on the app.* host, 301-redirects the old /clinician and /register/clinician
//    paths to the new subdomain so the path is "moved", not duplicated.

const CLINICIAN_HOSTS = new Set([
  'clinician.meterbolic.com',
  'clinician.dev.meterbolic.com',
]);

const APP_TO_CLINICIAN: Record<string, string> = {
  'app.meterbolic.com': 'clinician.meterbolic.com',
  'app.dev.meterbolic.com': 'clinician.dev.meterbolic.com',
};

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  const { pathname, search } = req.nextUrl;

  // --- old path on the main app -> 301 to the subdomain ---
  const sub = APP_TO_CLINICIAN[host];
  if (sub) {
    if (pathname === '/register/clinician' || pathname.startsWith('/register/clinician/')) {
      const rest = pathname.slice('/register/clinician'.length);
      return NextResponse.redirect(`https://${sub}/register${rest}${search}`, 301);
    }
    if (pathname === '/clinician' || pathname.startsWith('/clinician/')) {
      const rest = pathname.slice('/clinician'.length) || '/';
      return NextResponse.redirect(`https://${sub}${rest}${search}`, 301);
    }
    return NextResponse.next();
  }

  // --- clinician subdomain: serve the clinician app from the root ---
  if (CLINICIAN_HOSTS.has(host)) {
    // pass through framework/asset/api/already-prefixed paths untouched
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/clinician') ||
      pathname.startsWith('/register/clinician') ||
      pathname.startsWith('/assets') ||
      pathname === '/favicon.ico' ||
      /\.[a-zA-Z0-9]+$/.test(pathname)
    ) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    if (pathname === '/register' || pathname.startsWith('/register/')) {
      url.pathname = '/register/clinician' + pathname.slice('/register'.length);
    } else {
      url.pathname = '/clinician' + (pathname === '/' ? '' : pathname);
    }
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // run on everything except Next internals/static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
