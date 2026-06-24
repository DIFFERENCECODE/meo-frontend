import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { session_id } = await params;
  const body = await request.json();

  try {
    const res = await fetch(`${BACKEND_BASE}/clinician/${session_id}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[Clinician Chat] POST error', e);
    return NextResponse.json({ error: 'Failed to reach clinical AI' }, { status: 500 });
  }
}
