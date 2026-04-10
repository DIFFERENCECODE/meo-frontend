'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getValidIdToken } from '@/app/lib/auth';

interface MeasurementItem {
  date: string;
  measurementSeries: string;
  name: string;
  unit: string;
  value: number;
  source: string;
  recordType: string;
  subjectState: string;
  canontimeofglucose: string;
}

interface ParsedPayload {
  subjectEmail: string;
  items: MeasurementItem[];
  error?: string;
}

const EXAMPLE_TEXT = `Subject: uk202603111645aaa
Date: 2026-04-01

FASTING at 9:52
Glucose 5.1
Total Cholesterol 7.13
HDL 2.15
Triglycerides 0.40
Insulin 1.44

POSTPRANDIAL
10:22  Glucose 11.0   Insulin 5.8
10:52  Glucose 8.9    Insulin 26.9
11:21  Glucose 6.7    Insulin 9.0
11:51  Glucose 7.1    Insulin 9.6
12:50  Glucose 3.0    Insulin 1.44`;

export default function PersonalizePage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<ParsedPayload | null>(null);
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get user email from token
    (async () => {
      const token = await getValidIdToken();
      if (!token) {
        router.replace('/');
        return;
      }
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(tokenPayload.email || '');
      } catch {}
    })();
  }, []);

  const handleParse = async () => {
    if (!text.trim()) {
      setError('Please paste your measurements first');
      return;
    }
    setError(null);
    setSuccess(null);
    setParsing(true);
    try {
      const token = await getValidIdToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await fetch('/api/personalize/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text,
          user_email: userEmail,
          user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to parse measurements');
        setParsing(false);
        return;
      }
      if (data.error) {
        setError(data.error);
        setParsing(false);
        return;
      }
      if (!data.items || data.items.length === 0) {
        setError('No measurements detected in the text');
        setParsing(false);
        return;
      }
      setPayload(data);
    } catch (e: any) {
      setError(e.message || 'Failed to parse');
    }
    setParsing(false);
  };

  const handleRefine = async () => {
    if (!refineText.trim() || !payload) return;
    setError(null);
    setParsing(true);
    try {
      const token = await getValidIdToken();
      if (!token) return;
      const res = await fetch('/api/personalize/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text,
          user_email: userEmail,
          user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          previous_payload: payload,
          refinement_instruction: refineText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to refine');
        setParsing(false);
        return;
      }
      setPayload(data);
      setRefineText('');
    } catch (e: any) {
      setError(e.message || 'Failed to refine');
    }
    setParsing(false);
  };

  const handleSubmit = async () => {
    if (!payload || payload.items.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const token = await getValidIdToken();
      if (!token) return;
      const res = await fetch('/api/personalize/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit measurements');
        setSubmitting(false);
        return;
      }
      setSuccess(`Successfully submitted ${data.submitted || payload.items.length} measurements!`);
      setPayload(null);
      setText('');
      setRefineText('');
    } catch (e: any) {
      setError(e.message || 'Failed to submit');
    }
    setSubmitting(false);
  };

  const handleCancel = () => {
    setPayload(null);
    setRefineText('');
    setError(null);
  };

  const useExample = () => {
    setText(EXAMPLE_TEXT);
    setError(null);
    setSuccess(null);
  };

  // Group items by series + state for display
  const grouped: Record<string, MeasurementItem[]> = {};
  if (payload?.items) {
    payload.items.forEach((item) => {
      const key = `${item.measurementSeries} | ${item.subjectState}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-auto" style={{ background: colors.background }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 text-sm hover:underline"
              style={{ color: colors.muted }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to chat
            </Link>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: colors.primary + '20' }}
              >
                <Sparkles className="h-6 w-6" style={{ color: colors.primary }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>
                  Personalize Your Data
                </h1>
                <p className="text-sm" style={{ color: colors.muted }}>
                  Paste measurements in any format. AI will structure them for you.
                </p>
              </div>
            </div>
          </div>

          {success && (
            <div
              className="mb-6 rounded-2xl p-4 border flex items-start gap-3"
              style={{
                background: `${colors.primary}15`,
                borderColor: colors.primary + '40',
              }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: colors.primary }} />
              <p className="text-sm" style={{ color: colors.foreground }}>
                {success}
              </p>
            </div>
          )}

          {error && (
            <div
              className="mb-6 rounded-2xl p-4 border flex items-start gap-3"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-sm" style={{ color: '#ef4444' }}>
                {error}
              </p>
            </div>
          )}

          {/* Step 1: Input */}
          {!payload && (
            <div
              className="rounded-2xl p-6 border mb-6"
              style={{
                background: colors.card,
                borderColor: colors.cardBorder,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  Paste your measurements
                </label>
                <button
                  onClick={useExample}
                  className="text-xs px-3 py-1 rounded-full border transition-colors"
                  style={{
                    color: colors.primary,
                    borderColor: colors.primary + '50',
                    background: colors.primary + '10',
                  }}
                >
                  Use example
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your Kraft test results, biomarker values, or any measurement data here. The AI will figure out the structure."
                rows={14}
                className="w-full rounded-xl p-4 text-sm font-mono resize-y outline-none transition-colors"
                style={{
                  background: colors.background,
                  color: colors.foreground,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs" style={{ color: colors.muted }}>
                  Times will be interpreted in your local timezone (
                  {typeof window !== 'undefined'
                    ? Intl.DateTimeFormat().resolvedOptions().timeZone
                    : 'UTC'}
                  ) and converted to UTC.
                </p>
                <button
                  onClick={handleParse}
                  disabled={parsing || !text.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                  style={{
                    background: colors.primary,
                    color: colors.primaryForeground,
                  }}
                >
                  {parsing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Parse with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {payload && payload.items && payload.items.length > 0 && (
            <>
              <div
                className="rounded-2xl border overflow-hidden mb-6"
                style={{
                  background: colors.card,
                  borderColor: colors.cardBorder,
                }}
              >
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${colors.cardBorder}` }}
                >
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: colors.foreground }}>
                      Review parsed measurements
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                      {payload.items.length} measurement{payload.items.length !== 1 ? 's' : ''} ·{' '}
                      Subject: {payload.subjectEmail}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {Object.entries(grouped).map(([groupKey, items]) => (
                    <div key={groupKey}>
                      <div
                        className="px-6 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{
                          color: colors.muted,
                          background: colors.background,
                          borderTop: `1px solid ${colors.cardBorder}`,
                        }}
                      >
                        {groupKey}
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                            <th
                              className="text-left px-6 py-2 text-xs font-medium uppercase tracking-wider"
                              style={{ color: colors.muted }}
                            >
                              Time (UTC)
                            </th>
                            <th
                              className="text-left px-6 py-2 text-xs font-medium uppercase tracking-wider"
                              style={{ color: colors.muted }}
                            >
                              Analyte
                            </th>
                            <th
                              className="text-right px-6 py-2 text-xs font-medium uppercase tracking-wider"
                              style={{ color: colors.muted }}
                            >
                              Value
                            </th>
                            <th
                              className="text-left px-6 py-2 text-xs font-medium uppercase tracking-wider"
                              style={{ color: colors.muted }}
                            >
                              Unit
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, i) => (
                            <tr
                              key={i}
                              style={{
                                borderBottom:
                                  i < items.length - 1
                                    ? `1px solid ${colors.cardBorder}`
                                    : 'none',
                              }}
                            >
                              <td className="px-6 py-2.5" style={{ color: colors.muted, fontSize: '0.8rem' }}>
                                {new Date(item.date).toLocaleString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-2.5 font-medium" style={{ color: colors.foreground }}>
                                {item.name}
                              </td>
                              <td
                                className="px-6 py-2.5 text-right font-semibold"
                                style={{ color: colors.primary }}
                              >
                                {typeof item.value === 'number' ? item.value : item.value}
                              </td>
                              <td className="px-6 py-2.5" style={{ color: colors.muted }}>
                                {item.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refinement input */}
              <div
                className="rounded-2xl p-5 border mb-6"
                style={{
                  background: colors.card,
                  borderColor: colors.cardBorder,
                }}
              >
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: colors.muted }}>
                  Need to make changes? Just describe them
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                    placeholder='e.g. "change all glucose units to mg/dL" or "remove the 12:50 reading"'
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{
                      background: colors.background,
                      color: colors.foreground,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  />
                  <button
                    onClick={handleRefine}
                    disabled={parsing || !refineText.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      background: colors.background,
                      color: colors.foreground,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    {parsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Refine'}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    background: colors.background,
                    color: colors.foreground,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{
                    background: colors.primary,
                    color: colors.primaryForeground,
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit {payload.items.length} measurement{payload.items.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
