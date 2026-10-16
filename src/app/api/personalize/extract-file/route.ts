// Proxies an uploaded report (PDF, photo or text file) to chatbot-rag's
// /api/personalize/extract-file, which only turns it into text. The patient
// reviews every value on /personalize before anything is saved.
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8080';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const res = await fetch(`${BACKEND_BASE}/api/personalize/extract-file`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    console.error('[Extract File Proxy]', e);
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 });
  }
}
