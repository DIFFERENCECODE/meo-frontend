import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const BACKEND_BASE = process.env.MEO_API_URL || 'http://127.0.0.1:8080/api';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

async function setUserRole(cognitoSub: string, role: string) {
  if (!INTERNAL_SERVICE_KEY) {
    console.error('[Stripe webhook] INTERNAL_SERVICE_KEY not set — cannot update role');
    return;
  }
  try {
    const res = await fetch(`${BACKEND_BASE}/admin/internal/set-user-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': INTERNAL_SERVICE_KEY,
      },
      body: JSON.stringify({ sub: cognitoSub, role }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Stripe webhook] set-user-role failed: ${res.status} ${text}`);
    } else {
      console.log(`[Stripe webhook] set-user-role OK: sub=${cognitoSub} role=${role}`);
    }
  } catch (err: any) {
    console.error('[Stripe webhook] set-user-role error:', err.message);
  }
}

// The three consumer Meo Pro tiers — same entitlement as mobile's RevenueCat
// products, just sold through Stripe instead of StoreKit/Play Billing.
const PRO_PLAN_IDS = new Set(['pro_monthly', 'pro_annual', 'pro_lifetime']);

// Grants/revokes the shared is_paid flag in Postgres (keyed by cognito_sub)
// so a web Stripe purchase unlocks Pro on mobile too — mobile's
// subscriptionStore already reads this via GET /api/me (adminPaid), it just
// needed the backend to actually populate it. One-directional (web→mobile)
// by design: mobile purchases stay on RevenueCat and are not touched here.
async function setPaidStatus(cognitoSub: string, isPaid: boolean) {
  if (!INTERNAL_SERVICE_KEY) {
    console.error('[Stripe webhook] INTERNAL_SERVICE_KEY not set — cannot update entitlement');
    return;
  }
  try {
    const res = await fetch(`${BACKEND_BASE}/internal/set-paid-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': INTERNAL_SERVICE_KEY,
      },
      body: JSON.stringify({ cognito_sub: cognitoSub, is_paid: isPaid }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Stripe webhook] set-paid-status failed: ${res.status} ${text}`);
    } else {
      console.log(`[Stripe webhook] set-paid-status OK: sub=${cognitoSub} is_paid=${isPaid}`);
    }
  } catch (err: any) {
    console.error('[Stripe webhook] set-paid-status error:', err.message);
  }
}

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
      const planId = session.metadata?.plan_id;
      const cognitoSub = session.metadata?.cognito_sub;
      const utm = {
        source:   session.metadata?.utm_source   ?? '(direct)',
        medium:   session.metadata?.utm_medium   ?? '(none)',
        campaign: session.metadata?.utm_campaign ?? '(none)',
        content:  session.metadata?.utm_content  ?? '(none)',
        term:     session.metadata?.utm_term     ?? '(none)',
      };
      console.log(
        `[Stripe] Checkout completed: customer=${session.customer} plan=${planId} sub=${cognitoSub} ` +
        `source=${utm.source} medium=${utm.medium} campaign=${utm.campaign} content=${utm.content} term=${utm.term} ` +
        `amount=${session.amount_total} currency=${session.currency}`,
      );
      if (planId === 'clinician' && cognitoSub) {
        await setUserRole(cognitoSub, 'clinician');
      }
      if (planId && PRO_PLAN_IDS.has(planId) && cognitoSub) {
        await setPaidStatus(cognitoSub, true);
      }
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
      const planId = sub.metadata?.plan_id;
      const cognitoSub = sub.metadata?.cognito_sub;
      console.log(`[Stripe] Subscription cancelled: ${sub.id} plan=${planId} sub=${cognitoSub}`);
      if (planId === 'clinician' && cognitoSub) {
        await setUserRole(cognitoSub, 'clinician_pending');
      }
      // Lifetime never reaches here — mode:'payment' has no Subscription
      // object, so there's nothing to revoke when the recurring plans end.
      if (planId && PRO_PLAN_IDS.has(planId) && cognitoSub) {
        await setPaidStatus(cognitoSub, false);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[Stripe] Payment failed: customer=${invoice.customer}`);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
