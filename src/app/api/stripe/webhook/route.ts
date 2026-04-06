import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `[Stripe] Checkout completed: customer=${session.customer}, plan=${session.metadata?.plan_id}`,
      );
      // Subscription is now active — the status endpoint will reflect this.
      // If you need to update your backend DB, do it here:
      // await updateUserSubscription(session.metadata?.cognito_sub, session.metadata?.plan_id);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      console.log(
        `[Stripe] Subscription updated: ${sub.id}, status=${sub.status}, plan=${sub.metadata?.plan_id}`,
      );
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
      // User reverts to free plan
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[Stripe] Payment failed: customer=${invoice.customer}`);
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
