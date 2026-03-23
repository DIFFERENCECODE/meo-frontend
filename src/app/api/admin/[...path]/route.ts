import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

async function proxyToBackend(request: NextRequest, path: string) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = `${BACKEND_BASE}/admin/${path}`;
  const headers: Record<string, string> = { Authorization: authHeader };

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const body = await request.text();
      if (body) {
        headers['Content-Type'] = 'application/json';
        init.body = body;
      }
    } catch {}
  }

  try {
    const res = await fetch(url, init);
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error(`[Admin Proxy] ${request.method} ${path} error`, e);
    return NextResponse.json({ error: 'Admin API request failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToBackend(request, path.join('/'));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToBackend(request, path.join('/'));
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToBackend(request, path.join('/'));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToBackend(request, path.join('/'));
}
