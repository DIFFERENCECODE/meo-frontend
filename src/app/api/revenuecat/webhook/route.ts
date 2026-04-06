import { NextRequest, NextResponse } from 'next/server';

const RC_WEBHOOK_AUTH_KEY = process.env.REVENUECAT_WEBHOOK_AUTH_KEY || '';

export async function POST(req: NextRequest) {
  // Verify webhook authenticity via Authorization header
  if (RC_WEBHOOK_AUTH_KEY) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${RC_WEBHOOK_AUTH_KEY}`) {
      console.error('[RevenueCat] Invalid webhook auth key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const event = await req.json();
    const eventType = event.event?.type;
    const appUserId = event.event?.app_user_id;
    const entitlements = event.event?.subscriber_attributes || {};
    const productId = event.event?.product_id;
    const periodType = event.event?.period_type;

    switch (eventType) {
      case 'INITIAL_PURCHASE':
        console.log(
          `[RevenueCat] New subscription: user=${appUserId}, product=${productId}`,
        );
        // User just subscribed — grant access in your backend if needed:
        // await grantAccess(appUserId, productId);
        break;

      case 'RENEWAL':
        console.log(
          `[RevenueCat] Renewal: user=${appUserId}, product=${productId}, period=${periodType}`,
        );
        break;

      case 'CANCELLATION':
        console.log(
          `[RevenueCat] Cancelled: user=${appUserId}, product=${productId}`,
        );
        // User cancelled — still has access until period end.
        // RevenueCat SDK handles entitlement checks automatically.
        break;

      case 'EXPIRATION':
        console.log(
          `[RevenueCat] Expired: user=${appUserId}, product=${productId}`,
        );
        // Subscription expired — revoke access if needed:
        // await revokeAccess(appUserId);
        break;

      case 'BILLING_ISSUE':
        console.log(
          `[RevenueCat] Billing issue: user=${appUserId}, product=${productId}`,
        );
        break;

      case 'PRODUCT_CHANGE':
        console.log(
          `[RevenueCat] Plan change: user=${appUserId}, new_product=${productId}`,
        );
        break;

      case 'SUBSCRIBER_ALIAS':
        console.log(
          `[RevenueCat] Alias: user=${appUserId}`,
        );
        break;

      case 'TRANSFER':
        console.log(
          `[RevenueCat] Transfer: user=${appUserId}`,
        );
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log(
          `[RevenueCat] Lifetime purchase: user=${appUserId}, product=${productId}`,
        );
        break;

      default:
        console.log(`[RevenueCat] Unhandled event: ${eventType}, user=${appUserId}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[RevenueCat] Webhook error:', err.message);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
