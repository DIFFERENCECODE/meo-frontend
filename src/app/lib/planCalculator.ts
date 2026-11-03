/**
 * planCalculator — derives the onboarding "starting plan" (daily calories,
 * macros, water, steps, sleep) purely from the onboarding wizard's answers.
 * Runs entirely client-side: no backend call, no BAS/VAT/indices.py
 * involvement, no clinical claim -- these are standard, widely-published
 * fitness/nutrition formulas (Mifflin-St Jeor BMR, activity-multiplier TDEE,
 * goal-based calorie adjustment, g/kg macro splits), the same category of
 * "reasonable general default" any fitness app uses, not a diagnostic
 * result like BAS.
 *
 * Ported verbatim from meo-mobile's src/health/planCalculator.ts (same
 * formulas, same constants, same function names) so the web app's plan
 * targets are IDENTICAL to what the same answers would produce on iOS/
 * Android -- a user switching platforms mid-journey sees the same numbers.
 * The Goal/Sex/ActivityLevel/PlanTargets types (previously defined in
 * mobile's onboardingStore.ts, a Zustand store this app has no equivalent
 * of) are defined here instead, as the single source of truth for web's
 * onboarding wizard.
 *
 * Every adjustment is intentionally modest (max ~20% calorie deficit/
 * surplus, floor at a standard 1200 kcal minimum) -- never an extreme or
 * personalized-beyond-inputs number.
 */

export type Sex = 'female' | 'male' | 'other';

export type Goal =
  | 'improve_metabolic_health'
  | 'reduce_body_fat'
  | 'build_muscle'
  | 'improve_energy'
  | 'support_blood_sugar'
  | 'better_sleep'
  | 'overall_wellness'
  // Deprecated goals, kept only so a value stored by an older client (or
  // ported from mobile's own deprecated list) still resolves to a real
  // lookup entry instead of undefined -- never offered as a selectable
  // option in this app's wizard.
  | 'maintain_weight'
  | 'understand_health_data';

export type ActivityLevel = 'mostly_seated' | 'lightly_active' | 'frequently_moving' | 'physically_demanding';

export interface PlanTargets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterL: number;
  stepsPerDay: number;
  sleepHoursMin: number;
  sleepHoursMax: number;
  activityMinutesPerWeek: number;
}

export interface PlanCalculatorInput {
  sex: Sex | '';
  dob: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel | '';
  exerciseFrequencyPerWeek: number;
  goal: Goal | '';
}

const MIN_SAFE_CALORIES = 1200;

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  mostly_seated: 1.2,
  lightly_active: 1.375,
  frequently_moving: 1.55,
  physically_demanding: 1.725,
};

const STEPS_BASELINE: Record<ActivityLevel, number> = {
  mostly_seated: 6000,
  lightly_active: 8000,
  frequently_moving: 10000,
  physically_demanding: 12000,
};

// Modest, capped calorie adjustment from TDEE per stated goal -- never an
// extreme deficit/surplus regardless of inputs.
const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  reduce_body_fat: -0.2,
  build_muscle: 0.12,
  improve_metabolic_health: -0.1,
  support_blood_sugar: -0.1,
  improve_energy: 0,
  better_sleep: 0,
  overall_wellness: 0,
  maintain_weight: 0,
  understand_health_data: 0,
};

const GOAL_PROTEIN_G_PER_KG: Record<Goal, number> = {
  build_muscle: 2.0,
  reduce_body_fat: 1.8,
  improve_metabolic_health: 1.6,
  support_blood_sugar: 1.6,
  improve_energy: 1.6,
  better_sleep: 1.6,
  overall_wellness: 1.6,
  maintain_weight: 1.6,
  understand_health_data: 1.6,
};

const FAT_PERCENT_OF_CALORIES = 0.28;

export function ageFromDob(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob ?? '').trim());
  if (!m) return null;
  const dobDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  let age = now.getFullYear() - dobDate.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < dobDate.getMonth() ||
    (now.getMonth() === dobDate.getMonth() && now.getDate() < dobDate.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
}

// Mifflin-St Jeor. 'other' uses the midpoint of the male/female constant
// terms, a neutral fallback rather than guessing.
export function calculateBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel, exerciseFrequencyPerWeek: number): number {
  const base = bmr * ACTIVITY_MULTIPLIER[activityLevel];
  // Small additive nudge for stated exercise frequency beyond a 2x/week
  // baseline already implied by the activity-level multiplier, capped at
  // +10% so it never compounds into an extreme number.
  const extraSessions = Math.max(0, exerciseFrequencyPerWeek - 2);
  const nudge = Math.min(0.1, extraSessions * 0.02);
  return base * (1 + nudge);
}

export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  const adjusted = tdee * (1 + GOAL_CALORIE_ADJUSTMENT[goal]);
  return Math.max(MIN_SAFE_CALORIES, Math.round(adjusted));
}

export type CalorieGoalDirection = 'loss' | 'maintenance' | 'gain';

export interface CalorieIntelligence {
  direction: CalorieGoalDirection;
  dailyCalories: number;
  /** |dailyCalories - TDEE|, rounded -- the deficit (loss) or surplus (gain)
   * actually applied, AFTER the MIN_SAFE_CALORIES floor. Always 0 for
   * 'maintenance'. */
  deltaKcal: number;
}

// Sub-1kcal rounding noise from the TDEE formula's own floating-point math
// must not read as a "1 kcal deficit" -- only a real, goal-driven
// adjustment counts as loss/gain.
const MAINTENANCE_EPSILON_KCAL = 1;

function calorieDirectionAndDelta(tdee: number, dailyCalories: number): { direction: CalorieGoalDirection; deltaKcal: number } {
  const raw = dailyCalories - tdee;
  if (raw <= -MAINTENANCE_EPSILON_KCAL) return { direction: 'loss', deltaKcal: Math.round(Math.abs(raw)) };
  if (raw >= MAINTENANCE_EPSILON_KCAL) return { direction: 'gain', deltaKcal: Math.round(Math.abs(raw)) };
  return { direction: 'maintenance', deltaKcal: 0 };
}

export function computeCalorieIntelligence(input: PlanCalculatorInput): CalorieIntelligence | null {
  const age = ageFromDob(input.dob);
  if (
    age == null ||
    !input.sex ||
    !input.activityLevel ||
    !input.goal ||
    !(input.heightCm > 0) ||
    !(input.weightKg > 0)
  ) {
    return null;
  }

  const bmr = calculateBMR(input.sex, input.weightKg, input.heightCm, age);
  const tdee = calculateTDEE(bmr, input.activityLevel, input.exerciseFrequencyPerWeek);
  const dailyCalories = calculateCalorieTarget(tdee, input.goal);
  return { dailyCalories, ...calorieDirectionAndDelta(tdee, dailyCalories) };
}

export interface MacroTargets {
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
}

export function calculateMacros(calorieTarget: number, weightKg: number, goal: Goal): MacroTargets {
  const proteinG = Math.round(weightKg * GOAL_PROTEIN_G_PER_KG[goal]);
  const fatG = Math.round((calorieTarget * FAT_PERCENT_OF_CALORIES) / 9);
  const proteinCalories = proteinG * 4;
  const fatCalories = fatG * 9;
  const carbsG = Math.max(0, Math.round((calorieTarget - proteinCalories - fatCalories) / 4));
  // Widely-cited general fiber guideline (~14g per 1000 kcal), not a
  // personalized figure.
  const fiberG = Math.round((calorieTarget / 1000) * 14);
  return { proteinG, fatG, carbsG, fiberG };
}

export function calculateWaterTarget(weightKg: number, activityLevel: ActivityLevel): number {
  const base = weightKg * 0.033;
  const activityBoost = activityLevel === 'physically_demanding' ? 0.5 : activityLevel === 'frequently_moving' ? 0.25 : 0;
  return Math.round((base + activityBoost) * 10) / 10;
}

export function calculateStepsTarget(activityLevel: ActivityLevel): number {
  return STEPS_BASELINE[activityLevel];
}

export function calculateActivityMinutesTarget(exerciseFrequencyPerWeek: number): number {
  return Math.max(90, exerciseFrequencyPerWeek * 30);
}

export function computePlanTargets(input: PlanCalculatorInput): PlanTargets | null {
  const age = ageFromDob(input.dob);
  if (
    age == null ||
    !input.sex ||
    !input.activityLevel ||
    !input.goal ||
    !(input.heightCm > 0) ||
    !(input.weightKg > 0)
  ) {
    return null;
  }

  const bmr = calculateBMR(input.sex, input.weightKg, input.heightCm, age);
  const tdee = calculateTDEE(bmr, input.activityLevel, input.exerciseFrequencyPerWeek);
  const dailyCalories = calculateCalorieTarget(tdee, input.goal);
  const macros = calculateMacros(dailyCalories, input.weightKg, input.goal);
  const waterL = calculateWaterTarget(input.weightKg, input.activityLevel);
  const stepsPerDay = calculateStepsTarget(input.activityLevel);
  const activityMinutesPerWeek = calculateActivityMinutesTarget(input.exerciseFrequencyPerWeek);

  return {
    dailyCalories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: macros.fiberG,
    waterL,
    stepsPerDay,
    sleepHoursMin: 7,
    sleepHoursMax: 9,
    activityMinutesPerWeek,
  };
}

// Same field-derivation helpers meo-mobile's planCalculator.ts uses to
// recompute targets on demand from a saved onboarding blob (rather than
// persisting the ephemeral computed value) -- reused here so the future
// "My Plan" / profile pages on web can do the same, from the exact same
// /api/me onboarding shape mobile writes.
const GENDER_TO_SEX: Record<string, Sex> = { Male: 'male', Female: 'female', Other: 'other' };

function deriveSexFromOnboarding(onboarding: Record<string, any>): Sex | '' {
  if (typeof onboarding.sex === 'string' && onboarding.sex) return onboarding.sex as Sex;
  const mapped = typeof onboarding.gender === 'string' ? GENDER_TO_SEX[onboarding.gender] : undefined;
  return mapped || '';
}

function planCalculatorInputFromOnboarding(onboarding: Record<string, any>): PlanCalculatorInput {
  return {
    sex: deriveSexFromOnboarding(onboarding),
    dob: typeof onboarding.dob === 'string' ? onboarding.dob : '',
    heightCm: parseFloat(onboarding.heightCm) || 0,
    weightKg: parseFloat(onboarding.weightKg) || 0,
    activityLevel: (onboarding.activityLevel as ActivityLevel) || '',
    exerciseFrequencyPerWeek: parseFloat(onboarding.exerciseFrequencyPerWeek) || 0,
    goal: (onboarding.primaryGoal as Goal) || '',
  };
}

export function computePlanTargetsFromOnboarding(
  onboarding: Record<string, any> | null | undefined,
): PlanTargets | null {
  if (!onboarding) return null;
  return computePlanTargets(planCalculatorInputFromOnboarding(onboarding));
}

export function computeCalorieIntelligenceFromOnboarding(
  onboarding: Record<string, any> | null | undefined,
): CalorieIntelligence | null {
  if (!onboarding) return null;
  return computeCalorieIntelligence(planCalculatorInputFromOnboarding(onboarding));
}
