import { Source } from './types';

export interface ChatResponse {
    response: string; // <-- This was changed from "answer"
    session_id: string;
    retrieved_sources: Source[];
    mode?: 'response' | 'analysis' | 'solution'; // Backend-driven view mode
}

export async function postChatMessage(query: string, sessionId: string): Promise<ChatResponse> {
    // The frontend should call the relative proxy endpoint on the same origin: /api/chat
    // Do not throw if NEXT_PUBLIC_MEO_API_URL is missing in the browser — the server proxy will use MEO_API_URL.
    const endpoint = `/api/chat`;

    if (!process.env.NEXT_PUBLIC_MEO_API_URL) {
        // Non-fatal: warn in the browser console so developers know about the missing environment var.
        // eslint-disable-next-line no-console
        console.warn('NEXT_PUBLIC_MEO_API_URL is not set; calling local proxy at /api/chat');
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The body sends "message" and "session_id" to match backend expectations
        body: JSON.stringify({
            message: query,
            session_id: sessionId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch chat response from backend');
    }

    return await response.json();
}

