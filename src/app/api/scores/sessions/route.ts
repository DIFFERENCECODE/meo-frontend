// src/app/api/scores/sessions/route.ts
//
// Proxies GET to bang-api's /v2/scores/sessions endpoint. Lists the
// measurementSeries values for which the logged-in user has a BAS
// record, sorted most-recent first. Empty array is a valid response.
import { NextRequest, NextResponse } from 'next/server';

const BANG_API_BASE =
  process.env.BANG_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BANG_API_BASE}/v2/scores/sessions`, {
      headers: { Authorization: auth },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Backend unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
