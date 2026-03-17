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

/** Clear stored id token (local only). */
export function clearIdToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('meo_id_token');
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

