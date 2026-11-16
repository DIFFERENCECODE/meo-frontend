import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

/** The patient's own view of what their practitioner has written. */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${BACKEND_BASE}/me/practitioner-notes`, {
      headers: { Authorization: auth },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[Practitioner Notes] GET', e);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
