// src/app/api/scores/sessions/route.ts
//
// Lists the measurementSeries for which the logged-in user has a BAS, most
// recent first. Empty array is a valid response. Served from the backend's
// readings model (see ../_lib/points.ts).
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
    const sessions = [...points]
      .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
      .map((p) => ({ measurementSeries: p.measurementSeries, time: p.time }));
    return NextResponse.json({ sessions });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Backend unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
