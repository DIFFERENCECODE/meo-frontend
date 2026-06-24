import { NextRequest, NextResponse } from "next/server";
import { ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, CLIENT_ID, secretHash, authError } from "@/app/lib/cognito-server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const { email, code, password } = await req.json().catch(() => ({}));
  if (!email || !code || !password) return NextResponse.json({ error: "Email, code and new password required." }, { status: 400 });
  try {
    await cognito.send(new ConfirmForgotPasswordCommand({ ClientId: CLIENT_ID, Username: email, ConfirmationCode: String(code), Password: password, SecretHash: secretHash(email) }));
    return NextResponse.json({ ok: true });
  } catch (e) { const { msg, code: c } = authError(e); return NextResponse.json({ error: msg, code: c }, { status: 400 }); }
}
