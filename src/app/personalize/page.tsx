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
  Plus,
  Trash2,
  FileText,
  ListPlus,
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

// Full Kraft panel example for the demo user uk202603111645aaa.
// Includes everything the Biological Age Score / Deep Fat Score pipeline
// needs: fasting glucose + insulin, lipid panel (Total Cholesterol / HDL /
// Triglycerides), body composition (Weight / Height / Waist), and the
// 5-hour postprandial glucose+insulin curve for the Kraft chart.
// Full Kraft panel example. Submitting this writes every analyte the
// Truth Engine (bang/api/includes/indices.py) needs to compute the
// Biological Age Score and KRAFT Deep Fat Score: age, sex, body
// composition, lipids, fasting glucose + insulin, and the postprandial
// Kraft curve. After submit, chatbot-rag calls /v2/makeindices which
// runs indices_engine() → BAS + VAT get written automatically and the
// Analysis gauges light up on the next refresh.
const EXAMPLE_TEXT = `Subject: uk202603111645aaa
Date: 2026-04-01

DEMOGRAPHICS
Age 54 years
Sex Male

BIOMETRICS
Weight 82 kg
Height 178 cm
Waist 94 cm

FASTING at 8:52
Glucose 5.1
Insulin 1.44
Total Cholesterol 4.8
HDL 1.2
LDL 3.1
Triglycerides 1.1
HbA1c 5.4

POSTPRANDIAL (Kraft 5-hour curve)
9:22   Glucose 11.0   Insulin 5.8
9:52   Glucose 8.9    Insulin 26.9
10:21  Glucose 6.7    Insulin 9.0
10:51  Glucose 7.1    Insulin 9.6
11:50  Glucose 3.0    Insulin 1.44`;

type InputMode = 'paste' | 'form';

interface FormRow {
  name: string;
  value: string;
  unit: string;
  time: string; // HH:MM
  state: 'FASTING' | 'POSTPRANDIAL';
}

const COMMON_ANALYTES = [
  { name: 'Glucose', unit: 'mMol' },
  { name: 'Insulin', unit: 'uIU/mL' },
  { name: 'LDL', unit: 'mMol' },
  { name: 'HDL', unit: 'mMol' },
  { name: 'Total Cholesterol', unit: 'mMol' },
  { name: 'Triglycerides', unit: 'mMol' },
  { name: 'HbA1c', unit: '%' },
  { name: 'Weight', unit: 'kg' },
  { name: 'Height', unit: 'cm' },
  { name: 'Waist', unit: 'cm' },
  { name: 'Hip', unit: 'cm' },
];

const emptyRow = (): FormRow => ({
  name: 'Glucose',
  value: '',
  unit: 'mMol',
  time: '',
  state: 'FASTING',
});

export default function PersonalizePage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('paste');
  const [text, setText] = useState('');
  const [formRows, setFormRows] = useState<FormRow[]>([emptyRow()]);
  // Initialize as empty during SSR; populate after mount to avoid hydration mismatch
  const [formDate, setFormDate] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<ParsedPayload | null>(null);
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [mounted, setMounted] = useState(false);

  // Set client-only values after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setFormDate(new Date().toISOString().slice(0, 10));
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {}
  }, []);

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

  const callParse = async (body: any) => {
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
          ...body,
          user_email: userEmail,
          user_timezone: timezone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.detail || 'Failed to parse measurements');
        setParsing(false);
        return;
      }
      if (data.error) {
        setError(data.error);
        setParsing(false);
        return;
      }
      if (!data.items || data.items.length === 0) {
        setError('No measurements detected');
        setParsing(false);
        return;
      }
      // Normalise Sex + short units on the parsed items before showing
      // them in the review table, so the user sees exactly what will
      // be submitted (and short units like "%" → "pct" don't trip the
      // validator later).
      for (const item of data.items) {
        normaliseSex(item);
        normaliseUnit(item);
      }
      setPayload(data);
    } catch (e: any) {
      setError(e.message || 'Failed to parse');
    }
    setParsing(false);
  };

  const handleParse = async () => {
    if (!text.trim()) {
      setError('Please paste your measurements first');
      return;
    }
    await callParse({ text });
  };

  const handleParseForm = async () => {
    const validRows = formRows.filter((r) => r.name && r.value);
    if (validRows.length === 0) {
      setError('Please add at least one measurement');
      return;
    }
    const manual_items = validRows.map((r) => ({
      name: r.name,
      value: parseFloat(r.value),
      unit: r.unit,
      time: r.time || undefined,
      date: formDate,
      subjectState: r.state,
      subjectId: formSubjectId || undefined,
    }));
    await callParse({ manual_items });
  };

  const addFormRow = () => setFormRows([...formRows, emptyRow()]);
  const removeFormRow = (i: number) =>
    setFormRows(formRows.filter((_, idx) => idx !== i));
  const updateFormRow = (i: number, patch: Partial<FormRow>) => {
    setFormRows(formRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  // Edit a parsed payload item directly in the review table
  const updatePayloadItem = (index: number, patch: Partial<MeasurementItem>) => {
    if (!payload) return;
    const newItems = payload.items.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    setPayload({ ...payload, items: newItems });
  };

  const removePayloadItem = (index: number) => {
    if (!payload) return;
    const newItems = payload.items.filter((_, i) => i !== index);
    setPayload({ ...payload, items: newItems });
  };

  // Normalise Sex: the METS-VF formula in bang/api/includes/indices.py
  // treats Sex as a numeric coefficient (1 = Male, 0 = Female). The LLM
  // parser often emits it as the literal word "Male"/"Female"; convert
  // in place so the value passes the numeric check below AND reaches
  // the backend already in the form indices_engine expects.
  const normaliseSex = (item: { name?: string; value: unknown }): void => {
    if (!item.name || item.name.trim().toLowerCase() !== 'sex') return;
    const raw = String(item.value ?? '').trim().toLowerCase();
    if (raw === 'male' || raw === 'm' || raw === '1' || raw === '1.0') {
      item.value = 1;
    } else if (raw === 'female' || raw === 'f' || raw === '0' || raw === '0.0') {
      item.value = 0;
    }
  };

  // bang-api requires unit min_length=2. The chatbot-rag validator has
  // the same map; mirroring it client-side so the review-table edit
  // loop doesn't reject units before they reach the backend. Keep the
  // two maps in sync — change one, change both.
  // See: chatbot-rag/app/api/personalize.py UNIT_FIXES.
  const UNIT_FIXES: Record<string, string> = {
    '%': 'pct',
    g: 'gm',
    L: 'lt',
    C: 'cls',
    F: 'fah',
  };

  const normaliseUnit = (item: { unit?: string; name?: string }): void => {
    const unit = (item.unit ?? '').trim();
    if (unit.length >= 2) return;
    const fixed = UNIT_FIXES[unit];
    if (fixed) item.unit = fixed;
  };

  // Validate before submit
  const validatePayload = (): string | null => {
    if (!payload || payload.items.length === 0) return 'No measurements to submit';
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      // Normalise Sex + short units in-place so Male/Female and "%" are
      // accepted by the checks that follow. Safe no-op for every other
      // analyte. Belt-and-braces — these also run at parse time, but the
      // user may have edited the row after that.
      normaliseSex(item as { name?: string; value: unknown });
      normaliseUnit(item as { name?: string; unit?: string });
      if (!item.name || item.name.trim().length === 0) {
        return `Row ${i + 1}: name is required`;
      }
      if (item.name.includes('|')) {
        return `Row ${i + 1}: name "${item.name}" contains invalid character "|"`;
      }
      if (typeof item.value !== 'number' || isNaN(item.value)) {
        return `Row ${i + 1} (${item.name}): value must be a number`;
      }
      if (!item.unit || item.unit.length < 2) {
        return `Row ${i + 1} (${item.name}): unit must be at least 2 characters (got "${item.unit}")`;
      }
      if (!item.date) {
        return `Row ${i + 1} (${item.name}): date is required`;
      }
    }
    return null;
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
          user_timezone: timezone,
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
    const validationError = validatePayload();
    if (validationError) {
      setError(validationError);
      return;
    }
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

  return (
    <AppShell>
      {/* transparent so AppShell's gradient bleeds through — keeps
          personalize visually consistent with the chat screen. */}
      <div className="flex-1 overflow-auto" style={{ background: 'transparent' }}>
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

          {/* Mode Toggle */}
          {!payload && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setMode('paste'); setError(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border"
                style={{
                  background: mode === 'paste' ? colors.primary : colors.card,
                  color: mode === 'paste' ? colors.primaryForeground : colors.foreground,
                  borderColor: mode === 'paste' ? colors.primary : colors.cardBorder,
                }}
              >
                <FileText className="h-4 w-4" />
                Paste / Free text
              </button>
              <button
                onClick={() => { setMode('form'); setError(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border"
                style={{
                  background: mode === 'form' ? colors.primary : colors.card,
                  color: mode === 'form' ? colors.primaryForeground : colors.foreground,
                  borderColor: mode === 'form' ? colors.primary : colors.cardBorder,
                }}
              >
                <ListPlus className="h-4 w-4" />
                Form input
              </button>
            </div>
          )}

          {/* Step 1a: Paste mode */}
          {!payload && mode === 'paste' && (
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
                  Times will be interpreted in your local timezone ({mounted ? timezone : '...'}) and converted to UTC.
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

          {/* Step 1b: Form mode */}
          {!payload && mode === 'form' && (
            <div
              className="rounded-2xl p-6 border mb-6"
              style={{
                background: colors.card,
                borderColor: colors.cardBorder,
              }}
            >
              <label className="text-sm font-semibold block mb-3" style={{ color: colors.foreground }}>
                Add measurements manually
              </label>

              {/* Date and subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.muted }}>Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: colors.background,
                      color: colors.foreground,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.muted }}>Subject ID (optional)</label>
                  <input
                    type="text"
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    placeholder="e.g. uk202603111645aaa"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: colors.background,
                      color: colors.foreground,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  />
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2 mb-3">
                {formRows.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg"
                    style={{ background: colors.background }}
                  >
                    <div className="col-span-12 sm:col-span-3">
                      <label className="text-xs block mb-1" style={{ color: colors.muted }}>Analyte</label>
                      <select
                        value={row.name}
                        onChange={(e) => {
                          const found = COMMON_ANALYTES.find((a) => a.name === e.target.value);
                          updateFormRow(i, { name: e.target.value, unit: found?.unit || row.unit });
                        }}
                        className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                        style={{
                          background: colors.card,
                          color: colors.foreground,
                          border: `1px solid ${colors.cardBorder}`,
                        }}
                      >
                        {COMMON_ANALYTES.map((a) => (
                          <option key={a.name} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="text-xs block mb-1" style={{ color: colors.muted }}>Value</label>
                      <input
                        type="number"
                        step="any"
                        value={row.value}
                        onChange={(e) => updateFormRow(i, { value: e.target.value })}
                        placeholder="0.0"
                        className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                        style={{
                          background: colors.card,
                          color: colors.foreground,
                          border: `1px solid ${colors.cardBorder}`,
                        }}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="text-xs block mb-1" style={{ color: colors.muted }}>Unit</label>
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => updateFormRow(i, { unit: e.target.value })}
                        className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                        style={{
                          background: colors.card,
                          color: colors.foreground,
                          border: `1px solid ${colors.cardBorder}`,
                        }}
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="text-xs block mb-1" style={{ color: colors.muted }}>Time (optional)</label>
                      <input
                        type="time"
                        value={row.time}
                        onChange={(e) => updateFormRow(i, { time: e.target.value })}
                        className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                        style={{
                          background: colors.card,
                          color: colors.foreground,
                          border: `1px solid ${colors.cardBorder}`,
                        }}
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <label className="text-xs block mb-1" style={{ color: colors.muted }}>State</label>
                      <select
                        value={row.state}
                        onChange={(e) => updateFormRow(i, { state: e.target.value as any })}
                        className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                        style={{
                          background: colors.card,
                          color: colors.foreground,
                          border: `1px solid ${colors.cardBorder}`,
                        }}
                      >
                        <option value="FASTING">Fasting</option>
                        <option value="POSTPRANDIAL">Postprandial</option>
                      </select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => removeFormRow(i)}
                        disabled={formRows.length === 1}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                        style={{ color: colors.error || '#ef4444' }}
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row + Submit */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={addFormRow}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: colors.background,
                    color: colors.foreground,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add row
                </button>
                <button
                  onClick={handleParseForm}
                  disabled={parsing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                  style={{
                    background: colors.primary,
                    color: colors.primaryForeground,
                  }}
                >
                  {parsing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Process with AI
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

                <div className="px-4 py-3" style={{ borderTop: `1px solid ${colors.cardBorder}`, background: colors.background }}>
                  <p className="text-xs" style={{ color: colors.muted }}>
                    {'\u270F'} Click any field to edit. Trash icon removes a row.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.cardBorder}`, background: colors.background }}>
                        <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>Time (UTC)</th>
                        <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>Analyte</th>
                        <th className="text-right px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>Value</th>
                        <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>Unit</th>
                        <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>State</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {payload.items.map((item, idx) => {
                        const inputStyle = {
                          background: colors.background,
                          color: colors.foreground,
                          border: `1px solid ${colors.cardBorder}`,
                        };
                        const dateValue = item.date.slice(0, 16);
                        return (
                          <tr key={idx} style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                            <td className="px-3 py-2">
                              <input
                                type="datetime-local"
                                value={dateValue}
                                onChange={(e) => {
                                  const newDate = e.target.value + ':00Z';
                                  updatePayloadItem(idx, { date: newDate });
                                }}
                                className="w-full rounded px-2 py-1 text-xs outline-none"
                                style={inputStyle}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={
                                  COMMON_ANALYTES.find((a) => a.name === item.name)
                                    ? item.name
                                    : '__custom__'
                                }
                                onChange={(e) => {
                                  if (e.target.value === '__custom__') return;
                                  const found = COMMON_ANALYTES.find((a) => a.name === e.target.value);
                                  updatePayloadItem(idx, {
                                    name: e.target.value,
                                    unit: found?.unit || item.unit,
                                  });
                                }}
                                className="w-full rounded px-2 py-1 text-sm font-medium outline-none"
                                style={inputStyle}
                              >
                                {COMMON_ANALYTES.map((a) => (
                                  <option key={a.name} value={a.name}>{a.name}</option>
                                ))}
                                {!COMMON_ANALYTES.find((a) => a.name === item.name) && (
                                  <option value="__custom__">{item.name}</option>
                                )}
                              </select>
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="number"
                                step="any"
                                value={item.value}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  updatePayloadItem(idx, { value: isNaN(v) ? 0 : v });
                                }}
                                className="w-full rounded px-2 py-1 text-sm text-right outline-none font-semibold"
                                style={{ ...inputStyle, color: colors.primary }}
                              />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => updatePayloadItem(idx, { unit: e.target.value })}
                                className="w-full rounded px-2 py-1 text-xs outline-none"
                                style={inputStyle}
                                placeholder="min 2"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.subjectState}
                                onChange={(e) => updatePayloadItem(idx, { subjectState: e.target.value })}
                                className="w-full rounded px-2 py-1 text-xs outline-none"
                                style={inputStyle}
                              >
                                <option value="FASTING">Fasting</option>
                                <option value="POSTPRANDIAL">Postprandial</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removePayloadItem(idx)}
                                className="p-1 rounded transition-colors hover:bg-white/5"
                                style={{ color: '#ef4444' }}
                                aria-label="Remove row"
                                title="Remove this row"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
