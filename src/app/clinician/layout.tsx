'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getIdToken, clearIdToken, getLogoutUrl, getLoginUrl } from '@/app/lib/auth';

// ─── Design tokens (exact from design handoff) ────────────────────────────────
const T = {
  bg:      '#1a3a3a',
  sidebar: '#163333',
  card:    'rgba(40,70,70,0.8)',
  border:  'rgba(255,255,255,0.1)',
  accent:  '#a4d65e',
  accentInk: '#123030',
  text:    '#ffffff',
  muted:   'rgba(255,255,255,0.6)',
};

const NAV = [
  {
    href: '/clinician', label: 'Dashboard', exact: true,
    d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  },
  {
    href: '/clinician/patients', label: 'Patients',
    d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M22 21v-2a4 4 0 0 0-3-3.87',
  },
  {
    href: '/clinician/listings', label: 'Listings',
    d: 'M9 6h12M9 12h12M9 18h12M3 6l1.4 1.4L7 5M3 12l1.4 1.4L7 11M3 18l1.4 1.4L7 17',
  },
  {
    href: '/clinician/bookings', label: 'Bookings',
    d: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
  },
];

interface Profile { name?: string; email?: string; role?: string }

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
    const token = getIdToken();
    if (!token) { window.location.assign(getLoginUrl()); return; }
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || (data.role !== 'clinician' && data.role !== 'admin')) { setDenied(true); return; }
        setProfile(data);
        setAuthorized(true);
      })
      .catch(() => setDenied(true))
      .finally(() => setChecking(false));
  }, []);

  const initials = (profile.name || profile.email || 'DR')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const firstName = profile.name?.split(' ')[0] || 'Doctor';

  if (checking || (!authorized && !denied)) {
    return (
      <div style={{ width: '100%', height: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: T.accent, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: T.accentInk }}>M</div>
          <p style={{ color: T.muted, fontSize: 13 }}>Verifying clinician access…</p>
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div style={{ width: '100%', height: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 340, padding: '0 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${T.accent}20`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v6a4 4 0 0 0 8 0V3"/><path d="M8 13v3a5 5 0 0 0 10 0v-2"/><circle cx="18" cy="11" r="2"/></svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>No clinician access</p>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 1.5 }}>This account isn&apos;t registered as a clinician.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <a href="/register" style={{ padding: '9px 18px', borderRadius: 999, background: T.accent, color: T.accentInk, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Register</a>
            <button onClick={() => { clearIdToken(); window.location.assign(getLogoutUrl()); }} style={{ padding: '9px 18px', borderRadius: 999, background: 'none', border: `1px solid ${T.border}`, color: T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Switch account</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Root: full viewport, no overflow — scroll lives on inner panes only
    <div
      style={{
        width: '100%', height: '100vh', minWidth: 1200,
        display: 'flex', background: T.bg, color: T.text,
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* ── Sidebar ── */}
      <aside style={{ width: 224, flex: '0 0 224px', display: 'flex', flexDirection: 'column', background: T.sidebar, borderRight: `1px solid ${T.border}` }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 18px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(164,214,94,.15)', border: '1px solid rgba(164,214,94,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v6a4 4 0 0 0 8 0V3"/><path d="M8 13v3a5 5 0 0 0 10 0v-2"/><circle cx="18" cy="11" r="2"/></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>Clinician Portal</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>Powered by MeO</div>
          </div>
        </div>

        {/* Practitioner card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '14px 12px 6px', padding: '11px 12px', borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
          <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 999, background: T.accent, color: T.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, letterSpacing: '.02em' }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName} {profile.name?.split(' ').slice(1).join(' ')}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>Metabolic clinician</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px' }}>
          {NAV.map(({ href, label, d, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '11px 12px', borderRadius: 12, textDecoration: 'none',
                fontSize: 14, fontWeight: 600,
                background: isActive ? 'rgba(164,214,94,.12)' : 'transparent',
                color: isActive ? T.accent : 'rgba(255,255,255,.65)',
                boxShadow: isActive ? 'inset 3px 0 0 0 #a4d65e' : 'none',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {d.split('M').filter(Boolean).map((seg, i) => (
                    <path key={i} d={`M${seg}`} />
                  ))}
                </svg>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '14px 12px 18px', display: 'flex', flexDirection: 'column', gap: 2, borderTop: `1px solid ${T.border}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, color: 'rgba(255,255,255,.6)', textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
            Back to MeO
          </Link>
          <button onClick={() => { clearIdToken(); window.location.href = getLogoutUrl(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, color: 'rgba(255,255,255,.6)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Page content — each child is responsible for its own scroll ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
