export interface Therapist {
  id: string;
  name: string;
  title: string;
  category: 'metabolic' | 'mental-health' | 'lifestyle';
  specialties: string[];
  credentials: string[];
  bio: string;
  longBio: string;
  rating: number;
  reviews: number;
  pricePerSession: number;
  sessionLength: number;
  nextAvailable: string;
  avatar: string;
  avatarColor: string;
  tags: string[];
  approach: string[];
  conditions: string[];
}

export const THERAPISTS: Therapist[] = [
  {
    id: 'sarah-okonkwo',
    name: 'Sarah Okonkwo',
    title: 'BANT Registered Nutritional Therapist',
    category: 'metabolic',
    specialties: ['Metabolic Health', 'Insulin Resistance', 'Weight Management'],
    credentials: ['BANT', 'CNHC', 'mBANT'],
    bio: 'Specialising in metabolic dysfunction and insulin resistance for over 8 years. Works with clients to reverse type 2 diabetes risk through targeted nutrition and lifestyle protocols.',
    longBio: 'Sarah has spent over 8 years working exclusively in the field of metabolic dysfunction and insulin resistance. She earned her Nutritional Therapy diploma from the Institute for Optimum Nutrition and holds full BANT and CNHC registration. Her clinical approach centres on the Kraft Oral Insulin Assay — she was among the first BANT practitioners in the UK to integrate Kraft testing into her practice, having trained directly under experts in metabolic medicine. Sarah works with clients to map their postprandial insulin patterns, identify the earliest markers of metabolic dysfunction, and reverse type 2 diabetes risk through targeted dietary and lifestyle interventions. She is particularly experienced with clients who have PCOS, non-alcoholic fatty liver disease, and cardiometabolic syndrome.',
    rating: 4.9,
    reviews: 142,
    pricePerSession: 120,
    sessionLength: 60,
    nextAvailable: 'Tomorrow',
    avatar: 'SO',
    avatarColor: '#22c55e',
    tags: ['Kraft Protocol', 'Low-Carb', 'Fasting'],
    approach: ['Nutritional Therapy', 'Functional Lab Testing', 'Low-Carbohydrate Protocols', 'Time-Restricted Eating'],
    conditions: ['Type 2 Diabetes Risk', 'PCOS', 'Insulin Resistance', 'NAFLD', 'Metabolic Syndrome'],
  },
  {
    id: 'james-whitfield',
    name: 'James Whitfield',
    title: 'Functional Medicine Practitioner',
    category: 'metabolic',
    specialties: ['Biological Age Optimisation', 'Gut Health', 'Hormonal Balance'],
    credentials: ['IFMCP', 'BANT', 'BSc Nutritional Medicine'],
    bio: 'Functional medicine approach to ageing and metabolic health. Interprets Kraft test results and BAS scores in the context of full-body systems to build personalised protocols.',
    longBio: 'James holds an Institute for Functional Medicine Certified Practitioner (IFMCP) designation alongside a BSc in Nutritional Medicine. His practice is centred on healthy longevity — specifically the intersection of metabolic age, gut microbiome health, and hormonal resilience as drivers of biological ageing. He uses the Meo Biological Age Score as a clinical anchor point, working backwards from the score to identify the root causes contributing to accelerated ageing: insulin dysregulation, gut permeability, mitochondrial dysfunction, and chronic inflammation. James applies the functional medicine matrix to build personalised multi-system protocols and works closely with clients on 6–12 month transformation programmes.',
    rating: 4.8,
    reviews: 98,
    pricePerSession: 150,
    sessionLength: 60,
    nextAvailable: 'Today 4pm',
    avatar: 'JW',
    avatarColor: '#a3e635',
    tags: ['BAS Optimisation', 'Longevity', 'Hormones'],
    approach: ['Functional Medicine Matrix', 'Advanced Lab Interpretation', 'Gut Microbiome Testing', 'Hormone Optimisation'],
    conditions: ['Biological Ageing', 'Gut Dysbiosis', 'Hormonal Imbalance', 'Chronic Fatigue', 'Cardiovascular Risk'],
  },
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    title: 'Clinical Nutritionist & Health Coach',
    category: 'lifestyle',
    specialties: ['Visceral Fat Reduction', 'Lifestyle Medicine', 'Stress & Metabolism'],
    credentials: ['ANutr', 'CNHC', 'MSc Clinical Nutrition'],
    bio: 'Combines clinical nutrition with behaviour change coaching. Helps clients understand their metabolic data and build sustainable habits that stick long-term.',
    longBio: 'Priya completed her MSc in Clinical Nutrition at King\'s College London and holds full CNHC registration as a Nutritional Therapist. What sets her apart is her dual expertise in clinical nutrition and behaviour change psychology — she is trained in Motivational Interviewing and Acceptance and Commitment Therapy (ACT) approaches applied to health behaviour. Priya works with clients who have struggled to sustain changes despite knowing what to do. She specialises in understanding how stress hormones (cortisol, adrenaline) directly impact metabolic markers, visceral fat accumulation, and METS-IR scores, and helps clients break the stress–fat–inflammation cycle through both nutritional and psychological strategies.',
    rating: 4.9,
    reviews: 211,
    pricePerSession: 95,
    sessionLength: 50,
    nextAvailable: 'Thu 10am',
    avatar: 'PS',
    avatarColor: '#facc15',
    tags: ['Behaviour Change', 'METS-IR', 'Mindful Eating'],
    approach: ['Behaviour Change Coaching', 'Motivational Interviewing', 'Stress Management', 'Mindful Eating'],
    conditions: ['Visceral Fat', 'Emotional Eating', 'Stress-Related Weight Gain', 'Burnout', 'Metabolic Syndrome'],
  },
  {
    id: 'tom-gallagher',
    name: 'Tom Gallagher',
    title: 'Metabolic Health Coach',
    category: 'metabolic',
    specialties: ['Exercise Metabolism', 'CGM Interpretation', 'Body Composition'],
    credentials: ['MSc Sports Nutrition', 'BANT', 'CSCS'],
    bio: 'Bridges the gap between exercise science and metabolic health. Specialises in interpreting continuous glucose data alongside Kraft results to optimise body composition.',
    longBio: 'Tom holds an MSc in Sports Nutrition from Loughborough University and is a Certified Strength and Conditioning Specialist (CSCS). His practice uniquely sits at the intersection of exercise physiology and metabolic health. He believes that movement is medicine — but only when timed and structured correctly for each individual\'s metabolic profile. Tom uses CGM data in parallel with Kraft insulin response patterns to build precise exercise prescriptions: knowing when to train fasted, when to train after eating, and how exercise intensity affects insulin sensitivity for each client. He is particularly popular with busy professionals who want to optimise body composition without hours in the gym.',
    rating: 4.7,
    reviews: 76,
    pricePerSession: 85,
    sessionLength: 45,
    nextAvailable: 'Fri 2pm',
    avatar: 'TG',
    avatarColor: '#f97316',
    tags: ['Exercise', 'CGM', 'Body Composition'],
    approach: ['Exercise Prescription', 'CGM Data Analysis', 'Strength Training', 'Zone 2 Training'],
    conditions: ['Body Composition', 'Athletic Performance', 'Metabolic Inflexibility', 'Blood Sugar Variability', 'Obesity'],
  },

  // ─── Mental Health ───────────────────────────────────────────────────────────
  {
    id: 'amara-nwosu',
    name: 'Amara Nwosu',
    title: 'BACP Accredited Psychotherapist & Counsellor',
    category: 'mental-health',
    specialties: ['Depression', 'Anxiety', 'Mental Health & Wellbeing'],
    credentials: ['BACP', 'UKCP', 'MSc Psychotherapy'],
    bio: 'Integrative psychotherapist specialising in depression, anxiety, and emotional wellbeing. Creates a safe, non-judgemental space to explore your thoughts and feelings at your own pace.',
    longBio: 'Amara holds an MSc in Psychotherapy and Counselling from the University of Manchester and is accredited by both BACP and UKCP. She works integratively, drawing from person-centred, CBT, and psychodynamic approaches to tailor every session to the individual. Amara has particular experience supporting people through depression, generalised anxiety, relationship difficulties, and life transitions. She is committed to providing a warm, culturally sensitive space and works with clients from diverse backgrounds. Amara offers both short-term (6–12 session) and long-term therapeutic work depending on client needs.',
    rating: 4.9,
    reviews: 187,
    pricePerSession: 90,
    sessionLength: 50,
    nextAvailable: 'Today 5pm',
    avatar: 'AN',
    avatarColor: '#8b5cf6',
    tags: ['Depression', 'Anxiety', 'CBT', 'Talk Therapy'],
    approach: ['Integrative Psychotherapy', 'Cognitive Behavioural Therapy', 'Person-Centred', 'Psychodynamic'],
    conditions: ['Depression', 'Anxiety', 'Stress', 'Relationship Issues', 'Life Transitions', 'Low Self-Esteem'],
  },
  {
    id: 'daniel-hayes',
    name: 'Daniel Hayes',
    title: 'Clinical Psychologist & CBT Therapist',
    category: 'mental-health',
    specialties: ['Anxiety Disorders', 'Trauma & PTSD', 'OCD'],
    credentials: ['HCPC', 'BPS', 'DClinPsy'],
    bio: 'Clinical psychologist with a Doctorate in Clinical Psychology. Specialises in trauma, OCD, and anxiety disorders using evidence-based approaches including CBT and EMDR.',
    longBio: 'Daniel completed his Doctorate in Clinical Psychology (DClinPsy) at University College London and is registered with the Health and Care Professions Council (HCPC). He has over 10 years of NHS and private practice experience working with complex trauma, PTSD, OCD, and anxiety disorders. Daniel is trained in EMDR (Eye Movement Desensitisation and Reprocessing), a highly effective trauma-focused therapy, as well as Schema Therapy and high-intensity CBT. He works with clients to identify the root patterns driving their difficulties and build lasting psychological resilience.',
    rating: 4.8,
    reviews: 134,
    pricePerSession: 130,
    sessionLength: 60,
    nextAvailable: 'Wed 11am',
    avatar: 'DH',
    avatarColor: '#06b6d4',
    tags: ['Trauma', 'PTSD', 'OCD', 'EMDR', 'CBT'],
    approach: ['Cognitive Behavioural Therapy', 'EMDR', 'Schema Therapy', 'Trauma-Focused'],
    conditions: ['PTSD', 'OCD', 'Panic Disorder', 'Social Anxiety', 'Trauma', 'Phobias'],
  },
  {
    id: 'leila-rashid',
    name: 'Leila Rashid',
    title: 'Counsellor & Mindfulness-Based Therapist',
    category: 'mental-health',
    specialties: ['Grief & Loss', 'Relationship Therapy', 'Mindfulness & Wellbeing'],
    credentials: ['BACP', 'MBCT Certified', 'BSc Psychology'],
    bio: 'Compassionate counsellor specialising in grief, life transitions, and relationship challenges. Uses mindfulness-based approaches to help clients find clarity and rebuild emotional resilience.',
    longBio: 'Leila holds a BSc in Psychology and a postgraduate diploma in Counselling and Psychotherapy, and is a fully accredited BACP member. She is certified in Mindfulness-Based Cognitive Therapy (MBCT) and integrates mindfulness practice throughout her therapeutic work. Leila specialises in supporting people through grief and bereavement, relationship breakdown, divorce, loneliness, and major life changes. She believes that therapy works best when it feels like a genuine human connection — her sessions are described by clients as warm, grounding, and deeply practical.',
    rating: 4.9,
    reviews: 203,
    pricePerSession: 80,
    sessionLength: 50,
    nextAvailable: 'Tomorrow 9am',
    avatar: 'LR',
    avatarColor: '#ec4899',
    tags: ['Grief', 'Mindfulness', 'Relationships', 'Loss'],
    approach: ['Mindfulness-Based Cognitive Therapy', 'Person-Centred', 'Acceptance & Commitment Therapy', 'Grief Counselling'],
    conditions: ['Grief', 'Bereavement', 'Loneliness', 'Relationship Breakdown', 'Divorce', 'Life Transitions', 'Low Mood'],
  },
];

export const SLOTS: Record<string, string[]> = {
  'Mon 6 Jan':  ['09:00', '10:00', '11:00', '14:00', '15:00'],
  'Tue 7 Jan':  ['09:30', '11:00', '13:00', '16:00'],
  'Wed 8 Jan':  ['10:00', '12:00', '14:30', '16:00', '17:00'],
  'Thu 9 Jan':  ['09:00', '10:30', '14:00', '15:30'],
  'Fri 10 Jan': ['09:00', '11:00', '13:30'],
};
export const SLOT_DAYS = Object.keys(SLOTS);

// Only true crisis phrases warrant an emergency redirect.
// All other mental health queries are matched to our mental health therapists.
const CRISIS_TERMS = [
  'suicide', 'suicidal', 'kill myself', 'want to die', 'end my life',
  'self harm', 'self-harm', 'hurt myself', 'harm myself',
];

export function isCrisis(query: string): boolean {
  const q = query.toLowerCase();
  return CRISIS_TERMS.some((term) => q.includes(term));
}

// Terms that indicate a mental health (non-metabolic) query.
const MENTAL_HEALTH_TERMS = [
  'mental health', 'mental disorder', 'mental illness', 'mental issue',
  'mental breakdown', 'nervous breakdown', 'mentally',
  'depression', 'depressed', 'depressive',
  'anxiety disorder', 'anxiety', 'panic attack', 'panic disorder',
  'bipolar', 'schizophreni', 'psychosis', 'psychotic',
  'psychiatr', 'psycholog', 'counsellor', 'counselor',
  'ptsd', 'post traumatic', 'trauma',
  'eating disorder', 'anorexia', 'bulimia', 'binge eating',
  'grief', 'bereavement', 'bereaved',
  'feel hopeless', 'feel empty', 'feel worthless', 'feel numb',
  'lonely', 'loneliness',
  'talk to someone', 'talk with someone', 'someone to talk', 'connect me',
  'emotional support', 'emotional distress', 'emotional help',
  'mental support', 'low mood', 'mood disorder',
];

export function isMentalHealthQuery(query: string): boolean {
  const q = query.toLowerCase();
  return MENTAL_HEALTH_TERMS.some((term) => q.includes(term));
}

// Keyword → therapist match. Requires score ≥ 3 to prevent false positives.
export function matchTherapists(query: string): Therapist[] {
  const q = query.toLowerCase();
  const scores: Record<string, number> = {};
  for (const t of THERAPISTS) {
    let score = 0;
    const searchText = [
      t.name, t.title, t.bio,
      ...t.specialties, ...t.tags, ...t.credentials,
      ...t.approach, ...t.conditions,
    ].join(' ').toLowerCase();

    // ── Metabolic ──
    if (q.match(/insulin|diabetes|blood.?sugar|glucose|kraft/)) {
      if (t.id === 'sarah-okonkwo') score += 5;
      if (t.id === 'tom-gallagher') score += 3;
    }
    if (q.match(/age|ageing|aging|longevity|biological.?age|bas\b|anti.?age/)) {
      if (t.id === 'james-whitfield') score += 5;
    }
    if (q.match(/\bfat\b|\bweight\b|visceral|mets.?ir|lifestyle/)) {
      if (t.id === 'priya-sharma') score += 5;
    }
    if (q.match(/exercise|gym|sport|\bcgm\b|body.?comp|muscle|training|fitness/)) {
      if (t.id === 'tom-gallagher') score += 5;
    }
    if (q.match(/gut|hormone|thyroid|menopause|pcos/)) {
      if (t.id === 'james-whitfield') score += 4;
      if (t.id === 'priya-sharma') score += 2;
    }
    if (q.match(/metabolic|metabolism/)) {
      if (t.id === 'sarah-okonkwo') score += 3;
    }

    // ── Mental health ──
    if (q.match(/depress|low mood|sadness|hopeless|empty|worthless/)) {
      if (t.id === 'amara-nwosu') score += 5;
      if (t.id === 'leila-rashid') score += 3;
    }
    if (q.match(/anxiet|panic|ocd|trauma|ptsd|phobia/)) {
      if (t.id === 'daniel-hayes') score += 5;
      if (t.id === 'amara-nwosu') score += 3;
    }
    if (q.match(/grief|bereavement|loss|lonely|loneliness|relationship|divorce/)) {
      if (t.id === 'leila-rashid') score += 5;
      if (t.id === 'amara-nwosu') score += 2;
    }
    if (q.match(/mental.{0,15}(health|disorder|illness|issue|support)|connect.*someone|talk.*someone|someone.*talk|counsell|psycholog|psychiatr/)) {
      if (t.id === 'amara-nwosu') score += 5;
      if (t.id === 'daniel-hayes') score += 4;
      if (t.id === 'leila-rashid') score += 4;
    }
    if (q.match(/mindful|wellbeing|well.being|stress|burnout/)) {
      if (t.id === 'leila-rashid') score += 4;
      if (t.id === 'amara-nwosu') score += 3;
      if (t.id === 'priya-sharma') score += 3;
    }

    // Generic word overlap — minor boost, not enough to win alone
    for (const word of q.split(/\s+/)) {
      if (word.length > 4 && searchText.includes(word)) score += 0.5;
    }
    scores[t.id] = score;
  }
  return [...THERAPISTS]
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    .filter((t) => (scores[t.id] ?? 0) >= 3);
}
