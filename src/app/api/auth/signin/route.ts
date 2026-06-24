import { NextRequest, NextResponse } from "next/server";
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, CLIENT_ID, secretHash, authError } from "@/app/lib/cognito-server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  try {
    const r = await cognito.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH", ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password, SECRET_HASH: secretHash(email) },
    }));
    const a = r.AuthenticationResult;
    if (!a) return NextResponse.json({ error: "Additional step required.", challenge: r.ChallengeName }, { status: 401 });
    return NextResponse.json({ id_token: a.IdToken, access_token: a.AccessToken, refresh_token: a.RefreshToken, expires_in: a.ExpiresIn });
  } catch (e) { const { msg, code } = authError(e); return NextResponse.json({ error: msg, code }, { status: 401 }); }
}
