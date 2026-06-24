import { NextRequest, NextResponse } from "next/server";
import { ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, CLIENT_ID, secretHash, authError } from "@/app/lib/cognito-server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });
  try {
    await cognito.send(new ResendConfirmationCodeCommand({ ClientId: CLIENT_ID, Username: email, SecretHash: secretHash(email) }));
    return NextResponse.json({ ok: true });
  } catch (e) { const { msg, code } = authError(e); return NextResponse.json({ error: msg, code }, { status: 400 }); }
}
