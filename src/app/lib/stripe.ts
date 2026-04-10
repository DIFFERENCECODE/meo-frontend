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
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    features: [
      'Unlimited chat with MeO AI',
      'Full message history',
      'Analysis dashboard (Bio Age, Kraft curves)',
      'Personalized solution recommendations',
      'Priority support',
    ],
    messagesPerDay: -1, // unlimited
    price: 29,
  },
  clinic: {
    name: 'Clinic',
    priceId: process.env.STRIPE_CLINIC_PRICE_ID || '',
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
} as const;

export type PlanId = keyof typeof PLANS;
