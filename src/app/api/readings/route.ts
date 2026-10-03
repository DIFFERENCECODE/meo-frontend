import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

/**
 * Proxy for the backend's grouped patient record.
 *
 * `/api/user-data` returns bang's raw measurement stream — hundreds of rows,
 * each value repeated once per unit bang stores it in. This one returns the
 * same record already grouped into readings, with the two most recent lipid
 * panels, the change between them and per-biomarker series for charting.
 *
 * Kept as a separate route rather than a flag on user-data: the two have
 * different shapes and different callers, and Activity still wants the raw
 * stream for its per-measurement edit and delete.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await fetch(`${BACKEND_BASE}/meo/readings`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[Readings] GET error', e);
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
  }
}
