/**
 * SSE passthrough to chatbot-rag's /api/chat/stream.
 *
 * We don't reformat the stream through Claude like /api/chat does —
 * that would require buffering the full response first, which defeats
 * the point of streaming. If reformatting matters for the final
 * persisted message, that's a server-side concern inside chatbot-rag.
 *
 * We forward the caller's Authorization header so chatbot-rag can
 * resolve the user via its existing Cognito dependency.
 */
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const base = process.env.MEO_API_URL || 'https://api.meo.meterbolic.com/api/chat';
  const streamUrl = base.endsWith('/chat')
    ? `${base}/stream`
    : `${base.replace(/\/$/, '')}/chat/stream`;

  const authHeader = request.headers.get('authorization');
  const body = await request.text();

  const upstream = await fetch(streamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body,
    // @ts-expect-error — Next.js extends fetch with `duplex` for streaming bodies
    duplex: 'half',
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: `Backend error: ${upstream.status}`, detail: text }),
      { status: upstream.status || 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Pipe the SSE stream straight through — no transformation, no buffering.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable Next.js / Vercel edge buffering so deltas reach the
      // browser as fast as Bedrock emits them.
      'X-Accel-Buffering': 'no',
    },
  });
}
