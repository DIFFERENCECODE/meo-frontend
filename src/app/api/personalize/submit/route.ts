// src/app/api/personalize/submit/route.ts
//
// Proxies to chatbot-rag's /api/personalize/submit endpoint, which forwards
// the confirmed payload to bang-api's /v2/manual/{email}.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8080';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_BASE}/api/personalize/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    console.error('[Personalize Submit Proxy]', e);
    return NextResponse.json(
      { error: e.message || 'Backend unreachable' },
      { status: 502 },
    );
  }
}
