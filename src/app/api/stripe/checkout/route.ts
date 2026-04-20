import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS, PlanId } from '@/app/lib/stripe';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = auth.slice(7);

  try {
    const body = await req.json();
    const planId = body.planId as PlanId;

    if (!planId || !PLANS[planId] || !PLANS[planId].priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Decode email from JWT for Stripe customer lookup
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString(),
    );
    const email = payload.email;
    const cognitoSub = payload.sub;

    if (!email) {
      return NextResponse.json({ error: 'No email in token' }, { status: 400 });
    }

    // Find or create Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { cognito_sub: cognitoSub },
      });
      customerId = customer.id;
    }

    // Stripe Checkout success/cancel URLs must match a real origin.
    // The header is normally set by the browser, but server-side or
    // mobile callers may omit it — fall back to the live web app
    // instead of localhost so test-mode purchases don't dead-end on a
    // dev machine that isn't running.
    const origin = req.headers.get('origin') || 'https://app.meterbolic.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: PLANS[planId].priceId!,
          quantity: 1,
        },
      ],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=cancelled`,
      metadata: {
        cognito_sub: cognitoSub,
        plan_id: planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
