import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET!;
const DOMAIN = process.env.COGNITO_DOMAIN!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!;

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
        redirect_uri: REDIRECT_URI,
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
