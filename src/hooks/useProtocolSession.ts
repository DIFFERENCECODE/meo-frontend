'use client';

import { useCallback, useRef, useState } from 'react';
import { getValidIdToken, getSubFromIdToken } from '@/app/lib/auth';

/**
 * Drives a guided test from anywhere in the app.
 *
 * Why this exists: the protocol state machine lives on the server, and until
 * now the only way to learn its current state was to send a chat message and
 * read `protocol_state` off the stream's `done` event. That tied the guided
 * test to the chat screen — the test could only ever be an overlay on top of a
 * conversation. The storyboard puts it the other way round: the test is the
 * room you stand in, and chat is something you pull up from inside it.
 *
 * So this hook owns the protocol slice of that transport and nothing else. It
 * posts to the same endpoint MeOApp does and keeps the state it gets back, but
 * it throws the prose away rather than rendering a transcript. The conversation
 * still exists server-side under `sessionId`, so a patient can open the test as
 * a chat afterwards and read what was said.
 *
 * Deliberately NOT a refactor of MeOApp: the chat screen keeps its own send
 * path untouched. This is a second, narrower reader of the same stream.
 *
 * Known seam: advancing a step still round-trips through the LLM, because the
 * transition is decided by the protocol agent reading the user's message. A
 * structured `POST /meo/protocol/step` that calls the state machine directly
 * would be deterministic and cheaper, and is the right next backend change —
 * but it moves clinical-path code, so it is not bundled with a UI change.
 */
export type ProtocolPhase = 'idle' | 'starting' | 'active' | 'error';

export function useProtocolSession() {
  const [state, setState] = useState<string | null>(null);
  const [phase, setPhase] = useState<ProtocolPhase>('idle');
  /** The coach's last line, kept so the screen can show one sentence of guidance. */
  const [note, setNote] = useState<string>('');
  const sessionIdRef = useRef<string | null>(null);

  /** One round trip: send a message, keep the protocol state, discard the rest. */
  const send = useCallback(async (message: string) => {
    const token = await getValidIdToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // A test gets its own thread the first time it sends, so the transcript is
    // retrievable later instead of being written into whatever chat was last open.
    if (!sessionIdRef.current) {
      if (token) {
        const created = await fetch('/api/chats', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        sessionIdRef.current = created.ok
          ? (await created.json()).id
          : getSubFromIdToken(token) || 'demo_session';
      } else {
        sessionIdRef.current = 'demo_session';
      }
    }

    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { ...headers, Accept: 'text/event-stream' },
      body: JSON.stringify({
        message,
        session_id: sessionIdRef.current,
        user_language: 'en',
      }),
    });
    if (!res.ok || !res.body) throw new Error(`stream error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let prose = '';

    // Same SSE framing as the chat panel: `data: {json}` per event, blank-line
    // delimited. We only care about content deltas (for the one-line note) and
    // the `done` event's protocol_state.
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const line = frame.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        let payload: { phase?: string; delta?: string; protocol_state?: string };
        try {
          payload = JSON.parse(line.slice(6));
        } catch {
          continue;
        }
        if (payload.phase === 'content' && typeof payload.delta === 'string') {
          prose += payload.delta;
        } else if (payload.phase === 'done' && payload.protocol_state) {
          setState(payload.protocol_state === 'idle' ? null : payload.protocol_state);
        }
      }
    }

    // One sentence, not a wall: this is a gloss under the step, not a transcript.
    setNote(prose.trim().split(/(?<=[.!?])\s+/)[0] ?? '');
  }, []);

  const start = useCallback(async () => {
    setPhase('starting');
    try {
      // Matches `extract_bas_trigger` in protocol_state_machine.py.
      await send('start BAS test');
      setPhase('active');
    } catch {
      setPhase('error');
    }
  }, [send]);

  const submit = useCallback(async (message: string) => {
    try {
      await send(message);
    } catch {
      setPhase('error');
    }
  }, [send]);

  const exit = useCallback(() => {
    setState(null);
    setPhase('idle');
    setNote('');
    sessionIdRef.current = null;
  }, []);

  return { state, phase, note, sessionId: sessionIdRef.current, start, submit, exit };
}
