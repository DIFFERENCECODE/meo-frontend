import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
