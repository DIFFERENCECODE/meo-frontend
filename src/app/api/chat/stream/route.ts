/**
 * SSE passthrough to chatbot-rag's /api/chat/stream.
 *
 * If the backend doesn't have a /stream endpoint yet (404), falls back to
 * the non-streaming /api/chat endpoint and emits the full response as a
 * single synthetic SSE event so the UI's stream reader still works.
 *
 * We forward the caller's Authorization header so chatbot-rag can
 * resolve the user via its existing Cognito dependency.
 */
import { NextRequest } from 'next/server';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

function sseEvent(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: NextRequest) {
  const base = process.env.MEO_API_URL || 'https://api.meo.meterbolic.com/api/chat';
  const chatUrl = base.endsWith('/chat') ? base : `${base.replace(/\/$/, '')}/chat`;
  const streamUrl = `${chatUrl}/stream`;

  const authHeader = request.headers.get('authorization');
  const body = await request.text();

  const commonHeaders = {
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  // --- Attempt native SSE stream first ---
  const upstream = await fetch(streamUrl, {
    method: 'POST',
    headers: { ...commonHeaders, Accept: 'text/event-stream' },
    body,
    // @ts-expect-error — Next.js extends fetch with `duplex` for streaming bodies
    duplex: 'half',
  });

  if (upstream.ok && upstream.body) {
    // Pipe the SSE stream straight through — no transformation, no buffering.
    return new Response(upstream.body, { status: 200, headers: SSE_HEADERS });
  }

  // --- Fallback: non-streaming /api/chat → synthetic SSE ---
  // Backend doesn't expose /stream yet (404) or returned an error.
  // Call the standard JSON endpoint and wrap the response as SSE so
  // the UI stream reader receives the expected event format.
  if (upstream.status === 404) {
    const fallback = await fetch(chatUrl, {
      method: 'POST',
      headers: commonHeaders,
      body,
    });

    if (!fallback.ok) {
      const text = await fallback.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: `Backend error: ${fallback.status}`, detail: text }),
        { status: fallback.status || 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const json = await fallback.json() as {
      response: string;
      mode?: string;
      steps?: unknown[];
      retrieved_sources?: unknown[];
    };

    const chunks = [
      sseEvent({ phase: 'content', delta: json.response ?? '' }),
      sseEvent({ phase: 'done', mode: json.mode ?? 'response', steps: json.steps ?? [] }),
    ];

    return new Response(chunks.join(''), { status: 200, headers: SSE_HEADERS });
  }

  // Any other upstream error — surface it.
  const text = await upstream.text().catch(() => '');
  return new Response(
    JSON.stringify({ error: `Backend error: ${upstream.status}`, detail: text }),
    { status: upstream.status || 500, headers: { 'Content-Type': 'application/json' } },
  );
}
