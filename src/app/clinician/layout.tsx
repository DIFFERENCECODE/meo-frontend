'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { PortalStyles, T as K, usePersona } from './ui';
import { PERSONAS } from './persona';
import { PanelProvider, usePanel } from './panel-context';
import {
  clearIdToken, getLogoutUrl, getLoginUrl, getValidIdToken,
} from '@/app/lib/auth';

// ─── Design tokens (exact from design handoff) ────────────────────────────────
const T = {
  bg:      'var(--mc-ground-solid)',
  sidebar: '#163333',
  card:    'var(--mc-card)',
  border:  'rgba(var(--mc-fg-rgb),0.12)',
  accent:  'var(--mc-accent)',
  accentInk: '#123030',
  text:    'var(--mc-text)',
  muted:   'rgba(var(--mc-fg-rgb),0.6)',
};

interface Profile { name?: string; email?: string; role?: string }

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
    (async () => {
      // The clinician portal is served on its own origin (clinician.<env>.
      // meterbolic.com), so it must handle the Cognito redirect itself — the
      // patient app's exchange in MeOApp never runs here. Without this, a fresh
      // login loops: Cognito redirects back with ?code=, we find no stored
      // token, and bounce straight back to the Hosted UI.
      // getValidIdToken() finishes a pending ?code= exchange first. This used
      // to exchange only when no token was stored, so a stale, expired token
      // from an earlier visit skipped the exchange, failed the profile check
      // and showed "access denied" to a real clinician.
      const token = await getValidIdToken();
      if (!token) { window.location.assign(getLoginUrl()); return; }
      try {
        const r = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        const data = r.ok ? await r.json() : null;
        if (!data || (data.role !== 'clinician' && data.role !== 'admin')) { setDenied(true); return; }
        setProfile(data);
        setAuthorized(true);
      } catch {
        setDenied(true);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

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
    <PanelProvider>
      <Shell pathname={pathname} profile={profile}>{children}</Shell>
    </PanelProvider>
  );
}

// ─── Shell (storyboard p00: 248px translucent sidebar over the gradient) ──────

const NAV: { href: string; label: string; d: string; match: (p: string) => boolean; badge?: boolean }[] = [
  { href: '/clinician', label: 'Panel', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
    match: (p) => p === '/clinician' },
  { href: '/clinician/review', label: 'Needs review', d: 'M4 22V4M4 4h13l-2 4 2 4H4', badge: true,
    match: (p) => p === '/clinician/review' || /\/clinician\/patients\/[^/]+\/review$/.test(p) },
  { href: '/clinician/bookings', label: 'Bookings', d: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
    match: (p) => p.startsWith('/clinician/bookings') },
  { href: '/clinician/patients', label: 'Briefs', d: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5',
    match: (p) => p.startsWith('/clinician/patients') && !/\/review$/.test(p) },
  { href: '/clinician/listings', label: 'My listing', d: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
    match: (p) => p.startsWith('/clinician/listings') },
];

// What the panel actually flags on today, stated rather than implied. These
// are MeO's rules (app/db/db_utils.py, app/services/plan_progress.py), not yet
// per-practitioner settings, so there is no edit link until there is an editor.
const FLAG_RULES = ['Plan line well short · 14 days', 'No contact · 14 days', 'Biomarkers · optimal ranges', 'Safety · emailed at once'];

function Shell({ pathname, profile, children }: { pathname: string; profile: Profile; children: React.ReactNode }) {
  const [persona, setPersonaValue] = usePersona();
  const [lensOpen, setLensOpen] = useState(false);
  const { rows } = usePanel();
  const needReview = rows.filter((r) => r.urgency_level !== 'low').length;
  const name = profile.name || profile.email || 'Practitioner';
  const lens = PERSONAS.find((x) => x.id === persona) ?? PERSONAS[0];

  return (
    <div
      className="mc-portal"
      style={{
        position: 'relative', width: '100%', height: '100vh', minWidth: 1200, overflow: 'hidden',
        display: 'flex', color: K.text, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        background: 'var(--mc-ground)',
      }}
    >
      <PortalStyles />
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55, backgroundImage: 'linear-gradient(rgba(var(--mc-fg-rgb),0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--mc-fg-rgb),0.035) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      <div aria-hidden style={{ position: 'absolute', left: 340, top: -260, width: 1100, height: 1100, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(var(--mc-accent-rgb),0.15) 0%, rgba(var(--mc-accent-rgb),0.045) 35%, rgba(var(--mc-accent-rgb),0) 65%)' }} />

      <aside style={{ position: 'relative', width: 248, flex: 'none', boxSizing: 'border-box', background: 'var(--mc-sidebar)', borderRight: '1px solid rgba(var(--mc-fg-rgb),0.08)', display: 'flex', flexDirection: 'column', padding: '18px 12px 14px' }}>
        <Link href="/clinician" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 16px', textDecoration: 'none', color: K.text }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/droplet-logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>Clinician Portal</div>
            <div style={{ fontSize: 10.5, color: K.dim }}>Powered by MeO</div>
          </div>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link key={n.href} href={n.href} className="mc-press" aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
                  fontSize: 13.5, fontWeight: active ? 700 : 500, textDecoration: 'none',
                  color: active ? K.lime : K.muted, background: active ? 'rgba(var(--mc-accent-rgb),0.12)' : 'transparent',
                }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {n.d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={`M${seg}`} />)}
                </svg>
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge && needReview > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: K.ink, background: K.lime, borderRadius: 999, padding: '2px 8px' }}>{needReview}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ height: 1, background: 'rgba(var(--mc-fg-rgb),0.08)', margin: '14px 4px' }} />

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.dim, padding: '4px 12px 6px' }}>Your view</div>
        <div style={{ padding: '0 12px', position: 'relative' }}>
          <button className="mc-press" aria-haspopup="listbox" aria-expanded={lensOpen} onClick={() => setLensOpen((o) => !o)}
            style={{ fontSize: 11, fontWeight: 700, color: K.lime, background: 'rgba(var(--mc-accent-rgb),0.12)', border: '1px solid rgba(var(--mc-accent-rgb),0.3)', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {lens.label}
          </button>
          {lensOpen && (
            <div role="listbox" aria-label="Brief lens" className="mc-sheet"
              style={{ transformOrigin: 'top left', position: 'absolute', zIndex: 5, top: 'calc(100% + 6px)', left: 12, width: 210, background: 'var(--mc-sheet)', border: `1px solid ${K.chipBorder}`, borderRadius: 12, padding: 6, boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }}>
              {PERSONAS.map((p) => (
                <button key={p.id} role="option" aria-selected={p.id === persona} className="mc-press"
                  onClick={() => { setPersonaValue(p.id); setLensOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: p.id === persona ? 'rgba(var(--mc-accent-rgb),0.12)' : 'transparent', border: 0, borderRadius: 9, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: p.id === persona ? K.lime : K.text }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: K.dim, marginTop: 1 }}>{p.blurb}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.dim, padding: '14px 12px 6px' }}>MeO flags on</div>
        <div style={{ padding: '0 12px', fontSize: 12, color: K.muted, lineHeight: 1.6 }}>
          {FLAG_RULES.map((r) => <div key={r}>{r}</div>)}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid rgba(var(--mc-fg-rgb),0.08)', paddingTop: 10 }}>
          <Link href="/clinician/settings" className="mc-press" aria-current={pathname === '/clinician/settings' ? 'page' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, fontSize: 13.5, textDecoration: 'none',
              fontWeight: pathname === '/clinician/settings' ? 700 : 500,
              color: pathname === '/clinician/settings' ? K.lime : K.text,
              background: pathname === '/clinician/settings' ? 'rgba(var(--mc-accent-rgb),0.12)' : 'transparent' }}>
            <Settings size={17} aria-hidden /> Settings
          </Link>
          <button className="mc-press" onClick={() => { clearIdToken(); window.location.href = getLogoutUrl(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 500,
              color: K.text, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <LogOut size={17} aria-hidden /> Log out
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px 0' }}>
          <div style={{ width: 30, height: 30, flex: 'none', borderRadius: '50%', background: 'rgba(var(--mc-accent-rgb),0.2)', color: K.lime, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(name.replace(/^(dr|prof|mr|mrs|ms|mx)\.?\s+/i, '') || name).slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 10.5, color: K.text }}>{lens.label} · {rows.length} client{rows.length === 1 ? '' : 's'}</div>
          </div>
        </div>
      </aside>

      <main style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
