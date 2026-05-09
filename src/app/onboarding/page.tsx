'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken, apiFetch } from '@/app/lib/auth';
import { cn } from '@/lib/utils';

// ─── Form Data Shape ────────────────────────────────────────────────────────

interface OnboardingData {
  // Step 1: Personal
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  occupation: string;
  postcode: string;
  city: string;
  phone: string;
  email: string;

  // Step 2: Physical
  weightKg: string;
  heightCm: string;
  waistCm: string;
  heardAbout: string;

  // Step 3: Health Goals
  healthConcerns: string;
  sleepIssues: string;

  // Step 4: Diet
  dietaryHistory: string;
  currentDietTypes: string[];
  recarbProtocol: boolean;

  // Step 5: Medical
  familyHistory: string;
  familyHistoryDetails: string;
  alzheimerInterest: number;
  bloodResultsAvailable: string[];
  medicalConditions: string[];

  // Step 6: Referral & Consent
  referredBy: string;
  referrerName: string;
  resultsSharing: string;
  medicationYesNo: string;
  medicationDetails: string;
  bloodPressure: string;
  topicsOfInterest: string;
  scoreInterest: number;
  descriptionInterest: number;
  coachingInterest: number;
  additionalInfo: string;
  disclaimerAccepted: boolean;
  dataConsent: string;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const DIET_TYPES = ['Low carb', 'Keto', 'Whole foods', 'Vegan', 'Paleo', 'Weight Watchers', 'No specific diet', 'Other'];

const MEDICAL_CONDITIONS = [
  'Type 2 Diabetes', 'Pre-diabetes / Insulin resistance', 'Hypertension (high blood pressure)',
  'High cholesterol / Dyslipidaemia', 'Thyroid condition', 'Polycystic ovary syndrome (PCOS)',
  'Heart disease / Cardiovascular disease', 'Non-alcoholic fatty liver disease (NAFLD)',
  'Obesity / Weight issues', 'Metabolic syndrome', 'Cancer (current or history)',
  'Autoimmune condition', 'Sleep apnoea', 'Anxiety / Depression / Mental health',
  'Alzheimer\'s / Dementia (family history)', 'Kidney disease', 'Gout',
  'None of the above',
];

const BLOOD_RESULTS = ['Lipids / Cholesterol panel', 'HbA1c', 'Liver function', 'Other'];

const REFERRAL_SOURCES = [
  'NHS GP', 'Private GP', 'Specialist / Consultant', 'Friend or family',
  'Social media', 'Website / Internet search', 'Employer / Occupational health',
  'Kraft Experience event', 'Other',
];

const RESULTS_SHARING = [
  'Yes – share with my GP', 'No – keep results private',
  'Yes – share with my specialist', 'I\'ll decide later',
];

const STEP_TITLES = [
  'Personal Details',
  'Physical & Background',
  'Health Goals',
  'Diet & Lifestyle',
  'Medical History',
  'Referral & Consent',
];

// ─── Reusable Field Components ───────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function Field({ label, required, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: '#a4d65e' }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-3 rounded-lg outline-none transition-all"
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff',
        fontSize: '16px', // prevent iOS zoom
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'rgba(164,214,94,0.6)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-3 rounded-lg outline-none transition-all resize-none"
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff',
        fontSize: '16px', // prevent iOS zoom
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'rgba(164,214,94,0.6)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
      }}
    />
  );
}

function SelectInput({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-3 rounded-lg outline-none transition-all appearance-none"
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: value ? '#fff' : 'rgba(255,255,255,0.4)',
        fontSize: '16px', // prevent iOS zoom
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o} style={{ background: '#1a3a3a', color: '#fff' }}>{o}</option>)}
    </select>
  );
}

function RadioGroup({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: value === o ? 'rgba(164,214,94,0.2)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${value === o ? 'rgba(164,214,94,0.6)' : 'rgba(255,255,255,0.15)'}`,
            color: value === o ? '#a4d65e' : 'rgba(255,255,255,0.7)',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function CheckboxGroup({ values, onChange, options }: {
  values: string[]; onChange: (v: string[]) => void; options: string[];
}) {
  const toggle = (o: string) => {
    onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);
  };
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all"
          style={{
            background: values.includes(o) ? 'rgba(164,214,94,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${values.includes(o) ? 'rgba(164,214,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          <span
            className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
            style={{
              background: values.includes(o) ? '#a4d65e' : 'transparent',
              border: `2px solid ${values.includes(o) ? '#a4d65e' : 'rgba(255,255,255,0.3)'}`,
            }}
          >
            {values.includes(o) && <Check size={10} color="#1a3a3a" strokeWidth={3} />}
          </span>
          {o}
        </button>
      ))}
    </div>
  );
}

function RatingScale({ value, onChange, label }: {
  value: number; onChange: (v: number) => void; label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>}
      <div className="flex gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="flex-1 sm:flex-none sm:w-12 h-12 rounded-full text-sm font-semibold transition-all"
            style={{
              background: value === n ? '#a4d65e' : 'rgba(255,255,255,0.07)',
              border: `2px solid ${value === n ? '#a4d65e' : 'rgba(255,255,255,0.15)'}`,
              color: value === n ? '#1a3a3a' : 'rgba(255,255,255,0.6)',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step Components ─────────────────────────────────────────────────────────

function Step1({ data, update }: { data: OnboardingData; update: (k: keyof OnboardingData, v: any) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="First Name" required>
          <TextInput value={data.firstName} onChange={(v) => update('firstName', v)} placeholder="Jane" />
        </Field>
        <Field label="Last Name" required>
          <TextInput value={data.lastName} onChange={(v) => update('lastName', v)} placeholder="Smith" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Date of Birth" required>
          <TextInput type="date" value={data.dob} onChange={(v) => update('dob', v)} />
        </Field>
        <Field label="Gender" required>
          <SelectInput
            value={data.gender} onChange={(v) => update('gender', v)}
            options={['Male', 'Female', 'Non-binary', 'Prefer not to say']}
            placeholder="Select..."
          />
        </Field>
      </div>
      <Field label="Occupation">
        <TextInput value={data.occupation} onChange={(v) => update('occupation', v)} placeholder="e.g. Software engineer" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Postcode" required>
          <TextInput value={data.postcode} onChange={(v) => update('postcode', v)} placeholder="e.g. SW1A 1AA" />
        </Field>
        <Field label="City">
          <TextInput value={data.city} onChange={(v) => update('city', v)} placeholder="e.g. London" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Phone" required>
          <TextInput type="tel" value={data.phone} onChange={(v) => update('phone', v)} placeholder="+44 7700 900000" />
        </Field>
        <Field label="Email" required>
          <TextInput type="email" value={data.email} onChange={(v) => update('email', v)} placeholder="jane@example.com" />
        </Field>
      </div>
    </div>
  );
}

function Step2({ data, update }: { data: OnboardingData; update: (k: keyof OnboardingData, v: any) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Field label="Weight (kg)">
          <TextInput type="number" value={data.weightKg} onChange={(v) => update('weightKg', v)} placeholder="75" />
        </Field>
        <Field label="Height (cm)">
          <TextInput type="number" value={data.heightCm} onChange={(v) => update('heightCm', v)} placeholder="170" />
        </Field>
        <Field label="Waist (cm)">
          <TextInput type="number" value={data.waistCm} onChange={(v) => update('waistCm', v)} placeholder="85" />
        </Field>
      </div>
      <Field label="How did you hear about Meterbolic?" required>
        <SelectInput
          value={data.heardAbout} onChange={(v) => update('heardAbout', v)}
          options={[
            'NHS GP referral', 'Private GP referral', 'Friend or family',
            'Social media (Instagram, X, LinkedIn)', 'Google / Internet search',
            'Kraft Experience event', 'Employer / workplace wellness',
            'Podcast or media', 'Other',
          ]}
          placeholder="Select..."
        />
      </Field>
    </div>
  );
}

function Step3({ data, update }: { data: OnboardingData; update: (k: keyof OnboardingData, v: any) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="What are your main health concerns or objectives?" required>
        <TextArea
          value={data.healthConcerns}
          onChange={(v) => update('healthConcerns', v)}
          placeholder="e.g. I want to understand my blood sugar patterns, lose weight, improve energy levels, reduce medication..."
          rows={5}
        />
      </Field>
      <Field label="Do you currently experience sleep issues?" required>
        <RadioGroup
          value={data.sleepIssues}
          onChange={(v) => update('sleepIssues', v)}
          options={['Yes', 'No', 'Somewhat']}
        />
      </Field>
    </div>
  );
}

function Step4({ data, update }: { data: OnboardingData; update: (k: keyof OnboardingData, v: any) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Describe your dietary history" required hint="What have you tried before? Any diets, restrictions, or eating patterns?">
        <TextArea
          value={data.dietaryHistory}
          onChange={(v) => update('dietaryHistory', v)}
          placeholder="e.g. I've tried calorie counting and intermittent fasting. I generally eat a balanced diet but consume a lot of processed foods..."
          rows={4}
        />
      </Field>
      <Field label="Which best describes your current diet?" required>
        <div className="flex flex-wrap gap-2">
          {DIET_TYPES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                const next = data.currentDietTypes.includes(d)
                  ? data.currentDietTypes.filter((v) => v !== d)
                  : [...data.currentDietTypes, d];
                update('currentDietTypes', next);
              }}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: data.currentDietTypes.includes(d) ? 'rgba(164,214,94,0.2)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${data.currentDietTypes.includes(d) ? 'rgba(164,214,94,0.6)' : 'rgba(255,255,255,0.15)'}`,
                color: data.currentDietTypes.includes(d) ? '#a4d65e' : 'rgba(255,255,255,0.7)',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Recarb protocol" required>
        <button
          type="button"
          onClick={() => update('recarbProtocol', !data.recarbProtocol)}
          className="flex items-start gap-3 text-left"
        >
          <span
            className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
            style={{
              background: data.recarbProtocol ? '#a4d65e' : 'transparent',
              border: `2px solid ${data.recarbProtocol ? '#a4d65e' : 'rgba(255,255,255,0.3)'}`,
            }}
          >
            {data.recarbProtocol && <Check size={12} color="#1a3a3a" strokeWidth={3} />}
          </span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            I understand the recarb protocol and commit to following the dietary guidance provided by the Meterbolic team before and during testing.
          </span>
        </button>
      </Field>
    </div>
  );
}

function Step5({ data, update }: { data: OnboardingData; update: (k: keyof OnboardingData, v: any) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Family history of metabolic or cardiovascular disease?" required>
        <RadioGroup
          value={data.familyHistory}
          onChange={(v) => update('familyHistory', v)}
          options={['Yes', 'No', 'Not sure']}
        />
      </Field>
      {data.familyHistory === 'Yes' && (
        <Field label="Please provide details">
          <TextArea
            value={data.familyHistoryDetails}
            onChange={(v) => update('familyHistoryDetails', v)}
            placeholder="e.g. Father had Type 2 Diabetes, mother had heart disease..."
            rows={3}
          />
        </Field>
      )}
      <Field label="Interest in Alzheimer's & Metabolic Health assessment" hint="Rate your interest from 1 (not interested) to 5 (very interested)">
        <RatingScale value={data.alzheimerInterest} onChange={(v) => update('alzheimerInterest', v)} label="1 = Not interested  ·  5 = Very interested" />
      </Field>
      <Field label="Do you have recent blood test results available?">
        <CheckboxGroup
          values={data.bloodResultsAvailable}
          onChange={(v) => update('bloodResultsAvailable', v)}
          options={BLOOD_RESULTS}
        />
      </Field>
      <Field label="Do any of the following apply to you?">
        <CheckboxGroup
          values={data.medicalConditions}
          onChange={(v) => update('medicalConditions', v)}
          options={MEDICAL_CONDITIONS}
        />
      </Field>
    </div>
  );
}

function Step6({ data, update }: { data: OnboardingData; update: (k: keyof OnboardingData, v: any) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="Referred by">
          <SelectInput
            value={data.referredBy} onChange={(v) => update('referredBy', v)}
            options={REFERRAL_SOURCES}
            placeholder="Select..."
          />
        </Field>
        <Field label="Referrer's name (if applicable)">
          <TextInput value={data.referrerName} onChange={(v) => update('referrerName', v)} placeholder="Dr. A. Smith" />
        </Field>
      </div>
      <Field label="Would you like your results shared with your referring clinician?" required>
        <SelectInput
          value={data.resultsSharing} onChange={(v) => update('resultsSharing', v)}
          options={RESULTS_SHARING}
          placeholder="Select..."
        />
      </Field>
      <Field label="Are you currently taking any prescribed medication?" required>
        <RadioGroup
          value={data.medicationYesNo}
          onChange={(v) => update('medicationYesNo', v)}
          options={['Yes', 'No']}
        />
      </Field>
      {data.medicationYesNo === 'Yes' && (
        <Field label="Please list your medications">
          <TextArea
            value={data.medicationDetails}
            onChange={(v) => update('medicationDetails', v)}
            placeholder="e.g. Metformin 500mg, Atorvastatin 20mg..."
            rows={2}
          />
        </Field>
      )}
      <Field label="Current blood pressure (if known)">
        <TextInput value={data.bloodPressure} onChange={(v) => update('bloodPressure', v)} placeholder="e.g. 120/80" />
      </Field>

      <div className="h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />

      <Field label="Rate your interest in a detailed metabolic score description" hint="1 = Not interested  ·  5 = Very interested">
        <RatingScale value={data.descriptionInterest} onChange={(v) => update('descriptionInterest', v)} />
      </Field>
      <Field label="Rate your interest in metabolic health coaching" hint="1 = Not interested  ·  5 = Very interested">
        <RatingScale value={data.coachingInterest} onChange={(v) => update('coachingInterest', v)} />
      </Field>
      <Field label="Any additional information you'd like to share?">
        <TextArea
          value={data.additionalInfo}
          onChange={(v) => update('additionalInfo', v)}
          placeholder="Anything else that may be relevant to your metabolic health..."
          rows={2}
        />
      </Field>

      <div className="h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />

      <Field label="Disclaimer" required>
        <button
          type="button"
          onClick={() => update('disclaimerAccepted', !data.disclaimerAccepted)}
          className="flex items-start gap-3 text-left"
        >
          <span
            className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
            style={{
              background: data.disclaimerAccepted ? '#a4d65e' : 'transparent',
              border: `2px solid ${data.disclaimerAccepted ? '#a4d65e' : 'rgba(255,255,255,0.3)'}`,
            }}
          >
            {data.disclaimerAccepted && <Check size={12} color="#1a3a3a" strokeWidth={3} />}
          </span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            I acknowledge that the Meterbolic platform provides informational metabolic health insights and is not a substitute for professional medical advice, diagnosis, or treatment. I agree to the{' '}
            <span style={{ color: '#a4d65e' }}>Terms of Service</span> and <span style={{ color: '#a4d65e' }}>Privacy Policy</span>.
          </span>
        </button>
      </Field>

      <Field label="I consent to Meterbolic processing my health data for the purpose of generating my metabolic health assessment" required>
        <RadioGroup
          value={data.dataConsent}
          onChange={(v) => update('dataConsent', v)}
          options={['Yes, I consent', 'No, I do not consent']}
        />
      </Field>
    </div>
  );
}

// ─── Main Onboarding Page ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = getIdToken();
    if (!token) {
      router.replace('/');
      return;
    }
    if (localStorage.getItem('meo_onboarding_v1')) {
      router.replace('/');
    }
  }, []);

  const update = (k: keyof OnboardingData, v: any) => {
    setData((prev) => ({ ...prev, [k]: v }));
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!data.firstName.trim()) return 'Please enter your first name.';
      if (!data.lastName.trim()) return 'Please enter your last name.';
      if (!data.dob) return 'Please enter your date of birth.';
      if (!data.gender) return 'Please select your gender.';
      if (!data.postcode.trim()) return 'Please enter your postcode.';
      if (!data.phone.trim()) return 'Please enter your phone number.';
      if (!data.email.trim()) return 'Please enter your email address.';
    }
    if (step === 1) {
      if (!data.heardAbout) return 'Please tell us how you heard about Meterbolic.';
    }
    if (step === 2) {
      if (!data.healthConcerns.trim()) return 'Please describe your health concerns or objectives.';
      if (!data.sleepIssues) return 'Please answer the sleep issues question.';
    }
    if (step === 3) {
      if (!data.dietaryHistory.trim()) return 'Please describe your dietary history.';
      if (data.currentDietTypes.length === 0) return 'Please select at least one diet type.';
      if (!data.recarbProtocol) return 'Please confirm the recarb protocol commitment.';
    }
    if (step === 4) {
      if (!data.familyHistory) return 'Please answer the family history question.';
    }
    if (step === 5) {
      if (!data.resultsSharing) return 'Please select your results sharing preference.';
      if (!data.medicationYesNo) return 'Please answer the medication question.';
      if (!data.disclaimerAccepted) return 'Please accept the disclaimer to continue.';
      if (!data.dataConsent) return 'Please provide your consent to data processing.';
      if (data.dataConsent === 'No, I do not consent') return 'Data consent is required to use Meterbolic. Please contact support if you have questions.';
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    if (step < 5) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setError('');
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding: data }),
      });
    } catch {
      // Non-blocking — don't prevent the user from proceeding
    }
    localStorage.setItem('meo_onboarding_v1', '1');
    router.replace('/');
  };

  const stepComponents = [
    <Step1 key={0} data={data} update={update} />,
    <Step2 key={1} data={data} update={update} />,
    <Step3 key={2} data={data} update={update} />,
    <Step4 key={3} data={data} update={update} />,
    <Step5 key={4} data={data} update={update} />,
    <Step6 key={5} data={data} update={update} />,
  ];

  return (
    <div
      className="min-h-screen w-screen flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 flex-shrink-0"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <span className="text-lg font-bold" style={{ color: colors.primary }}>
          {theme.header}
        </span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Step {step + 1} of {STEP_TITLES.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 sm:px-6 flex-shrink-0">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: colors.primary }}
            initial={false}
            animate={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 mb-1">
          {STEP_TITLES.map((t, i) => (
            <span
              key={i}
              className="hidden sm:block"
              style={{ color: i === step ? colors.primary : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', fontSize: '11px' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Form card — full-width on mobile, max-w-2xl + padded on sm+ */}
      <div className="flex-1 overflow-y-auto py-3 sm:py-5 sm:px-4">
        <div
          className="mx-auto sm:rounded-2xl overflow-hidden"
          style={{
            background: colors.card,
            border: `1px solid ${colors.cardBorder}`,
            maxWidth: '42rem',
          }}
        >
          {/* Step title */}
          <div className="px-4 sm:px-6 pt-5 pb-3">
            <h1 className="text-lg sm:text-xl font-semibold" style={{ color: '#fff' }}>
              {STEP_TITLES[step]}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {step === 0 && 'Tell us a bit about yourself so we can personalise your experience.'}
              {step === 1 && 'Help us understand your current physical baseline.'}
              {step === 2 && "What brings you to Meterbolic? Let's understand your goals."}
              {step === 3 && 'Your eating patterns help us interpret your metabolic data more accurately.'}
              {step === 4 && 'Knowing your medical background helps us provide more relevant insights.'}
              {step === 5 && 'Final details — referral info and your consent to proceed.'}
            </p>
          </div>

          <div className="px-4 sm:px-6 pb-2">
            <div className="h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Animated step content */}
          <div className="px-4 sm:px-6 pb-5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {stepComponents[step]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-4 sm:mx-6 mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div
            className="px-4 sm:px-6 flex items-center justify-between gap-4"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-medium transition-all min-w-[80px]"
              style={{
                background: step === 0 ? 'transparent' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${step === 0 ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
                color: step === 0 ? 'transparent' : 'rgba(255,255,255,0.7)',
                pointerEvents: step === 0 ? 'none' : 'auto',
              }}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: colors.primary,
                color: colors.primaryForeground,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                'Saving...'
              ) : step === 5 ? (
                <>Complete <Check size={16} /></>
              ) : (
                <>Continue <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
