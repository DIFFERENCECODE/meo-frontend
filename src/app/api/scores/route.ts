// src/app/api/scores/route.ts
//
// GET ?series=<measurementSeries> -> { measurementSeries, bas, vat } where bas
// and vat are { value, time } or null. Served from the backend's readings
// model (see _lib/points.ts for why not bang directly).
import { NextRequest, NextResponse } from 'next/server';
import { fetchScorePoints } from './_lib/points';

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
    const { status, points, error } = await fetchScorePoints(auth);
    if (error) return NextResponse.json({ error }, { status });
    const p = points.find((x) => x.measurementSeries === series);
    return NextResponse.json({
      measurementSeries: series,
      bas: p && p.bas != null ? { value: p.bas, time: p.time } : null,
      vat: p && p.vat != null ? { value: p.vat, time: p.time } : null,
      provisional: p?.provisional ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Backend unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
