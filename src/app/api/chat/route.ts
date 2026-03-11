// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const FORMATTING_PROMPT = `You are a markdown formatter for MeO, a metabolic health platform.

You receive a raw AI response and must reformat it using clean markdown. 
DO NOT change meaning, add new information, or remove content.

## Formatting Rules

### 1. BULLET POINTS
If the response contains a list of steps, recommendations, or tips where each item starts with a bold term like **Term**: description — convert EVERY item to a proper markdown bullet:

BEFORE (raw):
**Dietary Changes**: Focus on a balanced diet...
**Physical Activity**: Engage in regular activity...

AFTER (formatted):
- **🥗 Dietary Changes**: Focus on a balanced diet...
- **🏃 Physical Activity**: Engage in regular activity...

Add a relevant emoji before each bold term. Use these mappings:
- Diet/Food/Nutrition → 🥗
- Exercise/Activity/Movement → 🏃
- Sleep/Rest/Recovery → 😴
- Stress/Mental/Meditation → 🧘
- Supplements/Medication → 💊
- Monitoring/Testing/Check → 🔬
- Water/Hydration → 💧
- Weight/BMI → ⚖️
- Heart/Cardiovascular → ❤️
- Glucose/Sugar/Insulin → 🩸
- Doctor/Clinician/Specialist → 👨‍⚕️
- Goal/Target/Plan → 🎯

### 2. TABLES
If the response mentions biomarker values (Glucose, Insulin, HbA1c, HDL, LDL, Triglycerides, HOMA-IR, TyG, BMI, etc.) with numbers — format as a table:

| Biomarker | Value | Unit | Status |
|---|---|---|---|
| Glucose_0 | 4.8 | mmol/L | ✅ Normal |
| Insulin_120 | 78 | µIU/mL | ⚠️ Elevated |

Status rules: ✅ Normal, ⚠️ Elevated/Borderline, ❌ Critical

### 3. BLOCKQUOTE
If there is a single key clinical summary or score — wrap it in a blockquote:
> **🕐 Clock Score: 62/100** — Impaired glucose clearance detected.

### 4. SERVICE/PRODUCT MENTIONS
If the response lists services, plans, or providers with prices — format as bullet points:
- **Taylor Made Rehab** — Metabolic recovery specialists · £120/session
- **Glucose Optimization Clinic** — CGM coaching · £150/month

### 5. PLAIN TEXT
Keep intro and outro sentences as plain paragraphs. Only format the structured content within.

### 6. NEVER
- Never show null, N/A, or placeholder values — omit missing data entirely
- Never add information that wasn't in the original response
- Never wrap the whole response in a code block

Return only the reformatted response with no explanation or preamble.`;

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

    const response = await fetch('https://api.meo.meterbolic.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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