import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });

const FROM = 'Meterbolic <noreply@meterbolic.com>';

// Same internal-address convention already used by the other server routes
// that talk to chatbot-rag (see api/personalize/*/route.ts) rather than a
// new one-off hardcoded host.
const BACKEND_BASE = process.env.MEO_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8080';

// Looks up the practitioner's own contact email server-side from the
// shared marketplace roster, rather than trusting a client-supplied
// email address for who to CC -- a client could otherwise set that to
// anything and turn this endpoint into an open relay.
async function lookupContactEmail(therapistId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/marketplace/therapists`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const match = (data.therapists || []).find((t: any) => t.id === therapistId);
    return match?.contactEmail ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userEmail, therapistId, therapistName, day, slot, sessionLength, price } = await req.json();

    if (!userEmail || !therapistName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await ses.send(
      new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [userEmail] },
        Message: {
          Subject: { Data: `Session confirmed: ${therapistName} on ${day} at ${slot}` },
          Body: {
            Html: {
              Data: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:0">
  <div style="max-width:520px;margin:40px auto;background:#1a1f2e;border:1px solid #2d3748;border-radius:16px;overflow:hidden">
    <div style="background:#7c6af7;padding:28px 32px">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Session Confirmed</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">Your Meo therapy booking is confirmed</p>
    </div>
    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;width:40%">Therapist</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${therapistName}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Date</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${day}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Time</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${slot}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Duration</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${sessionLength} minutes</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Price</td><td style="padding:8px 0;font-weight:600;color:#7c6af7">£${price}</td></tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#0f1117;border-radius:12px;border:1px solid #2d3748">
        <p style="margin:0;font-size:13px;color:#94a3b8">A video link will be sent to this email before your session. Please add the event to your calendar and arrive a few minutes early.</p>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#64748b">To manage your bookings visit <a href="https://app.meterbolic.com/profile" style="color:#7c6af7">app.meterbolic.com/profile</a></p>
    </div>
  </div>
</body>
</html>`,
            },
            Text: {
              Data: `Session Confirmed\n\nTherapist: ${therapistName}\nDate: ${day}\nTime: ${slot}\nDuration: ${sessionLength} min\nPrice: £${price}\n\nManage bookings: https://app.meterbolic.com/profile`,
            },
          },
        },
      }),
    );

    // Notify the practitioner too -- previously this endpoint only ever
    // told the user, so a doctor had no way to learn a session had been
    // booked with them at all. Best-effort: a missing/unresolvable
    // contact email (e.g. practitioner not found, or MEO_API_URL down)
    // must not fail the user's own booking confirmation, which has
    // already been sent above by this point.
    if (therapistId) {
      const contactEmail = await lookupContactEmail(therapistId);
      if (contactEmail) {
        try {
          await ses.send(
            new SendEmailCommand({
              Source: FROM,
              Destination: { ToAddresses: [contactEmail] },
              Message: {
                Subject: { Data: `New booking: ${day} at ${slot}` },
                Body: {
                  Html: {
                    Data: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:0">
  <div style="max-width:520px;margin:40px auto;background:#1a1f2e;border:1px solid #2d3748;border-radius:16px;overflow:hidden">
    <div style="background:#7c6af7;padding:28px 32px">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">New Session Booked</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">A client has booked a session with you via Meo</p>
    </div>
    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;width:40%">Date</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${day}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Time</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${slot}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Duration</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${sessionLength} minutes</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Client contact</td><td style="padding:8px 0;font-weight:600;color:#e2e8f0">${userEmail}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`,
                  },
                  Text: {
                    Data: `New Session Booked\n\nDate: ${day}\nTime: ${slot}\nDuration: ${sessionLength} min\nClient contact: ${userEmail}`,
                  },
                },
              },
            }),
          );
        } catch (err) {
          console.error('SES error (practitioner notification):', err);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('SES error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
