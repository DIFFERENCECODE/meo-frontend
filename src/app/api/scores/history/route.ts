// src/app/api/scores/history/route.ts
//
// Returns BAS + VAT time series across ALL sessions for the logged-in user.
// Fetches /v2/scores/sessions, then resolves each session in parallel.
// Response: { points: Array<{ measurementSeries, time, bas, vat }> }
// sorted by time ascending so the chart renders left → right chronologically.
import { NextRequest, NextResponse } from 'next/server';

const BANG_API_BASE =
  process.env.BANG_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

interface SessionRow {
  measurementSeries: string;
  time: number | null;
}

interface ScoresResponse {
  measurementSeries: string;
  bas: { value: number; time: number | null } | null;
  vat: { value: number; time: number | null } | null;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessionsRes = await fetch(`${BANG_API_BASE}/v2/scores/sessions`, {
      headers: { Authorization: auth },
      cache: 'no-store',
    });
    if (!sessionsRes.ok) {
      return NextResponse.json({ error: 'Sessions fetch failed' }, { status: sessionsRes.status });
    }
    const { sessions }: { sessions: SessionRow[] } = await sessionsRes.json();
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ points: [] });
    }

    const results = await Promise.allSettled(
      sessions.map((s) =>
        fetch(
          `${BANG_API_BASE}/v2/scores?series=${encodeURIComponent(s.measurementSeries)}`,
          { headers: { Authorization: auth }, cache: 'no-store' },
        ).then((r) => r.json() as Promise<ScoresResponse>),
      ),
    );

    const points = results
      .flatMap((r, i) => {
        if (r.status !== 'fulfilled') return [];
        const d = r.value;
        const t = d.bas?.time ?? d.vat?.time ?? sessions[i].time;
        if (!t) return [];
        return [
          {
            measurementSeries: d.measurementSeries,
            time: t,
            bas: d.bas?.value ?? null,
            vat: d.vat?.value ?? null,
          },
        ];
      })
      .sort((a, b) => a.time - b.time);

    return NextResponse.json({ points });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Backend unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
