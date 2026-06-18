import { NextRequest, NextResponse } from 'next/server';

// Underwriting prototype (SCRUM-20). Proxies the scoring request to the
// chatbot-rag backend where the algorithm lives. Public — no auth required,
// the prototype scores explicit inputs and handles no PII.

function getBackendUrl(path: string): string {
  const base = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(getBackendUrl('/underwriting/score'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Underwriting] score error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
