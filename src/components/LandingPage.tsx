'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

interface LandingPageProps {
  onSignIn: () => void;
  isExchanging?: boolean;
}

export default function LandingPage({ onSignIn, isExchanging = false }: LandingPageProps) {
  const { colors } = useTheme();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 transition-colors"
      style={{ background: colors.background }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-10 shadow-xl text-center border transition-colors"
        style={{
          background: colors.card,
          borderColor: colors.cardBorder,
        }}
      >
        {/* Logo: circle with M in primary green */}
        <div
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: colors.primary,
            color: colors.primaryForeground,
          }}
        >
          <span className="text-2xl font-bold">M</span>
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: colors.foreground }}
        >
          Welcome to MeO
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: colors.muted }}
        >
          Your personal metabolic health AI assistant. Sign in to continue.
        </p>

        <button
          onClick={onSignIn}
          disabled={isExchanging}
          className="w-full rounded-lg py-3 px-6 text-base font-semibold disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          style={{
            background: colors.primary,
            color: colors.primaryForeground,
          }}
          onMouseOver={(e) => {
            if (!isExchanging) {
              e.currentTarget.style.background = colors.primaryHover;
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = colors.primary;
          }}
        >
          {isExchanging ? 'Signing you in...' : 'Sign in with MeO Account'}
        </button>

        <p
          className="mt-8 text-xs"
          style={{ color: colors.muted }}
        >
          MeO uses secure AWS Cognito authentication to protect your data.
        </p>
      </div>
    </div>
  );
}
