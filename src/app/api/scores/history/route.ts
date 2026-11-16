// src/app/api/scores/history/route.ts
//
// BAS + VAT across every scored reading for the logged-in user, oldest first
// so the chart renders left to right. Response: { points: [{ measurementSeries,
// time, bas, vat, provisional }] }. Served from the backend's readings model in
// one call (see ../_lib/points.ts); it used to fan out one bang call per session.
import { NextRequest, NextResponse } from 'next/server';
import { fetchScorePoints } from '../_lib/points';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status, points, error } = await fetchScorePoints(auth);
    if (error) return NextResponse.json({ error }, { status });
    return NextResponse.json({
      points: points.filter((p) => p.time != null).sort((a, b) => (a.time ?? 0) - (b.time ?? 0)),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Backend unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
