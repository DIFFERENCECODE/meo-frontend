import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET!;
const DOMAIN = process.env.COGNITO_DOMAIN!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
    });

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

