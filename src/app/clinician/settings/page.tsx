'use client';

/**
 * Practitioner settings. Only what is real is editable here; what is planned
 * is listed as planned, so nobody looks for a control that does nothing.
 */

import React from 'react';
import { LogOut } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { clearIdToken, getLogoutUrl } from '@/app/lib/auth';
import { PERSONAS } from '../persona';
import { Btn, Card, Label, PageHeader, Pill, Screen, T, useAuthed, usePersona } from '../ui';

interface Profile { name?: string; email?: string; role?: string }

function Row({ title, children, aside }: { title: string; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: `1px solid ${T.rowBorder}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        {children && <div style={{ fontSize: 13, marginTop: 2 }}>{children}</div>}
      </div>
      {aside}
    </div>
  );
}

export default function SettingsPage() {
  const profile = useAuthed<Profile>('/api/profile');
  const [persona, setPersona] = usePersona();
  const { colorMode, setColorMode } = useTheme();

  return (
    <Screen header={<PageHeader title="Settings" sub="Your account and how the portal works for you" />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
        <Card>
          <Label style={{ marginBottom: 4 }}>Profile</Label>
          <Row title="Name">{profile.data?.name || '…'}</Row>
          <Row title="Email">{profile.data?.email || '…'}</Row>
          <Row title="Role">{profile.data?.role === 'admin' ? 'Admin' : 'Practitioner'}</Row>
        </Card>

        <Card>
          <Label style={{ marginBottom: 4 }}>Your view</Label>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Sets what leads on every screen. It never changes a value or a flag.</div>
          <div role="radiogroup" aria-label="Your view" style={{ display: 'flex', flexDirection: 'column' }}>
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={p.id === persona}
                onClick={() => setPersona(p.id)}
                className="mc-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', textAlign: 'left',
                  background: 'transparent', border: 0, borderTop: `1px solid ${T.rowBorder}`, cursor: 'pointer',
                  fontFamily: 'inherit', color: T.text,
                }}
              >
                <span aria-hidden style={{
                  width: 18, height: 18, flex: 'none', borderRadius: '50%',
                  border: `2px solid ${p.id === persona ? T.lime : 'rgba(var(--mc-fg-rgb),0.4)'}`,
                  background: p.id === persona ? `radial-gradient(circle, ${T.lime} 45%, transparent 50%)` : 'transparent',
                }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{p.label}</span>
                  <span style={{ display: 'block', fontSize: 13 }}>{p.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <Label style={{ marginBottom: 4 }}>What MeO flags on</Label>
          <Row title="A plan line well short over 14 days">Moves the patient up your panel.</Row>
          <Row title="No contact for 14 days">Moves the patient up your panel.</Row>
          <Row title="Biomarkers outside optimal ranges">Shown on Needs review.</Row>
          <Row title="A safety concern in conversation">Emailed to you at once.</Row>
          <Row title="Your own optimal ranges" aside={<Pill size={11}>Coming</Pill>}>Set the thresholds your flags use, per biomarker.</Row>
        </Card>

        <Card>
          <Label style={{ marginBottom: 4 }}>Appearance</Label>
          {(['dark', 'light'] as const).map((m) => (
            <button key={m} role="radio" aria-checked={colorMode === m} onClick={() => setColorMode(m)} className="mc-press"
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 0', textAlign: 'left', background: 'transparent', border: 0, borderTop: `1px solid ${T.rowBorder}`, cursor: 'pointer', fontFamily: 'inherit', color: T.text }}>
              <span aria-hidden style={{ width: 18, height: 18, flex: 'none', borderRadius: '50%', border: `2px solid ${colorMode === m ? T.lime : 'rgba(var(--mc-fg-rgb),0.4)'}`, background: colorMode === m ? `radial-gradient(circle, ${T.lime} 45%, transparent 50%)` : 'transparent' }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{m === 'dark' ? 'Dark' : 'Light'}</span>
                <span style={{ display: 'block', fontSize: 13 }}>{m === 'dark' ? 'Deep green' : 'White with green'}</span>
              </span>
            </button>
          ))}
        </Card>

        <div>
          <Btn onClick={() => { clearIdToken(); window.location.href = getLogoutUrl(); }}>
            <LogOut size={16} /> Log out
          </Btn>
        </div>
      </div>
    </Screen>
  );
}
