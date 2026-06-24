import { NextRequest, NextResponse } from "next/server";
import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, CLIENT_ID, secretHash, authError } from "@/app/lib/cognito-server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  try {
    const r = await cognito.send(new SignUpCommand({
      ClientId: CLIENT_ID, Username: email, Password: password, SecretHash: secretHash(email),
      UserAttributes: [{ Name: "email", Value: email }, { Name: "name", Value: name || email }],
    }));
    return NextResponse.json({ ok: true, needsConfirm: !r.UserConfirmed });
  } catch (e) { const { msg, code } = authError(e); return NextResponse.json({ error: msg, code }, { status: 400 }); }
}
