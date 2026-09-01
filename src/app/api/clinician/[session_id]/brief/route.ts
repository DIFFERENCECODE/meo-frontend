import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { session_id } = await params;

  try {
    const res = await fetch(`${BACKEND_BASE}/clinician/${session_id}/brief`, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[Clinician Brief] GET error', e);
    return NextResponse.json({ error: 'Failed to reach clinical AI' }, { status: 500 });
  }
}
