// Static reference data for the Underwriting / MeterTokens prototype (SCRUM-20).
// The scoring algorithm and the canonical reward catalogue live in the backend
// (chatbot-rag: app/api/underwriting.py). These types/labels mirror that
// contract so the page renders even before the backend responds.

export interface Reward {
  id: string;
  name: string;
  cost: number;
  category: 'Meterbolic' | 'Affiliate' | 'Insurance';
  description: string;
}

export interface ScoreResponse {
  performance_metric: number;
  metertokens: number;
  tier: string;
  breakdown: {
    engagement_component: number;
    health_component: number;
    engagement_score: number;
    health_score: number;
  };
}

export interface LedgerEntry {
  period: string;
  performance_metric: number;
  metertokens: number;
}

export interface BalanceResponse {
  balance: number;
  tier: string;
  next_tier: string | null;
  tokens_to_next_tier: number | null;
  lifetime_earned: number;
  ledger: LedgerEntry[];
}

// Fallback reward catalogue — kept in sync with REWARDS in the backend. Used
// only if the /rewards fetch fails, so the prototype never renders empty.
export const FALLBACK_REWARDS: Reward[] = [
  { id: 'recipe-pack', name: 'Premium recipe pack', cost: 500, category: 'Meterbolic', description: 'Curated low-insulin-load recipe collection.' },
  { id: 'affiliate-discount', name: 'Affiliate store 20% discount', cost: 800, category: 'Affiliate', description: '20% off at partner wellness brands.' },
  { id: 'meo-plus', name: '1 month Meo+ subscription', cost: 1500, category: 'Meterbolic', description: 'Premium AI coaching and unlimited insights.' },
  { id: 'priority-review', name: 'Priority clinician review', cost: 2500, category: 'Meterbolic', description: 'Fast-tracked review of your results by a clinician.' },
  { id: 'therapy-session', name: '1:1 nutritional therapy session', cost: 3000, category: 'Affiliate', description: 'A session with a BANT-registered therapist.' },
  { id: 'kraft-retest', name: 'KRAFT re-test voucher', cost: 4000, category: 'Meterbolic', description: 'A follow-up KRAFT insulin-resistance test.' },
  { id: 'premium-credit', name: 'Insurance premium credit (Plug-In preview)', cost: 10000, category: 'Insurance', description: 'Preview of the Plug-In: tokens pay down a real premium.' },
];

// Tier badge colours (cumulative-balance tiers mirror the backend TIERS).
export const TIER_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#e0b340',
  Platinum: '#7fd4e0',
};
