// src/app/api/scores/route.ts
//
// Proxies GET to bang-api's /v2/scores?series=<measurementSeries>.
// Returns { userid, measurementSeries, bas, vat } where bas and vat are
// either { value, time } or null.
import { NextRequest, NextResponse } from 'next/server';

const BANG_API_BASE =
  process.env.BANG_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const series = req.nextUrl.searchParams.get('series');
  if (!series) {
    return NextResponse.json(
      { error: 'Missing required query parameter: series' },
      { status: 400 },
    );
  }

  try {
    const url = `${BANG_API_BASE}/v2/scores?series=${encodeURIComponent(series)}`;
    const res = await fetch(url, {
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
