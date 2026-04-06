'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getIdToken } from '@/app/lib/auth';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  cta: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Basic chat with MeO AI',
      'Limited message history',
      'View public health resources',
    ],
    cta: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    features: [
      'Unlimited chat with MeO AI',
      'Full message history',
      'Analysis dashboard (Bio Age, Kraft)',
      'Personalized recommendations',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    id: 'clinic',
    name: 'Clinic',
    price: 99,
    features: [
      'Everything in Pro',
      'Practitioner mode',
      'Patient management',
      'Clinical reports & insights',
      'Multi-provider support',
      'Dedicated account manager',
    ],
    cta: 'Upgrade to Clinic',
  },
];

export default function PricingPage() {
  const { colors } = useTheme();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;

    fetch('/api/stripe/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.plan && data.status === 'active') {
          setCurrentPlan(data.plan);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = async (planId: string) => {
    const token = getIdToken();
    if (!token) {
      window.location.href = '/';
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch {
      alert('Failed to connect to payment service');
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    const token = getIdToken();
    if (!token) return;

    setLoading('manage');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert('Failed to open billing portal');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 p-6 overflow-auto" style={{ background: colors.background }}>
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="inline-block mb-6 text-sm underline" style={{ color: colors.primary }}>
            &larr; Back to MeO
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-3" style={{ color: colors.foreground }}>
              Choose Your Plan
            </h1>
            <p className="text-base" style={{ color: colors.muted }}>
              Unlock the full power of MeO for your metabolic health journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const isUpgrade = !isCurrent && plan.id !== 'free';

              return (
                <div
                  key={plan.id}
                  className="relative rounded-2xl p-8 border flex flex-col"
                  style={{
                    background: colors.card,
                    borderColor: plan.popular ? colors.primary : colors.cardBorder,
                    borderWidth: plan.popular ? 2 : 1,
                  }}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                      style={{ background: colors.primary, color: colors.primaryForeground }}
                    >
                      Most Popular
                    </div>
                  )}

                  <h2 className="text-xl font-bold mb-2" style={{ color: colors.foreground }}>
                    {plan.name}
                  </h2>

                  <div className="mb-6">
                    <span className="text-4xl font-bold" style={{ color: colors.foreground }}>
                      ${plan.price}
                    </span>
                    <span className="text-sm" style={{ color: colors.muted }}>
                      /month
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check
                          className="h-4 w-4 mt-0.5 shrink-0"
                          style={{ color: colors.primary }}
                        />
                        <span className="text-sm" style={{ color: colors.foreground }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button
                      onClick={plan.id !== 'free' ? handleManage : undefined}
                      disabled={loading === 'manage'}
                      className="w-full rounded-lg py-3 text-sm font-semibold border transition-colors"
                      style={{
                        borderColor: colors.primary,
                        color: colors.primary,
                        opacity: loading === 'manage' ? 0.7 : 1,
                      }}
                    >
                      {plan.id === 'free' ? 'Current Plan' : loading === 'manage' ? 'Loading...' : 'Manage Subscription'}
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading === plan.id}
                      className="w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:opacity-70"
                      style={{
                        background: plan.popular ? colors.primary : 'transparent',
                        color: plan.popular ? colors.primaryForeground : colors.primary,
                        border: plan.popular ? 'none' : `1px solid ${colors.primary}`,
                      }}
                    >
                      {loading === plan.id ? 'Redirecting...' : plan.cta}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full rounded-lg py-3 text-sm font-semibold opacity-50"
                      style={{ color: colors.muted, border: `1px solid ${colors.cardBorder}` }}
                    >
                      Free Tier
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs mt-8" style={{ color: colors.muted }}>
            All plans include a 14-day free trial. Cancel anytime. Prices in USD.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
