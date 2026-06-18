'use client';

// SCRUM-21 — Universal Ontology.
// Public reference page that visualises MeO's measurement ontology: how each
// MeO measurement entity is bound to the established global standards so MeO can
// normalise and standardise measurements across sources.
//   * LOINC      — identifies the test/measurement ("the question")
//   * UCUM       — unambiguous, machine-readable units
//   * SNOMED CT  — qualitative result coding ("the answer")
//
// The page is intentionally standalone (no auth) — it serves non-PII reference
// data only — and is driven by GET /api/reference/ontology.

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Database, Ruler, Stethoscope, BookMarked } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n/LanguageContext';

interface Coded {
  code: string;
  long_name?: string;
  display?: string;
  term?: string;
}
interface Entity {
  canonical_name: string;
  domain: string;
  display_name: string;
  meo_names: string[];
  meo_subject_state?: string;
  loinc: Coded;
  meo_unit: string;
  ucum: Coded;
}
interface Qualitative {
  key: string;
  display_name: string;
  applies_to: string[];
  snomed: Coded;
}
interface Ontology {
  version: string;
  name: string;
  description: string;
  standards: Record<string, { label: string; long_name: string; purpose: string; steward: string; url: string }>;
  naming_convention: { pattern: string; rules: string[] };
  entities: Entity[];
  qualitative_results: Qualitative[];
}

const DOMAIN_LABELS: Record<string, string> = {
  glycaemic: 'Glycaemic',
  lipid: 'Lipid',
  anthropometric: 'Anthropometric',
  demographic: 'Demographic',
};

export default function ReferenceOntologyPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<Ontology | null>(null);
  const [error, setError] = useState<string>('');
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch('/api/reference/ontology', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.entities;
    return data.entities.filter((e) =>
      [e.display_name, e.canonical_name, e.loinc.code, e.ucum.code, e.meo_unit, ...e.meo_names]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [data, q]);

  const byDomain = useMemo(() => {
    const groups: Record<string, Entity[]> = {};
    for (const e of filtered) (groups[e.domain] ||= []).push(e);
    return groups;
  }, [filtered]);

  const pageBg = `linear-gradient(160deg, ${colors.backgroundGradientStart}, ${colors.backgroundGradientMid} 55%, ${colors.backgroundGradientEnd})`;

  const card: React.CSSProperties = {
    background: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 16,
  };
  const codePill: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
    fontSize: 12,
    background: colors.accent,
    color: colors.primary,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 8,
    padding: '2px 8px',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  };

  return (
    <div style={{ minHeight: '100vh', background: pageBg, color: colors.foreground }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px' }}>
        <Link
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: colors.muted, fontSize: 14, textDecoration: 'none', marginBottom: 20 }}
        >
          <ArrowLeft size={16} /> {t('common.back') || 'Back to MeO'}
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: colors.primary, color: colors.primaryForeground, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookMarked size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Universal Ontology</h1>
            <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>
              {data ? data.name : 'MeO measurement reference system'}
              {data && (
                <span style={{ ...codePill, marginLeft: 10 }}>v{data.version}</span>
              )}
            </p>
          </div>
        </div>
        <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.6, maxWidth: 760 }}>
          Reference layer that binds MeO measurement entities to actively-maintained global standards so MeO can
          normalise and standardise measurements across any source — <strong style={{ color: colors.foreground }}>LOINC</strong> for
          the test, <strong style={{ color: colors.foreground }}>UCUM</strong> for the unit and{' '}
          <strong style={{ color: colors.foreground }}>SNOMED&nbsp;CT</strong> for the qualitative result.
        </p>

        {error && (
          <div style={{ ...card, padding: 16, marginTop: 16, borderColor: colors.error, color: colors.error }}>
            Could not load ontology: {error}
          </div>
        )}

        {/* Standards legend */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 24 }}>
            {[
              { key: 'loinc', icon: <Database size={18} /> },
              { key: 'ucum', icon: <Ruler size={18} /> },
              { key: 'snomed', icon: <Stethoscope size={18} /> },
            ].map(({ key, icon }) => {
              const s = data.standards[key];
              if (!s) return null;
              return (
                <a key={key} href={s.url} target="_blank" rel="noopener noreferrer" style={{ ...card, padding: 16, textDecoration: 'none', color: colors.foreground }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.primary, fontWeight: 700 }}>
                    {icon} {s.label}
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>{s.long_name}</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>{s.purpose}</div>
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>Steward: {s.steward}</div>
                </a>
              );
            })}
          </div>
        )}

        {/* Naming convention */}
        {data && (
          <div style={{ ...card, padding: 18, marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Canonical naming convention</div>
            <div style={{ ...codePill, fontSize: 14, padding: '6px 12px', marginBottom: 10 }}>{data.naming_convention.pattern}</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: colors.muted, fontSize: 13, lineHeight: 1.7 }}>
              {data.naming_convention.rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Search */}
        {data && (
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginTop: 24 }}>
            <Search size={18} color={colors.muted} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search entities, LOINC, UCUM…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: colors.foreground, fontSize: 14 }}
            />
            <span style={{ color: colors.muted, fontSize: 13 }}>{filtered.length} entities</span>
          </div>
        )}

        {/* Entities grouped by domain */}
        {data &&
          Object.entries(byDomain).map(([domain, items]) => (
            <div key={domain} style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px', color: colors.primary }}>
                {DOMAIN_LABELS[domain] || domain}
              </h2>
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: colors.muted, background: colors.accent }}>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Measurement</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Canonical name</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>LOINC (the question)</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Unit → UCUM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((e) => (
                        <tr key={e.canonical_name} style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600 }}>{e.display_name}</div>
                            <div style={{ color: colors.muted, fontSize: 12 }}>{e.meo_names.join(', ')}</div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={codePill}>{e.canonical_name}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={codePill}>{e.loinc.code}</span>
                            <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{e.loinc.long_name}</div>
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: colors.muted }}>{e.meo_unit}</span>
                            <span style={{ color: colors.muted, margin: '0 6px' }}>→</span>
                            <span style={codePill}>{e.ucum.code}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

        {/* Qualitative results (SNOMED CT) */}
        {data && data.qualitative_results.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: colors.primary }}>
              Qualitative results — SNOMED CT (the answer)
            </h2>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 10px' }}>
              Standard codes for interpreting measurements (e.g. insulin resistance, impaired glucose tolerance).
            </p>
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: colors.muted, background: colors.accent }}>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Result</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>SNOMED CT</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.qualitative_results.map((qr) => (
                      <tr key={qr.key} style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{qr.display_name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={codePill}>{qr.snomed.code}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: colors.muted }}>{qr.snomed.term}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!data && !error && (
          <div style={{ ...card, padding: 24, marginTop: 24, color: colors.muted }}>Loading ontology…</div>
        )}
      </div>
    </div>
  );
}
