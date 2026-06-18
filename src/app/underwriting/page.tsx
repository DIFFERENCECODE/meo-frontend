'use client';

// Underwriting prototype — MeterTokens (SCRUM-20).
//
// First version of the Underwriting prototype: a token economy that rewards
// health engagement. The backend (chatbot-rag) scores a blend of customer
// engagement and the customer's delta in health metrics (BAS etc.) into a
// "performance metric", redeemable as metertokens. Customers look these up
// like an airline customer looks up their airmiles, and exchange them for
// Meterbolic / affiliate rewards. Presented to insurers as a Plug-In preview
// where, in a real underwriting product, metertokens pay down premiums.

import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import {
  Coins, TrendingUp, Activity, Gift, Lock, CheckCircle2,
  Sparkles, Award, ShieldCheck, ArrowRight,
} from 'lucide-react';
import {
  FALLBACK_REWARDS, TIER_COLORS,
  type Reward, type ScoreResponse, type BalanceResponse,
} from './data';

// ─── Small helpers ──────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-GB');

function Slider({
  label, value, min, max, step, suffix, onChange, color,
}: {
  label: string; value: number; min: number; max: number; step: number;
  suffix: string; onChange: (v: number) => void; color: string;
}) {
  const { colors } = useTheme();
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: colors.foreground }}>{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UnderwritingPage() {
  const { colors } = useTheme();

  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [rewards, setRewards] = useState<Reward[]>(FALLBACK_REWARDS);

  // Scoring simulator inputs.
  const [engagement, setEngagement] = useState(78);
  const [healthDelta, setHealthDelta] = useState(6);
  const [score, setScore] = useState<ScoreResponse | null>(null);

  // Load the airmiles-style balance + reward catalogue from the backend.
  useEffect(() => {
    fetch('/api/underwriting/balance')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setBalance(d))
      .catch(() => {});
    fetch('/api/underwriting/rewards')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.rewards && setRewards(d.rewards))
      .catch(() => {});
  }, []);

  // Re-score whenever the simulator inputs change (debounced lightly).
  useEffect(() => {
    const id = setTimeout(() => {
      fetch('/api/underwriting/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagement, health_delta: healthDelta }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && !d.error && setScore(d))
        .catch(() => {});
    }, 150);
    return () => clearTimeout(id);
  }, [engagement, healthDelta]);

  const tierColor = balance ? (TIER_COLORS[balance.tier] ?? colors.primary) : colors.primary;
  const tierProgress = useMemo(() => {
    if (!balance || balance.tokens_to_next_tier == null) return 100;
    const earnedIntoTier = balance.tokens_to_next_tier;
    // Visual only: fraction toward the next tier.
    return Math.max(8, Math.min(100, 100 - (earnedIntoTier / (earnedIntoTier + balance.balance)) * 100));
  }, [balance]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-5 py-10 w-full">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: colors.primary }}>
            <ShieldCheck className="h-3.5 w-3.5" /> Underwriting Prototype
          </p>
          <h1 className="text-3xl font-bold mb-1" style={{ color: colors.foreground }}>
            MeterTokens
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: colors.muted }}>
            Earn <strong style={{ color: colors.foreground }}>metertokens</strong> for engaging with your
            health programme and improving your metrics — then look them up like airmiles and exchange
            them for Meterbolic products, affiliate perks, or (in the insurance Plug-In) premium credit.
          </p>
        </div>

        {/* Balance + tier — the airmiles-style lookup card */}
        <div
          className="rounded-3xl p-6 mb-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.accentHover} 100%)`,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                Your balance
              </p>
              <div className="flex items-center gap-2.5">
                <Coins className="h-9 w-9" style={{ color: colors.primary }} />
                <span className="text-5xl font-extrabold tracking-tight" style={{ color: colors.foreground }}>
                  {balance ? fmt(balance.balance) : '—'}
                </span>
                <span className="text-sm font-semibold mt-3" style={{ color: colors.muted }}>metertokens</span>
              </div>
              <p className="text-xs mt-2" style={{ color: colors.muted }}>
                Lifetime earned: <strong style={{ color: colors.foreground }}>{balance ? fmt(balance.lifetime_earned) : '—'}</strong>
              </p>
            </div>

            {/* Tier badge */}
            <div className="text-right">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm"
                style={{ backgroundColor: tierColor + '22', color: tierColor, border: `1px solid ${tierColor}55` }}
              >
                <Award className="h-4 w-4" />
                {balance ? balance.tier : '—'} tier
              </div>
              {balance?.next_tier && (
                <p className="text-xs mt-2" style={{ color: colors.muted }}>
                  <strong style={{ color: colors.foreground }}>{fmt(balance.tokens_to_next_tier ?? 0)}</strong> to {balance.next_tier}
                </p>
              )}
            </div>
          </div>

          {/* Tier progress bar */}
          {balance?.next_tier && (
            <div className="mt-5">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.background }}>
                <div className="h-full rounded-full" style={{ width: `${tierProgress}%`, backgroundColor: tierColor }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Scoring simulator */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <p className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: colors.foreground }}>
              <Sparkles className="h-4 w-4" style={{ color: colors.primary }} /> Performance metric simulator
            </p>
            <p className="text-xs mb-5" style={{ color: colors.muted }}>
              The backend scores a blend of your engagement and your health-metric improvement.
            </p>

            <div className="space-y-5">
              <Slider
                label="Engagement" value={engagement} min={0} max={100} step={1}
                suffix="%" onChange={setEngagement} color={colors.primary}
              />
              <Slider
                label="Health metric Δ (improvement)" value={healthDelta} min={-5} max={15} step={1}
                suffix=" pts" onChange={setHealthDelta} color={colors.warning}
              />
            </div>

            {/* Result */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: colors.background }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingUp className="h-4 w-4" style={{ color: colors.primary }} />
                  <span className="text-xs" style={{ color: colors.muted }}>Performance metric</span>
                </div>
                <p className="text-3xl font-extrabold" style={{ color: colors.foreground }}>
                  {score ? score.performance_metric : '—'}<span className="text-base" style={{ color: colors.muted }}>/100</span>
                </p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: colors.background }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Coins className="h-4 w-4" style={{ color: colors.primary }} />
                  <span className="text-xs" style={{ color: colors.muted }}>Tokens this period</span>
                </div>
                <p className="text-3xl font-extrabold" style={{ color: colors.primary }}>
                  +{score ? fmt(score.metertokens) : '—'}
                </p>
              </div>
            </div>
            {score && (
              <p className="text-xs mt-3 text-center" style={{ color: colors.muted }}>
                Engagement contributes <strong style={{ color: colors.foreground }}>{score.breakdown.engagement_component}</strong> ·
                Health Δ contributes <strong style={{ color: colors.foreground }}>{score.breakdown.health_component}</strong>
              </p>
            )}
          </div>

          {/* Earning ledger — airmiles lookup */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <p className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: colors.foreground }}>
              <Activity className="h-4 w-4" style={{ color: colors.primary }} /> Earning history
            </p>
            <p className="text-xs mb-4" style={{ color: colors.muted }}>
              Look up what you earned each period — like airmiles.
            </p>
            <div className="space-y-2">
              {(balance?.ledger ?? []).slice().reverse().map((e) => (
                <div
                  key={e.period}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: colors.background }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.foreground }}>{e.period}</p>
                    <p className="text-xs" style={{ color: colors.muted }}>Performance {e.performance_metric}/100</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: colors.primary }}>+{fmt(e.metertokens)}</span>
                </div>
              ))}
              {!balance && (
                <p className="text-xs py-6 text-center" style={{ color: colors.muted }}>Loading history…</p>
              )}
            </div>
          </div>
        </div>

        {/* Reward catalogue */}
        <div className="mb-2 flex items-center gap-2">
          <Gift className="h-5 w-5" style={{ color: colors.primary }} />
          <h2 className="text-xl font-bold" style={{ color: colors.foreground }}>Redeem your metertokens</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: colors.muted }}>
          Exchange tokens for Meterbolic products and services, affiliate perks, or insurance premium credit.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((r) => {
            const affordable = balance ? balance.balance >= r.cost : false;
            return (
              <div
                key={r.id}
                className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${affordable ? colors.primary + '55' : colors.cardBorder}`,
                  opacity: balance && !affordable ? 0.7 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: colors.accent, color: colors.muted, border: `1px solid ${colors.cardBorder}` }}
                  >
                    {r.category}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-bold" style={{ color: colors.primary }}>
                    <Coins className="h-3.5 w-3.5" /> {fmt(r.cost)}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: colors.foreground }}>{r.name}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: colors.muted }}>{r.description}</p>
                </div>
                <button
                  disabled={!affordable}
                  className="mt-auto w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: affordable ? colors.primary : colors.accent,
                    color: affordable ? colors.primaryForeground : colors.muted,
                  }}
                >
                  {affordable
                    ? (<><CheckCircle2 className="h-3.5 w-3.5" /> Redeem</>)
                    : (<><Lock className="h-3.5 w-3.5" /> {balance ? `${fmt(r.cost - balance.balance)} more` : 'Redeem'}</>)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Insurance Plug-In note */}
        <div
          className="mt-8 rounded-2xl p-5 flex items-start gap-3"
          style={{ backgroundColor: colors.accent, border: `1px solid ${colors.cardBorder}` }}
        >
          <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.primary }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Insurance Plug-In preview
            </p>
            <p className="text-xs mt-1 leading-relaxed flex items-center gap-1 flex-wrap" style={{ color: colors.muted }}>
              In a real underwriting product, metertokens pay down premiums and unlock promotions —
              demonstrating to insurers how incentivising engagement improves health outcomes.
              <ArrowRight className="h-3 w-3 inline" /> a business-development pathway to integration.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
