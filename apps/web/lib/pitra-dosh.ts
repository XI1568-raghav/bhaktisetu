// Pitra Dosha — ancestral-karma affliction. Sun / Rahu / Ketu in specific houses
// of birth chart indicate pitr-rina (debt to ancestors). Manifests as progeny
// problems, marriage delays, repeated misfortune, family discord, financial drain.
// References: Brihat Parashara Hora Shastra, Phaladeepika, Jataka Parijata,
// + Garuda Purana on shradh / tarpan procedures.

export type DoshSeverity = 'mild' | 'moderate' | 'severe';
export type LifeArea = 'progeny' | 'marriage' | 'wealth' | 'health' | 'family' | 'career';

export interface PitraDoshType {
 slug: string;
 name: string;
 sanskrit: string;
 grahaCombination: string;       // e.g. "Sun + Rahu in 9th house"
 housesInvolved: number[];       // numeric houses 1-12
 severity: DoshSeverity;
 cause: string;                  // ancestral karma cause
 symptoms: string[];
 primaryAreas: LifeArea[];
 remedies: string[];
 mantra: string;
 mantraEnglish: string;
}

export interface SymptomChecker {
 slug: LifeArea;
 label: string;
 sanskrit: string;
 description: string;
 indicators: string[];           // life-pattern indicators user can self-identify
 likelyDosh: string[];           // PitraDoshType slugs
}

export const PITRA_DOSH_TYPES: PitraDoshType[] = [
 {
  slug: 'surya-pitra-dosh',
  name: 'Surya Pitra Dosh',
  sanskrit: 'सूर्य पितृ दोष',
  grahaCombination: 'Sun afflicted by Rahu / Ketu in 9th house',
  housesInvolved: [9],
  severity: 'severe',
  cause: 'Disrespect shown to father / paternal ancestors in past life. Failure to perform shradh for father&apos;s line.',
  symptoms: [
   'Strained or estranged relationship with father',
   'Father suffered untimely death or chronic illness',
   'Repeated failures despite competence in career',
   'Loss of paternal property',
   'Difficulty conceiving male progeny',
  ],
  primaryAreas: ['career', 'progeny', 'family'],
  remedies: [
   'Perform Pind Daan at Gaya (most powerful) or Pushkar / Kashi',
   'Offer arghya to Surya every Sunday sunrise w/ red flowers + jaggery water',
   'Observe Pitru Paksha shradh annually (16 days, Sep-Oct)',
   'Feed crows, cows, brahmins on amavasya',
   'Donate red sandalwood + wheat to brahmin on Sundays',
   'Recite Aditya Hridayam stotra daily',
  ],
  mantra: 'ॐ पितृ देवताभ्यो नमः',
  mantraEnglish: 'Om Pitri Devatabhyo Namah',
 },
 {
  slug: 'chandra-pitra-dosh',
  name: 'Chandra Pitra Dosh',
  sanskrit: 'चन्द्र पितृ दोष',
  grahaCombination: 'Moon afflicted by Rahu / Ketu in 4th house',
  housesInvolved: [4],
  severity: 'moderate',
  cause: 'Disrespect to mother / maternal lineage. Mother&apos;s side ancestors&apos; rites incomplete.',
  symptoms: [
   'Mental unrest, anxiety, insomnia without medical cause',
   'Strained relationship with mother',
   'Frequent change of residence, no permanent home',
   'Property disputes within family',
   'Emotional dependency / mood swings',
  ],
  primaryAreas: ['family', 'health', 'wealth'],
  remedies: [
   'Offer water mixed w/ white sesame + raw milk to peepal tree every Monday morning',
   'Perform matamaha shradh (maternal grandfather shradh) on appropriate amavasya',
   'Feed mother daily; never raise voice at any elderly woman',
   'Donate white rice + silver to brahmin couple on Monday',
   'Recite Mahamrityunjaya mantra 108x daily',
   'Visit Trimbakeshwar / Pushkar for Narayan Nagbali puja',
  ],
  mantra: 'ॐ मातृ पितृ देवताभ्यो नमः',
  mantraEnglish: 'Om Matri Pitri Devatabhyo Namah',
 },
 {
  slug: 'rahu-pitra-dosh',
  name: 'Rahu Pitra Dosh',
  sanskrit: 'राहु पितृ दोष',
  grahaCombination: 'Rahu in 5th / 9th house, especially aspected by Mars / Saturn',
  housesInvolved: [5, 9],
  severity: 'severe',
  cause: 'Ancestors died with unfulfilled desires; suicide or unnatural death in family line; broken vows / promises to ancestors.',
  symptoms: [
   'Repeated miscarriages or progeny denial',
   'Children born with disabilities or chronic illness',
   'Sudden unexpected losses just before success',
   'Hidden enemies / repeated betrayal',
   'Confusion in decision-making, loss of dharmic direction',
  ],
  primaryAreas: ['progeny', 'wealth', 'career'],
  remedies: [
   'Narayan Nagbali puja at Trimbakeshwar (3-day Vedic ritual specifically for Pitra Dosh)',
   'Tripindi Shradh at Trimbakeshwar / Gokarna / Rameswaram',
   'Donate black sesame + iron + black cloth to brahmin on Saturday',
   'Feed snakes (milk to snake holes / Nag Panchami)',
   'Rudrabhishek monthly on Shivratri',
   'Avoid alcohol, meat, gambling — pitra-dosh aggravators',
  ],
  mantra: 'ॐ राहवे नमः, पितृ देवताभ्यो नमः',
  mantraEnglish: 'Om Rahave Namah, Pitri Devatabhyo Namah',
 },
 {
  slug: 'ketu-pitra-dosh',
  name: 'Ketu Pitra Dosh',
  sanskrit: 'केतु पितृ दोष',
  grahaCombination: 'Ketu in 12th / 5th / 9th house with malefic association',
  housesInvolved: [5, 9, 12],
  severity: 'moderate',
  cause: 'Ancestors&apos; moksha incomplete; spiritual debt unpaid; unfulfilled sadhana in lineage.',
  symptoms: [
   'Vague spiritual restlessness, sense of unfinished karma',
   'Repeated foreign-travel setbacks',
   'Inexplicable losses in 12th house matters (sleep, expenses, isolation)',
   'Sudden inheritance disputes',
   'Detachment from material success despite achievement',
  ],
  primaryAreas: ['career', 'health', 'family'],
  remedies: [
   'Feed dogs (especially black) on Tuesday + Saturday',
   'Donate brown blanket + multi-grain to wandering sadhu',
   'Light til-oil diya under peepal tree every Saturday evening',
   'Recite Hanuman Chalisa 11x daily',
   'Visit Kalahasti or Rameswaram for Ketu shanti puja',
   'Annual pinda dan during Pitru Paksha at any sacred river',
  ],
  mantra: 'ॐ केतवे नमः, पितृ देवताभ्यो नमः',
  mantraEnglish: 'Om Ketave Namah, Pitri Devatabhyo Namah',
 },
 {
  slug: 'guru-pitra-dosh',
  name: 'Guru Pitra Dosh',
  sanskrit: 'गुरु पितृ दोष',
  grahaCombination: 'Jupiter combust / debilitated / afflicted in 5th / 9th',
  housesInvolved: [5, 9],
  severity: 'moderate',
  cause: 'Disrespect to guru / teacher / brahmin in past life. Failure to honour family acharya / kuldevta.',
  symptoms: [
   'Lack of dharmic guidance in life decisions',
   'Difficulty finding good guru / mentor',
   'Children disobedient or far from dharma',
   'Marriage delays / unsuitable matches proposed',
   'Loss of faith / spiritual aridity',
   'Wealth comes but doesn&apos;t stay',
  ],
  primaryAreas: ['marriage', 'progeny', 'wealth'],
  remedies: [
   'Re-establish daily kuldevta puja; visit ancestral kuldevta temple yearly',
   'Serve guru / teacher / spiritual elder w/o expectation',
   'Donate yellow items (turmeric, gram dal, gold) to brahmin on Thursday',
   'Recite Vishnu Sahasranama on Thursday',
   'Feed brahmin couple monthly',
   'Plant + nurture banana tree at home',
  ],
  mantra: 'ॐ बृहस्पतये नमः, पितृ देवताभ्यो नमः',
  mantraEnglish: 'Om Brihaspataye Namah, Pitri Devatabhyo Namah',
 },
];

export const SYMPTOM_CHECKERS: SymptomChecker[] = [
 {
  slug: 'progeny',
  label: 'Progeny / Childbirth issues',
  sanskrit: 'सन्तान दोष',
  description: 'Repeated miscarriages, infertility, child-naming difficulties, or child health problems despite no medical cause.',
  indicators: [
   'Difficulty conceiving despite normal medical reports',
   'Miscarriages without medical explanation',
   'Child born with chronic illness',
   'No male / no female progeny over generations',
   'Adopted child also faces same difficulty',
  ],
  likelyDosh: ['surya-pitra-dosh', 'rahu-pitra-dosh', 'guru-pitra-dosh'],
 },
 {
  slug: 'marriage',
  label: 'Marriage delays / discord',
  sanskrit: 'विवाह दोष',
  description: 'Marriage proposals fall through, marriage delayed beyond 30, or constant marital discord without obvious cause.',
  indicators: [
   'Marriage proposals break at last moment',
   'No suitable match found despite efforts',
   'Marriage delayed beyond family norm',
   'Constant marital discord without external cause',
   'Spouse&apos;s family also has unresolved pitra issues',
  ],
  likelyDosh: ['rahu-pitra-dosh', 'guru-pitra-dosh', 'chandra-pitra-dosh'],
 },
 {
  slug: 'wealth',
  label: 'Wealth drains / sudden losses',
  sanskrit: 'अर्थ दोष',
  description: 'Money comes but doesn&apos;t stay. Sudden losses just before financial milestones. Inheritance disputes.',
  indicators: [
   'Money earned drains away inexplicably',
   'Sudden expenses just before saving target',
   'Property disputes within family',
   'Loans never get repaid back to you',
   'Inheritance lost to litigation',
  ],
  likelyDosh: ['rahu-pitra-dosh', 'chandra-pitra-dosh', 'guru-pitra-dosh'],
 },
 {
  slug: 'health',
  label: 'Chronic / unexplained health',
  sanskrit: 'स्वास्थ्य दोष',
  description: 'Recurring illness without medical cause. Multiple family members suffer same condition across generations.',
  indicators: [
   'Chronic anxiety / insomnia w/o medical cause',
   'Same illness recurs across 3+ generations',
   'Health drops on amavasya / specific tithi',
   'Mental restlessness peaks at night',
   'Doctors find nothing yet symptoms persist',
  ],
  likelyDosh: ['chandra-pitra-dosh', 'ketu-pitra-dosh'],
 },
 {
  slug: 'family',
  label: 'Family discord / estrangement',
  sanskrit: 'कुल दोष',
  description: 'Constant family quarrels, siblings split, parental estrangement, ancestral home in dispute.',
  indicators: [
   'Estranged from father or paternal side',
   'Mother&apos;s family also estranged',
   'Siblings split, never reconcile',
   'Ancestral home in legal dispute',
   'Family functions always end in conflict',
  ],
  likelyDosh: ['surya-pitra-dosh', 'chandra-pitra-dosh', 'ketu-pitra-dosh'],
 },
 {
  slug: 'career',
  label: 'Career setbacks / blocked growth',
  sanskrit: 'कर्म दोष',
  description: 'Promotion always given to someone else. Sudden job loss before milestones. Hidden enemies sabotage work.',
  indicators: [
   'Promotion always denied at last step',
   'Repeated job losses just before bonus',
   'Hidden enemies in workplace',
   'Talent recognised but rewards withheld',
   'Career path completely different from family talent',
  ],
  likelyDosh: ['surya-pitra-dosh', 'rahu-pitra-dosh', 'ketu-pitra-dosh'],
 },
];

export const UNIVERSAL_REMEDIES = [
 {
  title: 'Pitru Paksha Shradh',
  detail: '16 days every year (Bhadrapad Krishna Paksha, Sep-Oct). Daily tarpan + brahmin bhojan on the tithi of ancestor&apos;s death. Most accessible universal remedy.',
 },
 {
  title: 'Amavasya Tarpan',
  detail: 'Monthly: on every amavasya offer water + black sesame + barley + kusha grass to south direction (yama-dik). 5 minutes, no priest needed.',
 },
 {
  title: 'Peepal Water Offering',
  detail: 'Every Saturday morning: offer water + raw milk + black sesame + a copper coin at base of peepal tree. Light til-oil diya in evening.',
 },
 {
  title: 'Feed the Five',
  detail: 'Pancha-bali on amavasya: portion of meal to cow, dog, crow, brahmin, and a stranger. Garuda Purana mandate.',
 },
 {
  title: 'Gaya Shradh (lifetime)',
  detail: 'Most powerful pitra-dosh nivaran. Pind daan at Vishnu Padam Temple, Gaya. Doable once in lifetime — settles dosh for current and next 7 generations per Vayu Purana.',
 },
 {
  title: 'Narayan Nagbali (Trimbakeshwar)',
  detail: '3-day Vedic puja specifically for Pitra Dosh + Kalsarpa Dosh combined. Performed only at Trimbakeshwar (Maharashtra). 25,000+ INR donation typical to local pandits.',
 },
];

export function getDoshType(slug: string): PitraDoshType | undefined {
 return PITRA_DOSH_TYPES.find((d) => d.slug === slug);
}

export function getSymptomChecker(slug: LifeArea): SymptomChecker | undefined {
 return SYMPTOM_CHECKERS.find((s) => s.slug === slug);
}

export function diagnoseBySymptom(slug: LifeArea): { checker: SymptomChecker; doshes: PitraDoshType[] } | undefined {
 const checker = getSymptomChecker(slug);
 if (!checker) return undefined;
 const doshes = checker.likelyDosh.map((s) => getDoshType(s)).filter((d): d is PitraDoshType => Boolean(d));
 return { checker, doshes };
}
