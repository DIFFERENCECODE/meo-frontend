export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

const BACKEND = process.env.MEO_API_URL;

export async function GET(
    _req: Request,
    { params }: { params: { session_id: string } }
) {
    if (!BACKEND) return NextResponse.json({ detail: 'API URL not configured' }, { status: 500 });
    try {
        const res = await fetch(`${BACKEND}/history/${params.session_id}`);
        if (!res.ok) return NextResponse.json({ detail: 'History fetch failed' }, { status: res.status });
        return NextResponse.json(await res.json());
    } catch {
        return NextResponse.json({ detail: 'Internal error' }, { status: 500 });
    }
}
