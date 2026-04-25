'use client';

import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { getGoogleLoginUrl, getAppleLoginUrl } from '@/app/lib/auth';

interface LandingPageProps {
  onSignIn: () => void;
  isExchanging?: boolean;
}

export default function LandingPage({ onSignIn, isExchanging = false }: LandingPageProps) {
  const { colors } = useTheme();

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleLoginUrl();
  };

  const handleAppleSignIn = () => {
    window.location.href = getAppleLoginUrl();
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

        {/* Apple sign-in routes through Cognito's Hosted UI just like
            Google — IdP wiring lives in the User Pool console. */}
        <button
          onClick={handleAppleSignIn}
          disabled={isExchanging}
          className="w-full rounded-lg py-3 px-6 text-base font-semibold disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 mb-3"
          style={{
            background: '#000000',
            color: '#ffffff',
            border: '1px solid #000000',
          }}
        >
          {/* Apple's logo guidelines require the glyph to be on a solid
              background; the plain SVG below is the standard simplified
              Apple mark used by Sign in with Apple buttons. */}
          <svg width="16" height="18" viewBox="0 0 16 18" fill="#ffffff">
            <path d="M13.527 13.847c-.245.572-.535 1.099-.871 1.583-.458.66-.832 1.117-1.121 1.371-.448.413-.928.625-1.442.638-.369 0-.814-.105-1.331-.318-.519-.213-.996-.318-1.432-.318-.456 0-.946.105-1.471.318-.526.213-.95.324-1.275.336-.493.022-.985-.196-1.475-.656-.314-.276-.704-.748-1.171-1.418-.5-.713-.911-1.539-1.234-2.481C.41 11.917.247 10.985.247 10.084c0-1.032.223-1.922.671-2.667.351-.6.819-1.073 1.405-1.42.585-.347 1.218-.524 1.9-.535.391 0 .904.121 1.541.359.635.239 1.043.36 1.222.36.135 0 .587-.142 1.354-.425.726-.262 1.339-.371 1.84-.328 1.358.11 2.379.645 3.057 1.611-1.214.736-1.815 1.768-1.803 3.094.011 1.033.387 1.892 1.124 2.575.334.317.708.563 1.123.738-.09.262-.184.512-.284.752zM10.59.36c0 .77-.281 1.49-.84 2.155-.675.792-1.491 1.249-2.376 1.177-.011-.092-.018-.189-.018-.291 0-.74.323-1.532.895-2.179.286-.328.65-.6 1.092-.819.441-.214.858-.333 1.25-.353.011.103.017.207.017.31z"/>
          </svg>
          {isExchanging ? 'Signing you in...' : 'Continue with Apple'}
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
