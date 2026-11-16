// Shared fetch for the three score routes.
//
// These used to call bang directly with the patient's Cognito token. bang
// resolves the caller by the token's `sub`, so a person who signed in a second
// way (Google vs email code) is a stranger to it and every score screen came
// back 403. They now read the backend's /meo/scores, which resolves the person
// to their one account and serves the same readings model as the record.
const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';

export interface ScorePoint {
  measurementSeries: string;
  time: number | null;
  bas: number | null;
  vat: number | null;
  provisional: string | null;
}

export async function fetchScorePoints(auth: string): Promise<{ status: number; points: ScorePoint[]; error?: string }> {
  const res = await fetch(`${BACKEND_BASE}/meo/scores`, {
    headers: { Authorization: auth },
    cache: 'no-store',
  });
  if (!res.ok) {
    return { status: res.status, points: [], error: 'Scores fetch failed' };
  }
  const data = await res.json();
  return { status: 200, points: Array.isArray(data.points) ? data.points : [] };
}
