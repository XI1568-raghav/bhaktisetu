/**
 * Static seed of Indian yoga / meditation / vipassana instructors and
 * centres. Heavy weighting on Rishikesh, Mysuru (Ashtanga capital),
 * Pune (Iyengar / vipassana Igatpuri), Bengaluru, Goa. Used as
 * baseline + fallback for live Yoga Alliance / JustDial scraping.
 */
import type { RawLead } from './_shared.js';

interface WellnessSeedRow {
  name: string;
  city: string;
  state: string;
  modality: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const placeholderEmail = (name: string, city: string) =>
  `contact+${slug(name)}@${slug(city)}.wellness.placeholder.in`;

const placeholderPhone = (name: string, city: string): string => {
  const seed = `well:${name}:${city}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 37 + seed.charCodeAt(i)) >>> 0;
  const tail = String(h).padStart(9, '0').slice(0, 9);
  return `+917${tail}`;
};

const rows: WellnessSeedRow[] = [
  // Rishikesh - yoga capital of the world
  { name: 'Parmarth Niketan Yoga School', city: 'Rishikesh', state: 'Uttarakhand', modality: 'hatha/vinyasa' },
  { name: 'Anand Prakash Yoga Ashram', city: 'Rishikesh', state: 'Uttarakhand', modality: 'akhanda yoga' },
  { name: 'Rishikesh Yog Peeth', city: 'Rishikesh', state: 'Uttarakhand', modality: 'multi-style TTC' },
  { name: 'Yoga Vidya Mandiram', city: 'Rishikesh', state: 'Uttarakhand', modality: 'traditional hatha' },
  { name: 'Yog Niketan Ashram', city: 'Rishikesh', state: 'Uttarakhand', modality: 'classical yoga' },
  { name: 'Sivananda Yoga Vedanta Centre Rishikesh', city: 'Rishikesh', state: 'Uttarakhand', modality: 'sivananda' },
  { name: 'Phool Chatti Ashram', city: 'Rishikesh', state: 'Uttarakhand', modality: 'silent retreat' },
  { name: 'Tattvaa Yogashala', city: 'Rishikesh', state: 'Uttarakhand', modality: 'ashtanga/vinyasa' },
  // Mysuru - Ashtanga capital
  { name: 'KPJAYI / Sharath Yoga Centre', city: 'Mysuru', state: 'Karnataka', modality: 'ashtanga' },
  { name: 'Mysore Mandala Yogashala', city: 'Mysuru', state: 'Karnataka', modality: 'ashtanga mysore' },
  { name: 'Indea Yoga', city: 'Mysuru', state: 'Karnataka', modality: 'multi-style' },
  { name: 'Yogasthala Mysore', city: 'Mysuru', state: 'Karnataka', modality: 'ashtanga' },
  { name: 'Anantha Research Foundation', city: 'Mysuru', state: 'Karnataka', modality: 'iyengar' },
  // Pune - Iyengar HQ + Vipassana Igatpuri
  { name: 'Ramamani Iyengar Memorial Yoga Institute (RIMYI)', city: 'Pune', state: 'Maharashtra', modality: 'iyengar' },
  { name: 'Kaivalyadhama Pune Centre', city: 'Pune', state: 'Maharashtra', modality: 'classical/yoga therapy' },
  { name: 'Yoga Vidya Gurukul Nashik', city: 'Nashik', state: 'Maharashtra', modality: 'classical' },
  { name: 'Vipassana International Academy Igatpuri (Dhamma Giri)', city: 'Igatpuri', state: 'Maharashtra', modality: 'vipassana' },
  { name: 'Atmabodh Yoga Pune', city: 'Pune', state: 'Maharashtra', modality: 'multi-style' },
  { name: 'OSHO International Meditation Resort', city: 'Pune', state: 'Maharashtra', modality: 'osho meditation' },
  // Bengaluru
  { name: 'Sri Sri Yoga (Art of Living)', city: 'Bengaluru', state: 'Karnataka', modality: 'sri sri yoga' },
  { name: 'Art of Living International Centre', city: 'Bengaluru', state: 'Karnataka', modality: 'sudarshan kriya' },
  { name: 'a1000yoga', city: 'Bengaluru', state: 'Karnataka', modality: 'multi-style TTC' },
  { name: 'Aastha Yoga Bengaluru', city: 'Bengaluru', state: 'Karnataka', modality: 'hatha/vinyasa' },
  { name: 'Akshar Yoga', city: 'Bengaluru', state: 'Karnataka', modality: 'akshar yoga' },
  { name: 'Atmadarshan Yogashala', city: 'Bengaluru', state: 'Karnataka', modality: 'iyengar' },
  // Goa
  { name: 'Purple Valley Yoga Retreat', city: 'Assagao', state: 'Goa', modality: 'ashtanga' },
  { name: 'Brahmani Yoga Goa', city: 'Anjuna', state: 'Goa', modality: 'ashtanga/vinyasa' },
  { name: 'Sampoorna Yoga Goa', city: 'Agonda', state: 'Goa', modality: 'multi-style TTC' },
  { name: 'Ashiyana Yoga Retreat', city: 'Mandrem', state: 'Goa', modality: 'multi-style' },
  { name: 'Bamboo Yoga Patnem', city: 'Patnem', state: 'Goa', modality: 'vinyasa/yin' },
  { name: 'Yoga Magic Goa', city: 'Anjuna', state: 'Goa', modality: 'hatha/restorative' },
  // Mumbai
  { name: 'The Yoga Institute Santacruz', city: 'Mumbai', state: 'Maharashtra', modality: 'classical/therapy' },
  { name: 'Yoga House Mumbai', city: 'Mumbai', state: 'Maharashtra', modality: 'multi-style' },
  { name: 'Iyengar Yogashraya', city: 'Mumbai', state: 'Maharashtra', modality: 'iyengar' },
  { name: 'Kaivalyadhama Marine Drive', city: 'Mumbai', state: 'Maharashtra', modality: 'classical' },
  // Delhi NCR
  { name: 'Morarji Desai National Institute of Yoga', city: 'Delhi', state: 'Delhi', modality: 'classical/research' },
  { name: 'Sivananda Yoga Vedanta Nataraja Centre', city: 'Delhi', state: 'Delhi', modality: 'sivananda' },
  { name: 'Akshar Yoga Delhi', city: 'Delhi', state: 'Delhi', modality: 'akshar yoga' },
  { name: 'Total Yoga Gurgaon', city: 'Gurgaon', state: 'Haryana', modality: 'multi-style' },
  // Kerala
  { name: 'Sivananda Yoga Vedanta Dhanwantari Ashram', city: 'Neyyar Dam', state: 'Kerala', modality: 'sivananda' },
  { name: 'Amrita Yoga Amritapuri', city: 'Kollam', state: 'Kerala', modality: 'amrita yoga' },
  { name: 'Kairali Ayurvedic Healing Village', city: 'Palakkad', state: 'Kerala', modality: 'ayurveda/yoga' },
  // Vipassana centres outside Igatpuri
  { name: 'Vipassana Centre Dhamma Pattana Mumbai', city: 'Mumbai', state: 'Maharashtra', modality: 'vipassana' },
  { name: 'Dhamma Bodhi Bodh Gaya', city: 'Bodh Gaya', state: 'Bihar', modality: 'vipassana' },
  { name: 'Dhamma Khetta Hyderabad', city: 'Hyderabad', state: 'Telangana', modality: 'vipassana' },
  { name: 'Dhamma Paphulla Bengaluru', city: 'Bengaluru', state: 'Karnataka', modality: 'vipassana' },
  { name: 'Dhamma Sikhara Dharamkot', city: 'Dharamshala', state: 'Himachal Pradesh', modality: 'vipassana' },
  // Dharamshala / Himalayas
  { name: 'Tushita Meditation Centre', city: 'Dharamshala', state: 'Himachal Pradesh', modality: 'tibetan buddhist' },
  { name: 'Himalayan Iyengar Yoga Centre', city: 'Dharamshala', state: 'Himachal Pradesh', modality: 'iyengar' },
  { name: 'Z Meditation Bir', city: 'Bir', state: 'Himachal Pradesh', modality: 'meditation retreat' },
  // Auroville / Pondicherry
  { name: 'Sri Aurobindo Ashram Yoga', city: 'Puducherry', state: 'Puducherry', modality: 'integral yoga' },
  { name: 'Quiet Healing Centre Auroville', city: 'Auroville', state: 'Tamil Nadu', modality: 'wellness/yoga' },
];

export const WELLNESS_SEED: RawLead[] = rows.map((r) => ({
  name: r.name,
  city: r.city,
  state: r.state,
  country: 'India',
  email: placeholderEmail(r.name, r.city),
  phone: placeholderPhone(r.name, r.city),
  source: 'wellness_static',
  sourceUrl: null,
  metadata: {
    seedRecord: true,
    modality: r.modality,
  },
}));
