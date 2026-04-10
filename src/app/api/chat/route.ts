// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const FORMATTING_PROMPT = `You are a markdown formatter for MeO, a metabolic health platform.

You receive a raw AI response and must reformat it using clean, scannable markdown that reads like a friendly explainer.
DO NOT change meaning, add new information, or remove content.

## Output Structure

### Opening paragraph
Start with a short conversational intro paragraph (1-3 sentences) that frames the answer. No heading.

### Numbered sections (when explaining multiple causes/factors/steps)
Use h3 headings with numbered titles. Each heading is short and descriptive (4-8 words). Put a blank line after each heading. Then 1-3 sentences of body text. Use this exact format:

### 1. Blood flow shifts during digestion
After you eat, your body sends more blood to your digestive system to help break down food. This can slightly reduce blood flow to the brain, making you feel sluggish or sleepy.

### 2. What you eat matters (a lot)
Certain foods make matters worse. **High-carb meals** (like pasta, bread, sugary foods) can spike blood sugar, then cause a crash. Foods rich in \`tryptophan\` (like turkey, eggs, cheese) can increase serotonin and melatonin — chemicals linked to relaxation and sleepiness.

### Inline code styling for keywords
Wrap important biological terms, food names, hormones, or technical concepts in single backticks. Use sparingly (3-8 per response). Examples:
- \`tryptophan\`, \`insulin\`, \`cortisol\`, \`circadian rhythm\`
- \`pizza\`, \`high-carb meals\`, \`leafy greens\`
- \`HOMA-IR\`, \`HbA1c\`, \`fasting glucose\`

### Bold for emphasis
Use **bold** for category names or key concepts within a paragraph. Don't overdo it.

### Bullet lists
When a section has multiple sub-items, use bullets (-). Keep each bullet concise.

## Special Cases

### Biomarker tables
If the response mentions biomarker values with numbers, format as a table:

| Biomarker | Value | Unit | Status |
|---|---|---|---|
| Glucose_0 | 4.8 | mmol/L | ✅ Normal |
| Insulin_120 | 78 | µIU/mL | ⚠️ Elevated |

Status: ✅ Normal, ⚠️ Elevated/Borderline, ❌ Critical

### Service/vendor lists
Format as bullets:
- **Taylor Made Rehab** — Metabolic recovery specialists · £120/session

### Key clinical summary
Wrap a single critical insight in a blockquote:
> **Clock Score: 62/100** — Impaired glucose clearance detected.

## Rules

- Never show null, N/A, or placeholder values
- Never add information not in the original response
- Never wrap the whole response in a code block
- Don't use h1 (#) — start at h3 (###)
- Keep paragraphs to 1-3 sentences for scannability
- For short conversational responses (greetings, simple yes/no), keep them as plain paragraphs

Return only the reformatted markdown with no explanation or preamble.`;

async function reformatWithClaude(rawResponse: string): Promise<string> {
  // Skip formatting for very short conversational responses
  if (rawResponse.length < 120) return rawResponse;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: FORMATTING_PROMPT,
        messages: [{ role: 'user', content: rawResponse }],
      }),
    });

    if (!res.ok) {
      console.error('[Formatter] Claude API error:', res.status);
      return rawResponse; // fallback to original
    }
    console.log('[ENV] Key loaded:', !!process.env.ANTHROPIC_API_KEY);
    // Logs "true" if found, "false" if missing

    const data = await res.json();
    const formatted = data.content?.[0]?.text;
    return formatted ?? rawResponse;

  } catch (err) {
    console.error('[Formatter] Failed to reformat:', err);
    return rawResponse; // always fallback gracefully
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, session_id } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('[Proxy] Forwarding to backend:', { message, session_id });

    // Build backend chat URL from base API URL or fallback
    const base = process.env.MEO_API_URL || 'https://api.meo.meterbolic.com/api/chat';
    const BACKEND_URL = base.endsWith('/chat') ? base : `${base.replace(/\/$/, '')}/chat`;

    const authHeader = request.headers.get('authorization');

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        message,
        session_id: session_id || 'demo_session',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Proxy] Backend response received');

    // ✅ Reformat response through Claude before sending to frontend
    if (data.response && typeof data.response === 'string') {
      data.response = await reformatWithClaude(data.response);
      console.log('[Formatter] Response reformatted');
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Proxy] Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}