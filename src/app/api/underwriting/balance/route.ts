import { NextRequest, NextResponse } from 'next/server';

// Underwriting prototype (SCRUM-20). Airmiles-style balance + ledger lookup,
// proxied to the chatbot-rag backend. Public — prototype demo data, no PII.

function getBackendUrl(path: string): string {
  const base = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET(request: NextRequest) {
  try {
    const customer = request.nextUrl.searchParams.get('customer') || 'demo';
    const res = await fetch(
      getBackendUrl(`/underwriting/balance?customer=${encodeURIComponent(customer)}`),
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Underwriting] balance error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
