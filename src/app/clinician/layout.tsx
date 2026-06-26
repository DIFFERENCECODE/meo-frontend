'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken, clearIdToken, getLogoutUrl, getLoginUrl } from '@/app/lib/auth';
import {
  LayoutDashboard, Users, ListChecks, CalendarDays,
  ArrowLeft, Stethoscope, Menu, X, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/clinician',           label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { href: '/clinician/patients',  label: 'Patients',   icon: Users },
  { href: '/clinician/listings',  label: 'Listings',   icon: ListChecks },
  { href: '/clinician/bookings',  label: 'Bookings',   icon: CalendarDays },
];

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const token = getIdToken();
    // No token on this origin -> send to Cognito login (origin-aware redirect).
    if (!token) { window.location.assign(getLoginUrl()); return; }
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || (data.role !== 'clinician' && data.role !== 'admin')) {
          setDenied(true);            // signed in but not a clinician — show notice (don't loop)
          return;
        }
        setAuthorized(true);
      })
      .catch(() => setDenied(true))
      .finally(() => setChecking(false));
  }, []);

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `${colors.primary}20` }}>
            <Stethoscope className="h-6 w-6" style={{ color: colors.primary }} />
          </div>
          <p className="text-base font-semibold" style={{ color: colors.foreground }}>No clinician access</p>
          <p className="text-sm" style={{ color: colors.muted }}>This account isn’t registered as a clinician. Register below, or sign in with a clinician account.</p>
          <div className="flex gap-2 justify-center">
            <a href="/register" className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: colors.primary, color: colors.primaryForeground }}>Register</a>
            <button onClick={() => { clearIdToken(); window.location.assign(getLogoutUrl()); }} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: colors.cardBorder, color: colors.foreground }}>Switch account</button>
          </div>
        </div>
      </div>
    );
  }

  if (checking || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full animate-spin" style={{ background: colors.primary }}>
            <span className="text-2xl font-bold" style={{ color: colors.primaryForeground }}>M</span>
          </div>
          <p className="text-sm animate-pulse" style={{ color: colors.muted }}>Verifying clinician access…</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b flex items-center gap-2.5" style={{ borderColor: colors.cardBorder }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${colors.primary}20` }}>
          <Stethoscope className="h-4 w-4" style={{ color: colors.primary }} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight" style={{ color: colors.foreground }}>Clinician Portal</p>
          <p className="text-xs" style={{ color: colors.muted }}>Powered by MeO</p>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? `${colors.primary}18` : 'transparent',
                color: isActive ? colors.primary : colors.muted,
                borderLeft: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
              }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-1" style={{ borderColor: colors.cardBorder }}>
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
          style={{ color: colors.muted }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to MeO
        </Link>
        <button
          onClick={() => { clearIdToken(); window.location.href = getLogoutUrl(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
          style={{ color: colors.muted }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: colors.background }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-56 flex-col border-r flex-shrink-0"
        style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" style={{ color: colors.primary }} />
          <span className="text-sm font-bold" style={{ color: colors.foreground }}>Clinician Portal</span>
        </div>
        <button onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ color: colors.muted }}>
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile slide-down nav */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed top-14 inset-x-0 z-30 border-b shadow-lg"
          style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
        >
          <nav className="p-2 space-y-0.5">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium"
                  style={{
                    background: isActive ? `${colors.primary}18` : 'transparent',
                    color: isActive ? colors.primary : colors.muted,
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm"
              style={{ color: colors.muted }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to MeO
            </Link>
            <button
              onClick={() => { clearIdToken(); window.location.href = getLogoutUrl(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm"
              style={{ color: colors.muted }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14 h-full">
        {children}
      </main>
    </div>
  );
}
