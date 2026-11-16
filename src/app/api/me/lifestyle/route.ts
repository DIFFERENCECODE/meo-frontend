import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

/** The patient's own sleep, steps and meals, day by day. */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const days = request.nextUrl.searchParams.get('days') ?? '14';

  try {
    const res = await fetch(`${BACKEND_BASE}/me/lifestyle?days=${encodeURIComponent(days)}`, {
      headers: { Authorization: auth },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[Lifestyle] GET', e);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
