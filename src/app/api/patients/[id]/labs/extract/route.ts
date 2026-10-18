// Proxies one lab report (PDF, photo or text file) to chatbot-rag's
// /patients/{id}/labs/extract, which reads it into proposed rows. Nothing is
// saved there; the practitioner confirms the rows and the save goes through
// /api/patients/{id}/labs.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const form = await request.formData();
    const res = await fetch(`${BACKEND_BASE}/patients/${encodeURIComponent(id)}/labs/extract`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[Labs Extract] POST error', e);
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 });
  }
}
