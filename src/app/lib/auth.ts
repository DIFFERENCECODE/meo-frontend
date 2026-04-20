const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!;

export function getLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: REDIRECT_URI,
  });
  return `https://${COGNITO_DOMAIN}/login?${params.toString()}`;
}

export function getGoogleLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: REDIRECT_URI,
    identity_provider: 'Google',
  });
  return `https://${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<{
    id_token: string;
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
  }>;
}

export function storeIdToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('meo_id_token', token);
}

export function getIdToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('meo_id_token');
}

/** Cognito forgot-password URL (Hosted UI). */
export function getForgotPasswordUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: REDIRECT_URI,
  });
  return `https://${COGNITO_DOMAIN}/forgotPassword?${params.toString()}`;
}

/** Cognito logout URL; redirects here to clear Cognito session, then back to app. */
export function getLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: REDIRECT_URI,
  });
  return `https://${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

/** Clear stored tokens (local only). */
export function clearIdToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('meo_id_token');
  window.localStorage.removeItem('meo_refresh_token');
}

/** Store refresh token separately. */
export function storeRefreshToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('meo_refresh_token', token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('meo_refresh_token');
}

/** Check if JWT is expired (with 60s buffer). */
export function isIdTokenExpired(idToken: string): boolean {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    return Date.now() / 1000 > (payload.exp ?? 0) - 60;
  } catch {
    return true;
  }
}

/** Silently refresh tokens using stored refresh_token. Returns new id_token or null. */
let refreshPromise: Promise<string | null> | null = null;

export async function refreshIdToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.id_token) {
        storeIdToken(data.id_token);
        if (data.refresh_token) storeRefreshToken(data.refresh_token);
        return data.id_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Get a valid id_token — auto-refreshes if expired. */
export async function getValidIdToken(): Promise<string | null> {
  const token = getIdToken();
  if (!token) return null;
  if (!isIdTokenExpired(token)) return token;
  return refreshIdToken();
}

/** Redirect the current browser tab to Cognito Hosted UI login.
 *  Clears local tokens first so a stale refresh_token can't loop the
 *  user back into an unauthenticated session. No-op in SSR. */
export function redirectToLogin(reason?: string): void {
  if (typeof window === 'undefined') return;
  clearIdToken();
  if (reason) {
    // Surfaced in the login page as a small banner so users know why
    // they got kicked out instead of silently re-authing.
    try {
      window.sessionStorage.setItem('meo_auth_redirect_reason', reason);
    } catch {
      // sessionStorage can throw in Safari private mode — the redirect
      // itself is still the critical thing, so swallow and proceed.
    }
  }
  // Best-effort toast before the navigation — helps users who briefly
  // see the redirect flash understand what's happening. The import is
  // dynamic so the auth module stays usable from server components
  // that don't bundle sonner.
  if (typeof window !== 'undefined') {
    import('sonner')
      .then(({ toast }) => {
        toast.info('Session expired — redirecting to sign in', { duration: 2000 });
      })
      .catch(() => {});
  }
  window.location.assign(getLoginUrl());
}


/** Fetch wrapper that handles the whole auth dance for client-side calls.
 *  - Attaches Authorization: Bearer <id_token> (refreshes if expired).
 *  - On 401, tries one refresh, retries, and if still 401 redirects to
 *    Cognito Hosted UI login. Callers never see a surviving 401 —
 *    either the call succeeds, or the tab navigates away.
 *  - Any non-401 failure returns the Response unchanged so the caller
 *    can handle status-specific logic (404, 500, etc.).
 *
 *  Use for every authenticated fetch in the web app — hand-rolling
 *  bearer headers at 15 call sites is how 401s end up dead-ending on
 *  broken pages instead of funneling back through login.
 */
export async function apiFetch(
  input: string | URL | Request,
  init: RequestInit = {},
): Promise<Response> {
  const tryOnce = async (): Promise<Response> => {
    const token = await getValidIdToken();
    if (!token) {
      redirectToLogin('session_expired');
      // Return a Response-ish shape so TS callers don't need to handle
      // undefined — the navigation has already started and this promise
      // never actually settles in practice.
      return new Response(null, { status: 401 });
    }
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type') && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(input, { ...init, headers });
  };

  let resp = await tryOnce();
  if (resp.status !== 401) return resp;

  // First 401 — refresh token and retry once. Refresh can legitimately
  // fail (token revoked, rotated by another tab, network flake) in which
  // case we send the user to login rather than retry-storming.
  const refreshed = await refreshIdToken();
  if (!refreshed) {
    redirectToLogin('refresh_failed');
    return resp;
  }
  resp = await tryOnce();
  if (resp.status === 401) {
    redirectToLogin('still_unauthorized');
  }
  return resp;
}


/** Decode JWT payload without verification (client-side only). Returns sub (Cognito user id). */
export function getSubFromIdToken(idToken: string): string | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

