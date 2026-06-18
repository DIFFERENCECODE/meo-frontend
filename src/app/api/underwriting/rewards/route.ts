import { NextResponse } from 'next/server';

// Underwriting prototype (SCRUM-20). Returns the metertoken reward catalogue
// from the chatbot-rag backend. Public — static catalogue, no PII.

function getBackendUrl(path: string): string {
  const base = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET() {
  try {
    const res = await fetch(getBackendUrl('/underwriting/rewards'));
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Underwriting] rewards error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
