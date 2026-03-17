import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl(path: string): string {
  const base = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Session id required' }, { status: 400 });
  }
  try {
    const res = await fetch(getBackendUrl(`/history/${sessionId}`), {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[History] GET error', e);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
