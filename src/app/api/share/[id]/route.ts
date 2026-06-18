import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl(path: string): string {
  const base = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

// Public, read-only proxy for a shared chat. Unlike /api/history this
// route intentionally requires NO authorization header — the chat id is
// the share secret. It forwards to the backend's public /share/{id}.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Chat id required' }, { status: 400 });
  }
  try {
    const res = await fetch(getBackendUrl(`/share/${id}`), { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[Share] GET error', e);
    return NextResponse.json({ error: 'Failed to fetch shared chat' }, { status: 500 });
  }
}
