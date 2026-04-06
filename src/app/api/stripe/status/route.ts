import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';

function extractSubInfo(sub: any) {
  return {
    plan: sub.metadata?.plan_id || 'pro',
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = auth.slice(7);

  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString(),
    );
    const email = payload.email;

    if (!email) {
      return NextResponse.json({ plan: 'free', status: 'none' });
    }

    // Find Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length === 0) {
      return NextResponse.json({ plan: 'free', status: 'none' });
    }

    const customerId = existing.data[0].id;

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // Check for past_due or trialing
      const allSubs = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (allSubs.data.length > 0) {
        return NextResponse.json(extractSubInfo(allSubs.data[0]));
      }

      return NextResponse.json({ plan: 'free', status: 'none' });
    }

    return NextResponse.json(extractSubInfo(subscriptions.data[0]));
  } catch (err: any) {
    console.error('Stripe status error:', err);
    return NextResponse.json({ plan: 'free', status: 'error' });
  }
}
