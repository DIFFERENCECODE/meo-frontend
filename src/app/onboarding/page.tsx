'use client';

/**
 * Onboarding — rebuilt to match meo-mobile's flow exactly (language ->
 * welcome/why-Meo/consent -> goal/basics/activity/insight/health-connect
 * wizard -> plan-generation reveal -> summary), replacing the previous
 * 6-step clinical intake form entirely. The clinical fields that form used
 * to collect (occupation, postcode, medical history, referral source,
 * etc.) now live at /profile/clinical-details -- reachable after onboarding,
 * never a blocking gate.
 *
 * Submission target is unchanged from the old form: PUT /api/profile with
 * { onboarding: {...} }, which chatbot-rag's /api/me MERGES into the
 * existing profile (fixed server-side this session) -- so this partial
 * payload can never clobber fields the clinical-details page writes later,
 * or vice versa.
 *
 * Plan math is the ported src/app/lib/planCalculator.ts -- byte-identical
 * formulas to mobile's, so the same answers produce the same targets on
 * either platform.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ArrowLeft, Activity, Check } from 'lucide-react';
import { useTranslation, useLanguage, type SupportedLang } from '@/i18n/LanguageContext';
import { apiFetch } from '@/app/lib/auth';
import {
  Goal,
  Sex,
  ActivityLevel,
  PlanTargets,
  ageFromDob,
  calculateBMR,
  computeCalorieIntelligence,
  computePlanTargets,
} from '@/app/lib/planCalculator';

const LANGUAGE_CONFIRMED_KEY = 'meo_onboarding_language_confirmed_v1';
const ONBOARDING_FLAG = 'meo_onboarding_v1';

const LANGUAGE_OPTIONS: { code: SupportedLang; native: string; english: string }[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch' },
];

const GOALS: { value: Goal; labelKey: string; subKey: string }[] = [
  { value: 'improve_metabolic_health', labelKey: 'onboarding.goal_metabolic_health', subKey: 'onboarding.goal_metabolic_health_sub' },
  { value: 'reduce_body_fat', labelKey: 'onboarding.goal_reduce_fat', subKey: 'onboarding.goal_reduce_fat_sub' },
  { value: 'build_muscle', labelKey: 'onboarding.goal_build_muscle', subKey: 'onboarding.goal_build_muscle_sub' },
  { value: 'improve_energy', labelKey: 'onboarding.goal_improve_energy', subKey: 'onboarding.goal_improve_energy_sub' },
  { value: 'support_blood_sugar', labelKey: 'onboarding.goal_blood_sugar', subKey: 'onboarding.goal_blood_sugar_sub' },
  { value: 'better_sleep', labelKey: 'onboarding.goal_better_sleep', subKey: 'onboarding.goal_better_sleep_sub' },
  { value: 'overall_wellness', labelKey: 'onboarding.goal_overall_wellness', subKey: 'onboarding.goal_overall_wellness_sub' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; labelKey: string; hintKey: string }[] = [
  { value: 'mostly_seated', labelKey: 'onboarding.activity_seated', hintKey: 'onboarding.activity_seated_hint' },
  { value: 'lightly_active', labelKey: 'onboarding.activity_light', hintKey: 'onboarding.activity_light_hint' },
  { value: 'frequently_moving', labelKey: 'onboarding.activity_moving', hintKey: 'onboarding.activity_moving_hint' },
  { value: 'physically_demanding', labelKey: 'onboarding.activity_demanding', hintKey: 'onboarding.activity_demanding_hint' },
];

const EXERCISE_FREQUENCY_OPTIONS = ['0', '1', '3', '5'];

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

interface Answers {
  primaryGoal: Goal | '';
  dob: string;
  sex: Sex | '';
  heightCm: string;
  weightKg: string;
  units: 'metric' | 'imperial';
  activityLevel: ActivityLevel | '';
  exerciseFrequencyPerWeek: string;
  disclaimerAccepted: boolean;
  dataConsent: boolean;
  planTargets: PlanTargets | null;
}

const EMPTY_ANSWERS: Answers = {
  primaryGoal: '',
  dob: '',
  sex: '',
  heightCm: '',
  weightKg: '',
  units: 'metric',
  activityLevel: '',
  exerciseFrequencyPerWeek: '0',
  disclaimerAccepted: false,
  dataConsent: false,
  planTargets: null,
};

type Phase = 'language' | 'welcome' | 'wizard' | 'plan' | 'summary';

// ── Shared visual tokens (matching SignInPanel/LandingPage's convention) ──
const PRIMARY = '#1a3a3a';
const ACCENT = '#a4d65e';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const ERROR = '#ef4444';

const inputClass = 'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors';
const inputStyle: React.CSSProperties = { borderColor: '#d1d5db', color: '#111827', fontSize: '16px' };
const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = ACCENT),
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = '#d1d5db'),
};

function PrimaryButton({ children, onClick, disabled, type = 'button' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      style={{ background: PRIMARY, color: '#ffffff' }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors hover:bg-gray-50"
      style={{ border: `1px solid ${BORDER}`, color: '#111827' }}
    >
      {children}
    </button>
  );
}

function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === active ? 20 : 6,
            height: 6,
            background: i === active ? ACCENT : BORDER,
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [phase, setPhase] = useState<Phase>('language');
  const [welcomePage, setWelcomePage] = useState(0); // 0 brand, 1 why-meo, 2 consent
  const [wizardStep, setWizardStep] = useState(0); // 0 goal, 1 basics, 2 activity, 3 insight, 4 health-connect
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLang>('en');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatingStage, setGeneratingStage] = useState(0); // 0-2 generating, 3 ready

  useEffect(() => {
    setSelectedLanguage(language);
    try {
      if (typeof window !== 'undefined' && window.localStorage.getItem(LANGUAGE_CONFIRMED_KEY)) {
        setPhase('welcome');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<Answers>) => setAnswers((prev) => ({ ...prev, ...patch }));

  // ── Plan-generation animation: purely cosmetic pacing, same as mobile --
  // the real computation is synchronous/instant. ──
  useEffect(() => {
    if (phase !== 'plan' || generatingStage >= 3) return;
    const id = setTimeout(() => setGeneratingStage((s) => s + 1), 1200);
    return () => clearTimeout(id);
  }, [phase, generatingStage]);

  useEffect(() => {
    if (phase !== 'plan') return;
    const targets = computePlanTargets({
      sex: answers.sex,
      dob: answers.dob,
      heightCm: parseFloat(answers.heightCm) || 0,
      weightKg: parseFloat(answers.weightKg) || 0,
      activityLevel: answers.activityLevel || 'lightly_active',
      exerciseFrequencyPerWeek: parseFloat(answers.exerciseFrequencyPerWeek) || 0,
      goal: answers.primaryGoal || 'improve_metabolic_health',
    });
    if (targets) update({ planTargets: targets });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Language ──
  const handleLanguageContinue = () => {
    setLanguage(selectedLanguage);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_CONFIRMED_KEY, '1');
    } catch {}
    setPhase('welcome');
  };

  // ── Welcome (3 pages) ──
  const canContinueConsent = answers.disclaimerAccepted && answers.dataConsent;
  const handleWelcomeNext = () => {
    if (welcomePage < 2) {
      setWelcomePage((p) => p + 1);
    } else {
      setPhase('wizard');
    }
  };
  const handleWelcomeBack = () => {
    if (welcomePage > 0) setWelcomePage((p) => p - 1);
  };

  // ── Wizard ──
  const isImperial = answers.units === 'imperial';
  const heightDisplay = useMemo(() => {
    const cm = parseFloat(answers.heightCm);
    if (!cm) return '';
    return isImperial ? (cm / CM_PER_INCH).toFixed(1) : String(cm);
  }, [answers.heightCm, isImperial]);
  const weightDisplay = useMemo(() => {
    const kg = parseFloat(answers.weightKg);
    if (!kg) return '';
    return isImperial ? (kg / KG_PER_LB).toFixed(1) : String(kg);
  }, [answers.weightKg, isImperial]);

  const setHeightFromDisplay = (val: string) => {
    const n = parseFloat(val);
    if (!val) { update({ heightCm: '' }); return; }
    if (isNaN(n)) return;
    update({ heightCm: String(isImperial ? n * CM_PER_INCH : n) });
  };
  const setWeightFromDisplay = (val: string) => {
    const n = parseFloat(val);
    if (!val) { update({ weightKg: '' }); return; }
    if (isNaN(n)) return;
    update({ weightKg: String(isImperial ? n * KG_PER_LB : n) });
  };

  const isValidDob = (dob: string): boolean => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
    if (!m) return false;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return false;
    if (d > new Date()) return false;
    const age = ageFromDob(dob);
    return age != null && age >= 13 && age <= 120;
  };

  const validateWizardStep = (): string => {
    if (wizardStep === 0 && !answers.primaryGoal) return t('onboarding.err_select_goal');
    if (wizardStep === 1) {
      if (!answers.dob || !isValidDob(answers.dob)) return t('onboarding.err_valid_dob');
      if (!answers.sex) return t('onboarding.err_select_sex');
      if (!(parseFloat(answers.heightCm) > 0)) return t('onboarding.err_valid_height');
      if (!(parseFloat(answers.weightKg) > 0)) return t('onboarding.err_valid_weight');
    }
    if (wizardStep === 2 && !answers.activityLevel) return t('onboarding.err_select_activity');
    return '';
  };

  const handleWizardNext = () => {
    const err = validateWizardStep();
    if (err) { setError(err); return; }
    setError('');
    if (wizardStep < 4) {
      setWizardStep((s) => s + 1);
    } else {
      setPhase('plan');
    }
  };
  const handleWizardBack = () => {
    setError('');
    if (wizardStep > 0) setWizardStep((s) => s - 1);
  };

  // ── Submission ──
  const submitAndFinish = async () => {
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          onboarding: {
            primaryGoal: answers.primaryGoal,
            dob: answers.dob,
            sex: answers.sex,
            heightCm: answers.heightCm,
            weightKg: answers.weightKg,
            activityLevel: answers.activityLevel,
            exerciseFrequencyPerWeek: answers.exerciseFrequencyPerWeek,
            disclaimerAccepted: answers.disclaimerAccepted,
            dataConsent: answers.dataConsent,
            planTargets: answers.planTargets,
          },
        }),
      });
    } catch {
      // Best-effort, same fail-open stance as mobile's submitOnboardingWithRetry
      // -- the user's answers are already computed/shown; a sync failure
      // here shouldn't block them from entering the app.
    } finally {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(ONBOARDING_FLAG, '1');
      } catch {}
      setSubmitting(false);
      router.replace('/');
    }
  };

  const goalMeta = GOALS.find((g) => g.value === answers.primaryGoal);
  const insight = useMemo(() => {
    return computeCalorieIntelligence({
      sex: answers.sex,
      dob: answers.dob,
      heightCm: parseFloat(answers.heightCm) || 0,
      weightKg: parseFloat(answers.weightKg) || 0,
      activityLevel: answers.activityLevel,
      exerciseFrequencyPerWeek: parseFloat(answers.exerciseFrequencyPerWeek) || 0,
      goal: answers.primaryGoal,
    });
  }, [answers]);
  const bmr = useMemo(() => {
    const age = ageFromDob(answers.dob);
    if (age == null || !answers.sex || !(parseFloat(answers.heightCm) > 0) || !(parseFloat(answers.weightKg) > 0)) return null;
    return Math.round(calculateBMR(answers.sex, parseFloat(answers.weightKg), parseFloat(answers.heightCm), age));
  }, [answers]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: '#f9fafb' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8" style={{ border: `1px solid ${BORDER}` }}>
        {phase === 'language' && (
          <>
            <div className="flex items-center gap-2 mb-8">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: PRIMARY }}>
                <Activity className="h-4 w-4" style={{ color: ACCENT }} />
              </div>
              <span className="text-base font-bold tracking-tight" style={{ color: PRIMARY }}>Meterbolic</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Choose your preferred language</h1>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Meo will use this language throughout the app. You can change it anytime in Settings.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setSelectedLanguage(opt.code)}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: selectedLanguage === opt.code ? ACCENT : BORDER,
                    background: selectedLanguage === opt.code ? '#f7fbef' : '#ffffff',
                  }}
                >
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#111827' }}>{opt.native}</div>
                    <div className="text-xs" style={{ color: MUTED }}>{opt.english}</div>
                  </div>
                  {selectedLanguage === opt.code && <Check className="h-4 w-4" style={{ color: ACCENT }} />}
                </button>
              ))}
            </div>
            <div className="mt-8">
              <PrimaryButton onClick={handleLanguageContinue}>
                Continue <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </>
        )}

        {phase === 'welcome' && welcomePage === 0 && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-6" style={{ background: PRIMARY }}>
              <Activity className="h-8 w-8" style={{ color: ACCENT }} />
            </div>
            <p className="text-xs" style={{ color: MUTED }}>{t('onboarding.welcome_brand_by')}</p>
            <h1 className="mt-3 text-2xl font-bold" style={{ color: '#111827' }}>{t('onboarding.welcome_headline')}</h1>
            <p className="mt-3 text-sm" style={{ color: MUTED }}>{t('onboarding.welcome_subline')}</p>
            <div className="mt-10 w-full">
              <PrimaryButton onClick={handleWelcomeNext}>
                {t('onboarding.continue')} <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </div>
        )}

        {phase === 'welcome' && welcomePage === 1 && (
          <>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.why_meo_title')}</h1>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>{t('onboarding.why_meo_body')}</p>
            <div className="mt-6">
              <h2 className="text-base font-bold" style={{ color: '#111827' }}>{t('onboarding.why_meo_plan_title')}</h2>
              <p className="mt-2 text-sm" style={{ color: MUTED }}>{t('onboarding.why_meo_plan_body')}</p>
            </div>
            <div className="mt-10 flex gap-3">
              <div className="w-1/3">
                <SecondaryButton onClick={handleWelcomeBack}><ArrowLeft className="h-4 w-4" /></SecondaryButton>
              </div>
              <div className="flex-1">
                <PrimaryButton onClick={handleWelcomeNext}>{t('onboarding.continue')} <ArrowRight className="h-4 w-4" /></PrimaryButton>
              </div>
            </div>
          </>
        )}

        {phase === 'welcome' && welcomePage === 2 && (
          <>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.welcome_why_title')}</h1>
            <div className="mt-5 flex flex-col gap-4">
              {[
                ['onboarding.welcome_why_measurements_title', 'onboarding.welcome_why_measurements_body'],
                ['onboarding.welcome_why_lifestyle_title', 'onboarding.welcome_why_lifestyle_body'],
                ['onboarding.welcome_why_context_title', 'onboarding.welcome_why_context_body'],
                ['onboarding.welcome_why_privacy_title', 'onboarding.welcome_why_privacy_body'],
              ].map(([titleKey, bodyKey]) => (
                <div key={titleKey} className="border-b pb-3" style={{ borderColor: BORDER }}>
                  <div className="text-sm font-semibold" style={{ color: '#111827' }}>{t(titleKey)}</div>
                  <div className="text-xs mt-1" style={{ color: MUTED }}>{t(bodyKey)}</div>
                </div>
              ))}
            </div>
            <label className="mt-5 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={canContinueConsent}
                onChange={(e) => update({ disclaimerAccepted: e.target.checked, dataConsent: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded"
                style={{ accentColor: ACCENT }}
              />
              <span className="text-xs" style={{ color: MUTED }}>{t('onboarding.welcome_consent_text')}</span>
            </label>
            {/* Health data is special-category data under UK GDPR; link to
                the public trust page rather than re-stating its claims here. */}
            <p className="mt-3 text-xs" style={{ color: MUTED }}>
              Your health data is special-category data under UK GDPR.{' '}
              <a
                href="https://meterbolic.com/trust"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#1a3a3a', fontWeight: 600 }}
              >
                How we protect it
              </a>
            </p>
            <div className="mt-8 flex gap-3">
              <div className="w-1/3">
                <SecondaryButton onClick={handleWelcomeBack}><ArrowLeft className="h-4 w-4" /></SecondaryButton>
              </div>
              <div className="flex-1">
                <PrimaryButton onClick={handleWelcomeNext} disabled={!canContinueConsent}>
                  {t('onboarding.welcome_start_personalization')} <ArrowRight className="h-4 w-4" />
                </PrimaryButton>
              </div>
            </div>
            <p className="mt-4 text-xs text-center" style={{ color: '#9ca3af' }}>{t('onboarding.welcome_privacy_footer')}</p>
          </>
        )}

        {phase === 'wizard' && (
          <>
            <ProgressDots total={5} active={wizardStep} />

            {wizardStep === 0 && (
              <>
                <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.wizard_step1_title')}</h1>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>{t('onboarding.wizard_step1_subtitle')}</p>
                <div className="mt-5 flex flex-col gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => update({ primaryGoal: g.value })}
                      className="flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors"
                      style={{
                        borderColor: answers.primaryGoal === g.value ? ACCENT : BORDER,
                        background: answers.primaryGoal === g.value ? '#f7fbef' : '#ffffff',
                      }}
                    >
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#111827' }}>{t(g.labelKey)}</div>
                        <div className="text-xs mt-0.5" style={{ color: MUTED }}>{t(g.subKey)}</div>
                      </div>
                      {answers.primaryGoal === g.value && <Check className="h-4 w-4 flex-shrink-0" style={{ color: ACCENT }} />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {wizardStep === 1 && (
              <>
                <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.wizard_step2_title')}</h1>
                <p className="mt-1 mb-5 text-sm" style={{ color: MUTED }}>{t('onboarding.wizard_step2_subtitle')}</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#374151' }}>{t('onboarding.field_dob')}</label>
                    <input
                      type="date"
                      value={answers.dob}
                      onChange={(e) => update({ dob: e.target.value })}
                      max={new Date().toISOString().slice(0, 10)}
                      className={`${inputClass} mt-1.5`}
                      style={inputStyle}
                      {...focusHandlers}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#374151' }}>{t('onboarding.field_sex')}</label>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {(['female', 'male', 'other'] as Sex[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => update({ sex: s })}
                          className="rounded-lg border py-2 text-sm font-medium transition-colors"
                          style={{
                            borderColor: answers.sex === s ? ACCENT : BORDER,
                            background: answers.sex === s ? '#f7fbef' : '#ffffff',
                            color: '#111827',
                          }}
                        >
                          {t(`onboarding.sex_${s}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#374151' }}>{t('onboarding.field_units')}</label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {(['metric', 'imperial'] as const).map((u) => (
                        <button
                          key={u}
                          onClick={() => update({ units: u })}
                          className="rounded-lg border py-2 text-sm font-medium transition-colors"
                          style={{
                            borderColor: answers.units === u ? ACCENT : BORDER,
                            background: answers.units === u ? '#f7fbef' : '#ffffff',
                            color: '#111827',
                          }}
                        >
                          {t(u === 'metric' ? 'onboarding.units_metric' : 'onboarding.units_imperial')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium" style={{ color: '#374151' }}>
                        {t('onboarding.field_height')} ({isImperial ? t('onboarding.unit_in') : 'cm'})
                      </label>
                      <input
                        type="number"
                        value={heightDisplay}
                        onChange={(e) => setHeightFromDisplay(e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        style={inputStyle}
                        {...focusHandlers}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium" style={{ color: '#374151' }}>
                        {t('onboarding.field_weight')} ({isImperial ? t('onboarding.unit_lb') : 'kg'})
                      </label>
                      <input
                        type="number"
                        value={weightDisplay}
                        onChange={(e) => setWeightFromDisplay(e.target.value)}
                        className={`${inputClass} mt-1.5`}
                        style={inputStyle}
                        {...focusHandlers}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {wizardStep === 2 && (
              <>
                <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.wizard_step4_title')}</h1>
                <p className="mt-1 mb-5 text-sm" style={{ color: MUTED }}>{t('onboarding.wizard_step4_subtitle')}</p>
                <div className="flex flex-col gap-2">
                  {ACTIVITY_LEVELS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => update({ activityLevel: a.value })}
                      className="flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors"
                      style={{
                        borderColor: answers.activityLevel === a.value ? ACCENT : BORDER,
                        background: answers.activityLevel === a.value ? '#f7fbef' : '#ffffff',
                      }}
                    >
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#111827' }}>{t(a.labelKey)}</div>
                        <div className="text-xs mt-0.5" style={{ color: MUTED }}>{t(a.hintKey)}</div>
                      </div>
                      {answers.activityLevel === a.value && <Check className="h-4 w-4 flex-shrink-0" style={{ color: ACCENT }} />}
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  <label className="text-sm font-medium" style={{ color: '#374151' }}>{t('onboarding.field_exercise_frequency')}</label>
                  <select
                    value={answers.exerciseFrequencyPerWeek}
                    onChange={(e) => update({ exerciseFrequencyPerWeek: e.target.value })}
                    className={`${inputClass} mt-1.5`}
                    style={inputStyle}
                  >
                    {EXERCISE_FREQUENCY_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {wizardStep === 3 && (
              <div className="py-4">
                <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.wizard_insight_title')}</h1>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>{t('onboarding.wizard_insight_subtitle')}</p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{t('onboarding.insight_starting_point_label')}</p>
                {bmr != null && insight ? (
                  <>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm" style={{ color: MUTED }}>{t('onboarding.insight_bmr_label')}</span>
                      <span className="text-base font-semibold" style={{ color: '#111827' }}>{bmr} {t('onboarding.plan_kcal')}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm" style={{ color: MUTED }}>{t('onboarding.insight_calories_label')}</span>
                      <span className="text-xl font-bold" style={{ color: PRIMARY }}>{insight.dailyCalories} {t('onboarding.plan_kcal')}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm" style={{ color: MUTED }}>{t('onboarding.insight_unavailable')}</p>
                )}
                <p className="mt-6 text-xs" style={{ color: '#9ca3af' }}>{t('onboarding.insight_footer')}</p>
              </div>
            )}

            {wizardStep === 4 && (
              <>
                <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.wizard_health_title')}</h1>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>{t('onboarding.wizard_health_subtitle')}</p>
                <div className="mt-4 flex flex-col gap-2">
                  {['health_why_1', 'health_why_2', 'health_why_3'].map((k) => (
                    <div key={k} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
                      <span className="text-sm" style={{ color: '#374151' }}>{t(`onboarding.${k}`)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>{t('onboarding.health_access_title')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['steps', 'sleep', 'heart_rate', 'workouts', 'weight'].map((k) => (
                    <span key={k} className="text-xs px-3 py-1.5 rounded-full" style={{ background: '#f3f4f6', color: '#374151' }}>
                      {t(`onboarding.health_access_${k}`)}
                    </span>
                  ))}
                </div>
                <div
                  className="mt-5 rounded-lg px-4 py-3 text-xs"
                  style={{ background: '#f7fbef', color: '#374151', border: `1px solid ${ACCENT}40` }}
                >
                  {t('onboarding.health_web_note')}
                </div>
              </>
            )}

            {error && <p className="mt-4 text-xs" style={{ color: ERROR }}>{error}</p>}

            <div className="mt-8 flex gap-3">
              {wizardStep > 0 && (
                <div className="w-1/3">
                  <SecondaryButton onClick={handleWizardBack}><ArrowLeft className="h-4 w-4" /></SecondaryButton>
                </div>
              )}
              <div className="flex-1">
                <PrimaryButton onClick={handleWizardNext}>
                  {wizardStep === 4 ? t('onboarding.complete_setup') : t('onboarding.continue')} <ArrowRight className="h-4 w-4" />
                </PrimaryButton>
              </div>
            </div>
          </>
        )}

        {phase === 'plan' && generatingStage < 3 && (
          <div className="flex flex-col items-center text-center py-10">
            <Loader2 className="h-10 w-10 animate-spin mb-6" style={{ color: PRIMARY }} />
            <h1 className="text-lg font-bold" style={{ color: '#111827' }}>{t('onboarding.plan_generating_title')}</h1>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              {t(['onboarding.plan_generating_1', 'onboarding.plan_generating_2', 'onboarding.plan_generating_3'][generatingStage])}
            </p>
          </div>
        )}

        {phase === 'plan' && generatingStage >= 3 && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ background: '#f0fdf4' }}>
                <Check className="h-7 w-7" style={{ color: '#16a34a' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('onboarding.plan_ready_title')}</h1>
            </div>
            {answers.planTargets ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BORDER }}>
                  <span className="text-sm" style={{ color: MUTED }}>{t('onboarding.plan_daily_calories')}</span>
                  <span className="text-lg font-bold" style={{ color: PRIMARY }}>{answers.planTargets.dailyCalories} {t('onboarding.plan_kcal')}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center border-b pb-3" style={{ borderColor: BORDER }}>
                  {[
                    ['onboarding.plan_protein', answers.planTargets.proteinG],
                    ['onboarding.plan_carbs', answers.planTargets.carbsG],
                    ['onboarding.plan_fat', answers.planTargets.fatG],
                    ['onboarding.plan_fiber', answers.planTargets.fiberG],
                  ].map(([key, val]) => (
                    <div key={key as string}>
                      <div className="text-sm font-semibold" style={{ color: '#111827' }}>{val}g</div>
                      <div className="text-[10px]" style={{ color: MUTED }}>{t(key as string)}</div>
                    </div>
                  ))}
                </div>
                {[
                  ['onboarding.plan_water', `${answers.planTargets.waterL} L`],
                  ['onboarding.plan_steps', `${answers.planTargets.stepsPerDay}`],
                  ['onboarding.plan_sleep', `${answers.planTargets.sleepHoursMin}–${answers.planTargets.sleepHoursMax} ${t('onboarding.plan_hours')}`],
                  ['onboarding.plan_activity', `${answers.planTargets.activityMinutesPerWeek} ${t('onboarding.plan_min_per_week')}`],
                ].map(([key, val]) => (
                  <div key={key as string} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: MUTED }}>{t(key as string)}</span>
                    <span className="text-sm font-semibold" style={{ color: '#111827' }}>{val as string}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center" style={{ color: MUTED }}>{t('onboarding.plan_unavailable')}</p>
            )}
            <div className="mt-8">
              <PrimaryButton onClick={() => setPhase('summary')}>
                {t('onboarding.plan_view_my_plan')} <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </>
        )}

        {phase === 'summary' && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-6" style={{ background: PRIMARY }}>
              <Activity className="h-8 w-8" style={{ color: ACCENT }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t('welcome_summary.heading')}</h1>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>{t('welcome_summary.subheading')}</p>
            {goalMeta && (
              <div className="mt-6 w-full rounded-lg border px-4 py-3 text-left" style={{ borderColor: BORDER }}>
                <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>{t('welcome_summary.summary_title')}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs" style={{ color: MUTED }}>{t('welcome_summary.goal_label')}</span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>{t(goalMeta.labelKey)}</span>
                </div>
              </div>
            )}
            <div className="mt-8 w-full">
              <PrimaryButton onClick={submitAndFinish} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t('welcome_summary.cta')} <ArrowRight className="h-4 w-4" /></>}
              </PrimaryButton>
            </div>
            <p className="mt-4 text-xs" style={{ color: '#9ca3af' }}>{t('welcome_summary.privacy_note')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
