'use client';

import React, { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import {
  clearIdToken, getLogoutUrl, getLoginUrl, getValidIdToken,
  getEmailFromIdToken, getNameFromIdToken,
} from '@/app/lib/auth';

/**
 * The account row at the foot of the sidebar, as every storyboard frame has it.
 *
 * It replaces relying on the floating avatar in the top-right corner, which had
 * two problems: it renders `null` when the id token carries no email claim, so
 * signing out could become impossible rather than merely hidden; and it floats
 * over whatever the screen header puts in that corner.
 *
 * The frames put the user at the bottom of the sidebar — avatar, name, plan —
 * and that is also the one place guaranteed to be reachable now the footer is
 * pinned outside the scroll region.
 *
 * Deliberately degrades rather than disappears: with no name it shows the
 * email, with neither it still renders and still signs you out. An account
 * control that hides itself when it cannot identify you is the worst case,
 * because that is exactly when you want to get out.
 */
export function SidebarUser() {
  const { colors } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  // 'out' is a real state, not a fallback label. This row used to say
  // "Signed in" whenever it could not read a name, including when there was
  // no session at all: the app told people they were signed in while every
  // screen failed for lack of a token.
  const [session, setSession] = useState<'checking' | 'in' | 'out'>('checking');

  useEffect(() => {
    let cancelled = false;
    getValidIdToken().then((token) => {
      if (cancelled) return;
      if (!token) return setSession('out');
      setEmail(getEmailFromIdToken(token));
      setName(getNameFromIdToken(token));
      setSession('in');
      // Prefer the profile's name: the token's is often a login handle.
      fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled && d?.name && /\s/.test(String(d.name).trim())) setName(String(d.name).trim()); })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = () => {
    clearIdToken();
    try {
      window.location.assign(getLogoutUrl());
    } catch {
      // Cognito unreachable or misconfigured: the local token is already gone,
      // so land on the app root rather than leaving the person stuck.
      window.location.replace(window.location.origin);
    }
  };

  if (session === 'out') {
    return (
      <div className="flex items-center" style={{ gap: 10, padding: '10px 8px 2px' }}>
        <button
          onClick={() => window.location.assign(getLoginUrl())}
          className="flex flex-1 items-center justify-center transition-colors hover:bg-white/10"
          style={{
            gap: 8, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'rgba(164,214,94,0.16)', color: colors.primary,
            fontSize: 12.5, fontWeight: 600,
          }}
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </button>
      </div>
    );
  }

  const label = name || email || (session === 'checking' ? '…' : 'Your account');
  const initials = (name || email || '?')
    .replace(/@.*/, '')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="flex items-center" style={{ gap: 10, padding: '10px 8px 2px' }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 30, height: 30, flex: 'none', borderRadius: '50%',
          background: 'rgba(164,214,94,0.2)', color: colors.primary,
          fontWeight: 700, fontSize: 13,
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{ fontSize: 12.5, fontWeight: 600, color: colors.foreground }}
          title={email ?? undefined}
        >
          {label}
        </div>
        {/* The plan line the frames show under the name ("Starter · £149").
            The free tier links to upgrade; paid tiers are not read here yet. */}
        <a href="/pricing" className="no-underline" style={{ fontSize: 10.5, color: colors.mutedDim }}>
          Free plan · <span style={{ color: colors.primary }}>Upgrade</span>
        </a>
      </div>
      <button
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex items-center justify-center transition-colors hover:bg-white/10"
        style={{ width: 30, height: 30, flex: 'none', borderRadius: 9, background: 'rgba(255,255,255,0.06)', cursor: 'pointer', border: 'none' }}
      >
        <LogOut className="h-4 w-4" style={{ color: colors.mutedDim }} />
      </button>
    </div>
  );
}

export default SidebarUser;
