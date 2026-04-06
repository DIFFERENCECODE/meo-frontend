'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getGoogleLoginUrl } from '@/app/lib/auth';

interface LandingPageProps {
  onSignIn: () => void;
  isExchanging?: boolean;
}

export default function LandingPage({ onSignIn, isExchanging = false }: LandingPageProps) {
  const { colors } = useTheme();

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleLoginUrl();
  };

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
          onClick={handleGoogleSignIn}
          disabled={isExchanging}
          className="w-full rounded-lg py-3 px-6 text-base font-semibold disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 mb-3"
          style={{
            background: '#ffffff',
            color: '#1f1f1f',
            border: '1px solid #dadce0',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {isExchanging ? 'Signing you in...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: colors.cardBorder }} />
          <span className="text-xs" style={{ color: colors.muted }}>or</span>
          <div className="flex-1 h-px" style={{ background: colors.cardBorder }} />
        </div>

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
          Sign in with Email
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
