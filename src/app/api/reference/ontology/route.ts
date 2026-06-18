// src/app/api/reference/ontology/route.ts
//
// SCRUM-21 — Universal Ontology.
// Proxies GET to the MeO backend's public /api/reference/ontology endpoint,
// which returns the measurement ontology that binds MeO entities to LOINC
// (the question), UCUM (the unit) and SNOMED CT (the answer).
//
// Reference data is non-PII, so no Authorization header is required.
import { NextResponse } from 'next/server';

function getBackendUrl(path: string): string {
  const base = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET() {
  try {
    const res = await fetch(getBackendUrl('/reference/ontology'), {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Backend unreachable';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
