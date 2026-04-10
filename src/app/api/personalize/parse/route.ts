// src/app/api/personalize/parse/route.ts
//
// Takes free-form text describing measurements (Kraft test, biomarkers, etc.)
// and returns a structured payload that bang-api's /v2/manual/{email} accepts.
//
// Uses Claude to parse natural language → JSON.
import { NextRequest, NextResponse } from 'next/server';

const PARSE_PROMPT = `You are a medical data parser for the MeO metabolic health platform.

You receive free-form text from a user describing their measurements (Kraft test, biomarkers, glucose readings, body measurements, etc.) and you must convert it into a strictly structured JSON payload.

## OUTPUT FORMAT

Return ONLY valid JSON with this exact structure (no markdown, no explanation):

{
  "subjectEmail": "<user email>",
  "items": [
    {
      "date": "ISO 8601 UTC timestamp (e.g. 2026-04-01T08:51:00Z)",
      "measurementSeries": "YYYYMMDD_<series suffix or subject id>",
      "name": "<analyte name e.g. Glucose, Insulin, Weight, LDL>",
      "unit": "<unit e.g. mMol, ng/mL, kg, cm, µIU/ml>",
      "value": <numeric value>,
      "source": "INCOMING",
      "recordType": "CLINICAL",
      "subjectState": "FASTING" or "POSTPRANDIAL",
      "canontimeofglucose": "<ISO 8601 UTC of the FIRST sample in the series>"
    }
  ]
}

## RULES

1. **Time zone**: Times in user input are assumed to be in the timezone provided in user_timezone. Convert all times to UTC.
2. **canontimeofglucose**: This is the timestamp of the FIRST glucose sample in a Kraft series. Use the earliest measurement time. ALL items in the same Kraft test share the same canontimeofglucose.
3. **measurementSeries**: Build as "<YYYYMMDD>_<subject_id_or_index>". If user provides a subject id like "uk202603111645aaa", use that. If multiple test sessions, increment.
4. **subjectState**:
   - "FASTING" for the first reading set
   - "POSTPRANDIAL" for everything after
   - Body measurements (Weight, Height, Waist, Hip, BMI) are typically FASTING
5. **Unit normalization**:
   - Glucose: mMol (mmol/L)
   - Insulin: µIU/ml (uIU/mL)
   - Cholesterol/LDL/HDL/Triglycerides: mMol
   - Weight: kg
   - Height: cm
   - Waist/Hip: cm
   - HbA1c: % (or mmol/mol)
6. **Date formatting**: ISO 8601 with Z suffix (UTC). Example: "2026-04-01T08:51:00Z"
7. **Numeric values**: Always numbers, never strings.
8. **Missing fields**: If you cannot parse anything meaningful, return: {"error": "Unable to parse measurements", "items": []}

## KRAFT TEST EXAMPLE

Input:
"Subject: uk202603111645aaa
Date: 2026-04-01
FASTING at 9:52
Glucose 5.1
Insulin 1.44
LDL 7.13
HDL 2.15
Triglycerides 0.40
POSTPRANDIAL
10:22 Glucose 11.0 Insulin 5.8
10:52 Glucose 8.9 Insulin 26.9"

Output (assuming user_timezone is UTC):
{
  "subjectEmail": "<USER_EMAIL>",
  "items": [
    {"date":"2026-04-01T09:52:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"Glucose","unit":"mMol","value":5.1,"source":"INCOMING","recordType":"CLINICAL","subjectState":"FASTING","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T09:52:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"Insulin","unit":"µIU/ml","value":1.44,"source":"INCOMING","recordType":"CLINICAL","subjectState":"FASTING","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T09:52:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"LDL","unit":"mMol","value":7.13,"source":"INCOMING","recordType":"CLINICAL","subjectState":"FASTING","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T09:52:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"HDL","unit":"mMol","value":2.15,"source":"INCOMING","recordType":"CLINICAL","subjectState":"FASTING","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T09:52:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"Triglycerides","unit":"mMol","value":0.40,"source":"INCOMING","recordType":"CLINICAL","subjectState":"FASTING","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T10:22:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"Glucose","unit":"mMol","value":11.0,"source":"INCOMING","recordType":"CLINICAL","subjectState":"POSTPRANDIAL","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T10:22:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"Insulin","unit":"µIU/ml","value":5.8,"source":"INCOMING","recordType":"CLINICAL","subjectState":"POSTPRANDIAL","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T10:52:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"Glucose","unit":"mMol","value":8.9,"source":"INCOMING","recordType":"CLINICAL","subjectState":"POSTPRANDIAL","canontimeofglucose":"2026-04-01T09:52:00Z"},
    {"date":"2026-04-01T10:52:00Z","measurementSeries":"20260401_uk202603111645aaa","name":"Insulin","unit":"µIU/ml","value":26.9,"source":"INCOMING","recordType":"CLINICAL","subjectState":"POSTPRANDIAL","canontimeofglucose":"2026-04-01T09:52:00Z"}
  ]
}

## REFINEMENT MODE

If the user provides a previous_payload AND a refinement_instruction, apply the instruction to the previous payload (e.g. "change all glucose values from mmol to mg/dl", "remove the 11:21 reading", "make subject id different"). Return the modified full payload.

Return ONLY the JSON object. No markdown wrapping. No explanation.`;

interface ParseRequest {
  text: string;
  user_email: string;
  user_timezone: string;
  previous_payload?: any;
  refinement_instruction?: string;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ParseRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.text && !body.refinement_instruction) {
    return NextResponse.json({ error: 'text or refinement_instruction is required' }, { status: 400 });
  }
  if (!body.user_email) {
    return NextResponse.json({ error: 'user_email is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_ANTHROPIC_KEY') {
    return NextResponse.json({ error: 'Anthropic API key not configured on server' }, { status: 500 });
  }

  // Build the user message for Claude
  let userMessage: string;
  if (body.refinement_instruction && body.previous_payload) {
    userMessage = `user_email: ${body.user_email}
user_timezone: ${body.user_timezone || 'UTC'}

PREVIOUS PAYLOAD:
${JSON.stringify(body.previous_payload, null, 2)}

REFINEMENT INSTRUCTION:
${body.refinement_instruction}`;
  } else {
    userMessage = `user_email: ${body.user_email}
user_timezone: ${body.user_timezone || 'UTC'}

INPUT TEXT:
${body.text}`;
  }

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: PARSE_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[Personalize Parse] Claude error:', claudeRes.status, errText);
      return NextResponse.json(
        { error: `Parser API error: ${claudeRes.status}` },
        { status: 500 },
      );
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || '';

    // Extract JSON object from response (in case Claude wraps it)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Parser returned no JSON', raw: text },
        { status: 500 },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Parser returned invalid JSON', raw: text },
        { status: 500 },
      );
    }

    // Always overwrite subjectEmail to ensure security
    parsed.subjectEmail = body.user_email;

    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error('[Personalize Parse] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Failed to parse measurements' },
      { status: 500 },
    );
  }
}
