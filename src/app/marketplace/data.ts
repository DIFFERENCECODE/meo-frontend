export interface Therapist {
  id: string;
  name: string;
  title: string;
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
];

export const SLOTS: Record<string, string[]> = {
  'Mon 6 Jan':  ['09:00', '10:00', '11:00', '14:00', '15:00'],
  'Tue 7 Jan':  ['09:30', '11:00', '13:00', '16:00'],
  'Wed 8 Jan':  ['10:00', '12:00', '14:30', '16:00', '17:00'],
  'Thu 9 Jan':  ['09:00', '10:30', '14:00', '15:30'],
  'Fri 10 Jan': ['09:00', '11:00', '13:30'],
};
export const SLOT_DAYS = Object.keys(SLOTS);

// Simple keyword → therapist match for the AI recommender
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

    const keywords: Record<string, string[]> = {
      [t.id]: [],
    };
    if (q.match(/insulin|diabetes|blood.?sugar|glucose|kraft/)) {
      if (t.id === 'sarah-okonkwo') score += 5;
      if (t.id === 'tom-gallagher') score += 3;
    }
    if (q.match(/age|ageing|aging|longevity|biological age|bas|anti.?age/)) {
      if (t.id === 'james-whitfield') score += 5;
    }
    if (q.match(/stress|anxiety|habit|lifestyle|fat|weight|visceral|mets/)) {
      if (t.id === 'priya-sharma') score += 5;
    }
    if (q.match(/exercise|gym|sport|cgm|body.?comp|muscle|training/)) {
      if (t.id === 'tom-gallagher') score += 5;
    }
    if (q.match(/gut|hormone|thyroid|menopause/)) {
      if (t.id === 'james-whitfield') score += 4;
      if (t.id === 'priya-sharma') score += 2;
    }

    // Generic word overlap
    for (const word of q.split(/\s+/)) {
      if (word.length > 3 && searchText.includes(word)) score += 1;
    }
    scores[t.id] = score;
  }
  return [...THERAPISTS]
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    .filter((t) => (scores[t.id] ?? 0) > 0);
}
