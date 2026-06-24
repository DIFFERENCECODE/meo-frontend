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

    // Extract UTM attribution params forwarded from the pricing page
    const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
    const utmMeta: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const val = body[key];
      if (typeof val === 'string' && val.trim()) {
        utmMeta[key] = val.trim().slice(0, 500);
      }
    }

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

    // Look up Stripe customer by cognito_sub metadata — avoids matching old customers
    // that may have subscriptions in a different currency (e.g. USD vs GBP).
    const origin = req.headers.get('origin') || 'https://app.meterbolic.com';

    const search = await stripe.customers.search({
      query: `metadata['cognito_sub']:'${cognitoSub}'`,
      limit: 1,
    });

    const customerId = search.data.length > 0
      ? search.data[0].id
      : (await stripe.customers.create({ email, metadata: { cognito_sub: cognitoSub } })).id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PLANS[planId].priceId!, quantity: 1 }],
      success_url: planId === 'clinician'
        ? `${origin}/clinician?subscription=success`
        : `${origin}/?subscription=success`,
      cancel_url: planId === 'clinician'
        ? `${origin}/register/clinician?subscription=cancelled`
        : `${origin}/?subscription=cancelled`,
      allow_promotion_codes: true,
      metadata: { cognito_sub: cognitoSub, plan_id: planId, ...utmMeta },
      subscription_data: { metadata: { cognito_sub: cognitoSub, plan_id: planId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
