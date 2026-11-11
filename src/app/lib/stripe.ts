import Stripe from 'stripe';

// Lazy proxy: only instantiate (and only require STRIPE_SECRET_KEY) when a
// Stripe method is actually invoked, not at module load. Next 16 evaluates
// every route module during `next build` to collect page data, so a
// top-level throw broke the production build on any host that hadn't yet
// added the Stripe secret to .env.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _stripe = new Stripe(key);
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    const client = getStripe() as unknown as Record<string | symbol, unknown>;
    const value = client[prop as string];
    return typeof value === 'function' ? (value as Function).bind(client) : value;
  },
}) as Stripe;

// Product/Price IDs — set these in .env after creating them in Stripe Dashboard
export const PLANS = {
  free: {
    name: 'Free',
    priceId: null,
    features: [
      'Basic chat with MeO AI',
      'Limited message history',
      'View public health resources',
    ],
    messagesPerDay: 10,
    price: 0,
  },
  // Meo Pro — three billing options, kept in sync with mobile's real
  // RevenueCat/App Store/Play prices (Meo Pro Monthly $14.99, Annual $99.99,
  // Lifetime $149.99 — verified against App Store Connect's live price
  // points, not the old $29/mo web-only figure this used to charge). Web and
  // mobile sell the same entitlement through different billing systems
  // (Stripe here, StoreKit/Play Billing there), so the price must match or
  // a user who checks the other platform sees a different number for the
  // same thing.
  pro_monthly: {
    name: 'Meo Pro Monthly',
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    mode: 'subscription',
    period: 'month',
    features: [
      'Unlimited chat with MeO AI',
      'Full message history',
      'Analysis dashboard (Bio Age, Kraft curves)',
      'Personalized solution recommendations',
      'Priority support',
    ],
    messagesPerDay: -1, // unlimited
    price: 14.99,
  },
  pro_annual: {
    name: 'Meo Pro Annual',
    priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
    mode: 'subscription',
    period: 'year',
    features: [
      'Unlimited chat with MeO AI',
      'Full message history',
      'Analysis dashboard (Bio Age, Kraft curves)',
      'Personalized solution recommendations',
      'Priority support',
    ],
    messagesPerDay: -1,
    price: 99.99,
  },
  pro_lifetime: {
    name: 'Meo Pro Lifetime',
    priceId: process.env.STRIPE_PRO_LIFETIME_PRICE_ID || '',
    mode: 'payment', // one-time, non-recurring — matches the App Store's NON_CONSUMABLE product
    period: 'lifetime',
    features: [
      'Unlimited chat with MeO AI',
      'Full message history',
      'Analysis dashboard (Bio Age, Kraft curves)',
      'Personalized solution recommendations',
      'Priority support',
    ],
    messagesPerDay: -1,
    price: 149.99,
  },
  clinic: {
    name: 'Clinic',
    priceId: process.env.STRIPE_CLINIC_PRICE_ID || '',
    mode: 'subscription',
    period: 'month',
    features: [
      'Everything in Pro',
      'Practitioner mode',
      'Patient management dashboard',
      'Clinical reports & insights',
      'Multi-provider support',
      'Dedicated account manager',
    ],
    messagesPerDay: -1,
    price: 99,
  },
  clinician: {
    name: 'Clinician',
    priceId: process.env.STRIPE_CLINICIAN_PRICE_ID || '',
    mode: 'subscription',
    period: 'month',
    features: [
      'Full Clinician Portal access',
      'Patient metabolic data & chat history',
      'Listings, bookings & session management',
      'Clinical summaries & AI insights',
      'Custom branding & white-label (coming soon)',
    ],
    messagesPerDay: -1,
    price: 99,
  },
} as const;

export type PlanId = keyof typeof PLANS;
