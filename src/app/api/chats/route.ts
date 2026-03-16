import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl(path: string): string {
  const base = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await fetch(getBackendUrl('/chats'), {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[Chats] GET error', e);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await fetch(getBackendUrl('/chats'), {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[Chats] POST error', e);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
