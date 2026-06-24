'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { User, CreditCard, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken, getEmailFromIdToken, clearIdToken, getLogoutUrl } from '@/app/lib/auth';

function initials(email: string): string {
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function ProfileMenu() {
  const { colors, colorMode, toggleColorMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getIdToken();
    if (token) setEmail(getEmailFromIdToken(token));
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!email) return null;

  const label = initials(email);

  const handleSignOut = () => {
    clearIdToken();
    window.location.replace(window.location.origin);
  };

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2"
        style={{
          background: colors.primary,
          color: colors.primaryForeground,
        }}
      >
        {label}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border py-1.5 z-[200]"
          style={{
            background: colors.card,
            borderColor: colors.cardBorder,
          }}
        >
          {/* Email header */}
          <div
            className="px-4 py-2.5 text-xs truncate border-b mb-1"
            style={{ color: colors.muted, borderColor: colors.cardBorder }}
          >
            {email}
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.foreground }}
          >
            <User className="h-4 w-4 shrink-0" style={{ color: colors.primary }} />
            Profile
          </Link>

          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.foreground }}
          >
            <CreditCard className="h-4 w-4 shrink-0" style={{ color: colors.primary }} />
            Subscription
          </Link>

          <button
            onClick={() => { toggleColorMode(); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.foreground }}
          >
            <span className="flex items-center gap-3">
              {colorMode === 'dark'
                ? <Moon className="h-4 w-4 shrink-0" style={{ color: colors.primary }} />
                : <Sun className="h-4 w-4 shrink-0" style={{ color: colors.primary }} />}
              {colorMode === 'dark' ? 'Dark mode' : 'Light mode'}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: colors.primary + '25', color: colors.primary }}
            >
              {colorMode === 'dark' ? 'ON' : 'OFF'}
            </span>
          </button>

          <div className="my-1 border-t" style={{ borderColor: colors.cardBorder }} />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10"
            style={{ color: '#ef4444' }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
