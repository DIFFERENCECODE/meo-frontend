import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET!;
const DOMAIN = process.env.COGNITO_DOMAIN!;

// Mirror the client-side getRedirectUri() logic: derive from the real public
// host so server and client always agree on the redirect_uri Cognito validates.
function getRedirectUri(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}/`;
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { code, refresh_token } = json;

    if (!code && !refresh_token) {
      return NextResponse.json({ error: 'Missing code or refresh_token' }, { status: 400 });
    }

    let body: URLSearchParams;

    if (refresh_token) {
      // Token refresh flow
      body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: CLIENT_ID,
      });
    } else {
      // Authorization code exchange flow
      body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(request),
        client_id: CLIENT_ID,
      });
    }

    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const res = await fetch(`https://${DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Auth] Token exchange failed', err);
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
  }
}
