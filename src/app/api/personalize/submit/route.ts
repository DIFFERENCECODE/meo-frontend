// src/app/api/personalize/submit/route.ts
//
// Submits a confirmed measurement payload to bang-api's /v2/manual/{email} endpoint.
import { NextRequest, NextResponse } from 'next/server';

const BANG_API_URL = process.env.BANG_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = auth.slice(7);

  // Decode email from JWT
  let email: string;
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString(),
    );
    email = payload.email;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (!email) {
    return NextResponse.json({ error: 'No email in token' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'No items to submit' }, { status: 400 });
  }

  // Force subjectEmail to authenticated user (security)
  const payload = {
    subjectEmail: email,
    items: body.items,
  };

  try {
    const res = await fetch(`${BANG_API_URL}/v2/manual/${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    let responseJson: any = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {}

    if (!res.ok) {
      console.error('[Personalize Submit] Bang API error:', res.status, responseText);
      return NextResponse.json(
        {
          error: `Submission failed: ${res.status}`,
          detail: responseJson || responseText,
        },
        { status: res.status },
      );
    }

    return NextResponse.json({
      success: true,
      submitted: payload.items.length,
      response: responseJson,
    });
  } catch (e: any) {
    console.error('[Personalize Submit] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Failed to submit measurements' },
      { status: 500 },
    );
  }
}
