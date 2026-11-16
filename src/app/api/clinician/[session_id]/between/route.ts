import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

/** What happened between appointments. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> },
) {
  const auth = request.headers.get('authorization');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_id } = await params;
  try {
    const res = await fetch(`${BACKEND_BASE}/clinician/${session_id}/between`, {
      headers: { Authorization: auth },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[Between visits] GET', e);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
