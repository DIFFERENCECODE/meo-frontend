'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, ArrowLeft, Activity, AlertCircle } from 'lucide-react';
import { getIdToken, apiFetch } from '@/app/lib/auth';

// ── Data model ─────────────────────────────────────────────────────────────
interface OnboardingData {
  firstName: string; lastName: string; dob: string; gender: string;
  occupation: string; postcode: string; city: string; phone: string; email: string;
  weightKg: string; heightCm: string; waistCm: string; heardAbout: string;
  healthConcerns: string; sleepIssues: string;
  dietaryHistory: string; currentDietTypes: string[]; recarbProtocol: boolean;
  familyHistory: string; familyHistoryDetails: string; alzheimerInterest: number;
  bloodResultsAvailable: string[]; medicalConditions: string[];
  referredBy: string; referrerName: string; resultsSharing: string;
  medicationYesNo: string; medicationDetails: string; bloodPressure: string;
  topicsOfInterest: string; scoreInterest: number; descriptionInterest: number;
  coachingInterest: number; additionalInfo: string;
  disclaimerAccepted: boolean; dataConsent: string;
}
const EMPTY: OnboardingData = {
  firstName: '', lastName: '', dob: '', gender: '', occupation: '',
  postcode: '', city: '', phone: '', email: '',
  weightKg: '', heightCm: '', waistCm: '', heardAbout: '',
  healthConcerns: '', sleepIssues: '',
  dietaryHistory: '', currentDietTypes: [], recarbProtocol: false,
  familyHistory: '', familyHistoryDetails: '', alzheimerInterest: 0,
  bloodResultsAvailable: [], medicalConditions: [],
  referredBy: '', referrerName: '', resultsSharing: '',
  medicationYesNo: '', medicationDetails: '', bloodPressure: '',
  topicsOfInterest: '', scoreInterest: 0, descriptionInterest: 0,
  coachingInterest: 0, additionalInfo: '',
  disclaimerAccepted: false, dataConsent: '',
};

// ── Constants ──────────────────────────────────────────────────────────────
const STEPS = [
  { title: 'Tell us about yourself',    subtitle: 'Your basic personal information.' },
  { title: 'Physical & background',     subtitle: 'A few quick measurements and how you found us.' },
  { title: 'Your health goals',         subtitle: 'What do you want to achieve?' },
  { title: 'Diet & lifestyle',          subtitle: 'Understanding your eating habits.' },
  { title: 'Medical history',           subtitle: 'This helps us personalise your insights.' },
  { title: 'Referral & consent',        subtitle: 'Almost done! Just a few final details.' },
];
const TOTAL = STEPS.length;

const DIET_TYPES = ['Low carb', 'Keto', 'Whole foods', 'Vegan', 'Paleo', 'Weight Watchers', 'No specific diet', 'Other'];
const MEDICAL_CONDITIONS = [
  'Type 2 Diabetes', 'Pre-diabetes / Insulin resistance', 'Hypertension',
  'High cholesterol / Dyslipidaemia', 'Thyroid condition', 'PCOS',
  'Heart disease / Cardiovascular disease', 'NAFLD',
  'Obesity / Weight issues', 'Metabolic syndrome', 'Cancer (current or history)',
  'Autoimmune condition', 'Sleep apnoea', 'Anxiety / Depression',
  "Alzheimer's / Dementia (family history)", 'Kidney disease', 'Gout', 'None of the above',
];
const BLOOD_RESULTS = ['Lipids / Cholesterol panel', 'HbA1c', 'Liver function', 'Other'];
const REFERRAL_SOURCES = [
  'NHS GP', 'Private GP', 'Specialist / Consultant', 'Friend or family',
  'Social media', 'Website / Internet search', 'Employer / Occupational health',
  'Kraft Experience event', 'Other',
];
const RESULTS_SHARING = [
  'Yes – share with my GP', 'No – keep results private',
  'Yes – share with my specialist', "I'll decide later",
];

// ── Shared input helpers ───────────────────────────────────────────────────
const iBase = "w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none bg-white transition-colors";
const iS    = { borderColor: '#e5e7eb', color: '#111827', fontSize: '16px' };
const iF    = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = '#a4d65e');
const iB    = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = '#e5e7eb');

function Lbl({ text, required, hint }: { text: string; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-medium" style={{ color: '#374151' }}>
        {text}{required && <span style={{ color: '#a4d65e' }}> *</span>}
      </label>
      {hint && <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{hint}</p>}
    </div>
  );
}

function Inp({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    disabled={disabled} className={iBase + (disabled ? ' opacity-50 cursor-not-allowed' : '')}
    style={iS} onFocus={iF} onBlur={iB} />;
}

function Sel({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} onFocus={iF} onBlur={iB}
      className={iBase + ' appearance-none'} style={{ ...iS, color: value ? '#111827' : '#9ca3af' }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Txt({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className={iBase + ' resize-none'} style={iS} onFocus={iF} onBlur={iB} />;
}

function Chips({ values, onChange, options, single }: {
  values: string[]; onChange: (v: string[]) => void; options: string[]; single?: boolean;
}) {
  const toggle = (o: string) => {
    if (single) { onChange(values[0] === o ? [] : [o]); return; }
    onChange(values.includes(o) ? values.filter(v => v !== o) : [...values, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = values.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: on ? '#f0fdf4' : '#f9fafb', border: `1px solid ${on ? '#a4d65e' : '#e5e7eb'}`, color: on ? '#1a3a3a' : '#374151' }}>
            {on && <Check className="inline h-3 w-3 mr-1" />}{o}
          </button>
        );
      })}
    </div>
  );
}

function Rating({ value, onChange, low = 'Not interested', high = 'Very interested' }: {
  value: number; onChange: (v: number) => void; low?: string; high?: string;
}) {
  return (
    <div>
      <div className="flex gap-2 mb-1.5">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className="flex-1 h-10 rounded-lg text-sm font-semibold transition-all"
            style={{ background: value === n ? '#1a3a3a' : '#f9fafb', border: `1px solid ${value === n ? '#1a3a3a' : '#e5e7eb'}`, color: value === n ? '#fff' : '#374151' }}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs" style={{ color: '#9ca3af' }}>
        <span>{low}</span><span>{high}</span>
      </div>
    </div>
  );
}

// ── App preview panel ──────────────────────────────────────────────────────
function AppPreview({ name }: { name: string }) {
  const first = name.trim().split(' ')[0] || '';
  return (
    <div className="hidden lg:flex flex-1 items-center justify-center p-14 xl:p-20" style={{ background: '#f5f4f1' }}>
      <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl border" style={{ background: '#1a3a3a', borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Window bar */}
        <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: '#0e2020', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        {/* Chat area */}
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#a4d65e' }}>
              <span className="text-xs font-bold" style={{ color: '#1a3a3a' }}>M</span>
            </div>
            <div className="rounded-2xl rounded-tl-none px-3.5 py-2.5 text-sm max-w-[80%]" style={{ background: 'rgba(164,214,94,0.12)', color: '#e8f5e8' }}>
              {first ? `Hello, ${first}! 👋` : 'Hello there! 👋'}
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#a4d65e' }}>
              <span className="text-xs font-bold" style={{ color: '#1a3a3a' }}>M</span>
            </div>
            <div className="rounded-2xl rounded-tl-none px-3.5 py-2.5 text-sm max-w-[80%]" style={{ background: 'rgba(164,214,94,0.12)', color: '#e8f5e8' }}>
              Welcome to Meterbolic. I'm MeO, your metabolic health AI.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-none px-3.5 py-2.5 text-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              Tell me about my metabolic health…
            </div>
          </div>
          {/* Typing indicator */}
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#a4d65e' }}>
              <span className="text-xs font-bold" style={{ color: '#1a3a3a' }}>M</span>
            </div>
            <div className="rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center" style={{ background: 'rgba(164,214,94,0.12)' }}>
              {[0,1,2].map(i => (
                <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: '#a4d65e', opacity: 0.6 + i * 0.2 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Validation ─────────────────────────────────────────────────────────────
function validateStep(step: number, data: OnboardingData): string | null {
  if (step === 0) {
    if (!data.firstName.trim()) return 'Please enter your first name.';
    if (!data.lastName.trim()) return 'Please enter your last name.';
    if (!data.dob) return 'Please enter your date of birth.';
    if (!data.gender) return 'Please select your gender.';
    if (!data.postcode.trim()) return 'Please enter your postcode.';
    if (!data.phone.trim()) return 'Please enter your phone number.';
    if (!data.email.trim()) return 'Please enter your email address.';
  }
  if (step === 1 && !data.heardAbout) return 'Please tell us how you heard about Meterbolic.';
  if (step === 2) {
    if (!data.healthConcerns.trim()) return 'Please describe your health concerns.';
    if (!data.sleepIssues) return 'Please answer the sleep question.';
  }
  if (step === 3) {
    if (!data.dietaryHistory.trim()) return 'Please describe your dietary history.';
    if (data.currentDietTypes.length === 0) return 'Please select at least one diet type.';
    if (!data.recarbProtocol) return 'Please confirm the recarb protocol.';
  }
  if (step === 4 && !data.familyHistory) return 'Please answer the family history question.';
  if (step === 5) {
    if (!data.resultsSharing) return 'Please select your results sharing preference.';
    if (!data.medicationYesNo) return 'Please answer the medication question.';
    if (!data.disclaimerAccepted) return 'Please accept the disclaimer.';
    if (!data.dataConsent) return 'Please provide your data consent.';
    if (data.dataConsent === 'No, I do not consent') return 'Data consent is required to use Meterbolic.';
  }
  return null;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getIdToken()) { router.replace('/'); return; }
    if (localStorage.getItem('meo_onboarding_v1')) router.replace('/');
  }, []);

  const upd = (k: keyof OnboardingData, v: any) => setData(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding: data }),
      });
    } catch { /* non-blocking */ }
    localStorage.setItem('meo_onboarding_v1', '1');
    router.replace('/');
  };

  const next = () => {
    const err = validateStep(step, data);
    if (err) { setError(err); return; }
    setError('');
    if (step < TOTAL - 1) { setStep(s => s + 1); return; }
    handleSubmit();
  };

  const back = () => { setError(''); setStep(s => s - 1); };

  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ background: '#e5e7eb' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: '#a4d65e' }} />
      </div>

      <div className="flex flex-1">
        {/* ── Left: form ─────────────────────────────────────── */}
        <div className="flex flex-col w-full lg:w-[540px] xl:w-[580px] flex-shrink-0 bg-white px-8 sm:px-14 lg:px-16 pt-12 pb-10 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12 flex-shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: '#1a3a3a' }}>
              <Activity className="h-3.5 w-3.5" style={{ color: '#a4d65e' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: '#1a3a3a' }}>Meterbolic</span>
          </div>

          {/* Step counter */}
          <p className="text-xs font-medium mb-3 flex-shrink-0" style={{ color: '#9ca3af' }}>Step {step + 1} of {TOTAL}</p>
          <h1 className="text-2xl font-bold mb-1.5 flex-shrink-0" style={{ color: '#111827' }}>{STEPS[step].title}</h1>
          <p className="text-sm mb-8 flex-shrink-0" style={{ color: '#6b7280' }}>{STEPS[step].subtitle}</p>

          {/* ── Step content ─── */}
          <div className="space-y-5">
            {step === 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl text="First name" required /><Inp value={data.firstName} onChange={v => upd('firstName', v)} placeholder="Jane" /></div>
                  <div><Lbl text="Last name" required /><Inp value={data.lastName} onChange={v => upd('lastName', v)} placeholder="Smith" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl text="Date of birth" required /><Inp type="date" value={data.dob} onChange={v => upd('dob', v)} /></div>
                  <div><Lbl text="Gender" required /><Sel value={data.gender} onChange={v => upd('gender', v)} options={['Male','Female','Non-binary','Prefer not to say']} placeholder="Select…" /></div>
                </div>
                <div><Lbl text="Occupation" /><Inp value={data.occupation} onChange={v => upd('occupation', v)} placeholder="e.g. Software engineer" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl text="Postcode" required /><Inp value={data.postcode} onChange={v => upd('postcode', v)} placeholder="SW1A 1AA" /></div>
                  <div><Lbl text="City" /><Inp value={data.city} onChange={v => upd('city', v)} placeholder="London" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl text="Phone" required /><Inp type="tel" value={data.phone} onChange={v => upd('phone', v)} placeholder="+44 7700 900000" /></div>
                  <div><Lbl text="Email" required /><Inp type="email" value={data.email} onChange={v => upd('email', v)} placeholder="jane@example.com" /></div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><Lbl text="Weight (kg)" /><Inp type="number" value={data.weightKg} onChange={v => upd('weightKg', v)} placeholder="75" /></div>
                  <div><Lbl text="Height (cm)" /><Inp type="number" value={data.heightCm} onChange={v => upd('heightCm', v)} placeholder="170" /></div>
                  <div><Lbl text="Waist (cm)" /><Inp type="number" value={data.waistCm} onChange={v => upd('waistCm', v)} placeholder="85" /></div>
                </div>
                <div>
                  <Lbl text="How did you hear about Meterbolic?" required />
                  <Sel value={data.heardAbout} onChange={v => upd('heardAbout', v)}
                    options={['NHS GP referral','Private GP referral','Friend or family','Social media','Google / Internet search','Kraft Experience event','Employer / workplace wellness','Podcast or media','Other']}
                    placeholder="Select…" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Lbl text="What are your main health concerns or goals?" required />
                  <Txt value={data.healthConcerns} onChange={v => upd('healthConcerns', v)} rows={5}
                    placeholder="e.g. I want to understand my blood sugar patterns, lose weight, improve energy levels…" />
                </div>
                <div>
                  <Lbl text="Do you currently experience sleep issues?" required />
                  <Chips values={data.sleepIssues ? [data.sleepIssues] : []} onChange={v => upd('sleepIssues', v[0] || '')} options={['Yes','No','Somewhat']} single />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Lbl text="Describe your dietary history" required hint="What have you tried before? Any diets, restrictions, or patterns?" />
                  <Txt value={data.dietaryHistory} onChange={v => upd('dietaryHistory', v)} rows={4}
                    placeholder="e.g. I've tried calorie counting and intermittent fasting…" />
                </div>
                <div>
                  <Lbl text="Which best describes your current diet?" required />
                  <Chips values={data.currentDietTypes}
                    onChange={v => upd('currentDietTypes', v)} options={DIET_TYPES} />
                </div>
                <div>
                  <button type="button" onClick={() => upd('recarbProtocol', !data.recarbProtocol)}
                    className="flex items-start gap-3 w-full text-left rounded-xl p-4 transition-colors"
                    style={{ background: data.recarbProtocol ? '#f0fdf4' : '#f9fafb', border: `1px solid ${data.recarbProtocol ? '#a4d65e' : '#e5e7eb'}` }}>
                    <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded flex items-center justify-center"
                      style={{ background: data.recarbProtocol ? '#a4d65e' : '#fff', border: `2px solid ${data.recarbProtocol ? '#a4d65e' : '#d1d5db'}` }}>
                      {data.recarbProtocol && <Check size={12} color="#1a3a3a" strokeWidth={3} />}
                    </span>
                    <span className="text-sm" style={{ color: '#374151' }}>
                      <strong>Recarb protocol</strong> — I commit to following the dietary guidance provided by the Meterbolic team before and during testing. <span style={{ color: '#9ca3af' }}>Required *</span>
                    </span>
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <Lbl text="Family history of metabolic or cardiovascular disease?" required />
                  <Chips values={data.familyHistory ? [data.familyHistory] : []} onChange={v => upd('familyHistory', v[0] || '')} options={['Yes','No','Not sure']} single />
                </div>
                {data.familyHistory === 'Yes' && (
                  <div>
                    <Lbl text="Please provide details" />
                    <Txt value={data.familyHistoryDetails} onChange={v => upd('familyHistoryDetails', v)} rows={3}
                      placeholder="e.g. Father had Type 2 Diabetes, mother had heart disease…" />
                  </div>
                )}
                <div>
                  <Lbl text="Interest in Alzheimer's & metabolic health assessment" hint="Rate from 1 (not interested) to 5 (very interested)" />
                  <Rating value={data.alzheimerInterest} onChange={v => upd('alzheimerInterest', v)} />
                </div>
                <div>
                  <Lbl text="Do you have recent blood test results available?" />
                  <Chips values={data.bloodResultsAvailable} onChange={v => upd('bloodResultsAvailable', v)} options={BLOOD_RESULTS} />
                </div>
                <div>
                  <Lbl text="Do any of these conditions apply to you?" />
                  <Chips values={data.medicalConditions} onChange={v => upd('medicalConditions', v)} options={MEDICAL_CONDITIONS} />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl text="Referred by" /><Sel value={data.referredBy} onChange={v => upd('referredBy', v)} options={REFERRAL_SOURCES} placeholder="Select…" /></div>
                  <div><Lbl text="Referrer's name (if applicable)" /><Inp value={data.referrerName} onChange={v => upd('referrerName', v)} placeholder="Dr. A. Smith" /></div>
                </div>
                <div>
                  <Lbl text="Would you like results shared with your referring clinician?" required />
                  <Sel value={data.resultsSharing} onChange={v => upd('resultsSharing', v)} options={RESULTS_SHARING} placeholder="Select…" />
                </div>
                <div>
                  <Lbl text="Are you currently taking prescribed medication?" required />
                  <Chips values={data.medicationYesNo ? [data.medicationYesNo] : []} onChange={v => upd('medicationYesNo', v[0] || '')} options={['Yes','No']} single />
                </div>
                {data.medicationYesNo === 'Yes' && (
                  <div>
                    <Lbl text="Please list your medications" />
                    <Txt value={data.medicationDetails} onChange={v => upd('medicationDetails', v)} rows={2} placeholder="e.g. Metformin 500mg, Atorvastatin 20mg…" />
                  </div>
                )}
                <div><Lbl text="Current blood pressure (if known)" /><Inp value={data.bloodPressure} onChange={v => upd('bloodPressure', v)} placeholder="e.g. 120/80" /></div>
                <div>
                  <Lbl text="Interest in metabolic health coaching" hint="1 = Not interested · 5 = Very interested" />
                  <Rating value={data.coachingInterest} onChange={v => upd('coachingInterest', v)} />
                </div>
                <div>
                  <Lbl text="Anything else you'd like to share?" />
                  <Txt value={data.additionalInfo} onChange={v => upd('additionalInfo', v)} rows={2} placeholder="Anything relevant to your metabolic health…" />
                </div>

                <div className="h-px" style={{ background: '#e5e7eb' }} />

                <button type="button" onClick={() => upd('disclaimerAccepted', !data.disclaimerAccepted)}
                  className="flex items-start gap-3 w-full text-left rounded-xl p-4 transition-colors"
                  style={{ background: data.disclaimerAccepted ? '#f0fdf4' : '#f9fafb', border: `1px solid ${data.disclaimerAccepted ? '#a4d65e' : '#e5e7eb'}` }}>
                  <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded flex items-center justify-center"
                    style={{ background: data.disclaimerAccepted ? '#a4d65e' : '#fff', border: `2px solid ${data.disclaimerAccepted ? '#a4d65e' : '#d1d5db'}` }}>
                    {data.disclaimerAccepted && <Check size={12} color="#1a3a3a" strokeWidth={3} />}
                  </span>
                  <span className="text-sm" style={{ color: '#374151' }}>
                    I acknowledge that Meterbolic provides informational insights and is not a substitute for medical advice. I agree to the <span style={{ color: '#1a3a3a', fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: '#1a3a3a', fontWeight: 600 }}>Privacy Policy</span>. <span style={{ color: '#9ca3af' }}>Required *</span>
                  </span>
                </button>

                <div>
                  <Lbl text="I consent to Meterbolic processing my health data for my metabolic assessment" required />
                  <Chips values={data.dataConsent ? [data.dataConsent] : []} onChange={v => upd('dataConsent', v[0] || '')} options={['Yes, I consent','No, I do not consent']} single />
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-lg px-4 py-3 flex items-start gap-2 text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <button onClick={back}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                style={{ border: '1px solid #e5e7eb', color: '#374151' }}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button onClick={next} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: '#111827', color: '#ffffff' }}>
              {submitting ? 'Saving…' : step === TOTAL - 1 ? <>Complete <Check className="h-4 w-4" /></> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
          <p className="mt-3 text-xs" style={{ color: '#9ca3af' }}>
            {step === TOTAL - 1 ? 'Your data is encrypted and stored securely.' : `${TOTAL - step - 1} step${TOTAL - step - 1 !== 1 ? 's' : ''} remaining`}
          </p>
        </div>

        {/* ── Right: app preview ──────────────────────────────── */}
        <AppPreview name={data.firstName} />
      </div>
    </div>
  );
}
