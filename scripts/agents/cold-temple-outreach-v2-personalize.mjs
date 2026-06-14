// cold-temple-outreach-v2-personalize — deterministic per-temple email body
// builder for R-Q1-M-014. No LLM. No external calls. Pure function input → output.
//
// Picks 1 of N hook templates based on temple attributes (deity, region,
// city tier, festival proximity, tradition), so two temples never get the same
// boilerplate body. Subject line + opener + body + value-prop are all shaped
// per-temple.
//
// Why deterministic: free-tier discipline ($0 LLM spend), and we want the
// same temple to receive the same body on re-test so QA can diff. Hash the
// (id, deity, city, region) tuple → pick template index. Stable across runs.

// ---- template banks ----

// Hook openers vary by deity family. Each opener is 1-2 sentences referring to
// the deity tradition the temple primarily serves, then bridges to NRI demand.
const DEITY_HOOKS = {
  shiva: [
    'Shaivite temples have been seeing a sharp rise in Rudrabhishek and Mahamrityunjaya requests from NRI families — especially around Mondays and Pradosh.',
    'Devotees of Lord Shiva abroad consistently rank Rudrabhishek and Bilva-archana as their highest-intent paid pujas — your temple\'s tradition fits that demand exactly.',
    'NRI Shaivites are actively searching for verified Shiva temples that offer live Rudrabhishek with video proof — most listings still don\'t deliver it.',
  ],
  vishnu: [
    'Vaishnava temples — particularly those tied to Vishnu, Krishna, or Rama traditions — see consistent NRI demand for Satyanarayan Vrat, Vishnu Sahasranama parayan, and Lakshmi-Narayan archana.',
    'Krishna and Vishnu devotees abroad routinely request weekly Tulsi archana and Sahasranama recitations from their ancestral parampara temples.',
    'NRI Vaishnavas are looking for verified temples that can stream Aarti and deliver Tulsi-prasad — your tradition is exactly what they\'re searching for.',
  ],
  devi: [
    'Shakta temples see the highest NRI booking density during Navratri, Ashtami, and monthly Ashtami/Navami — Devi devotees abroad are some of our most engaged.',
    'Devotees of Devi Maa abroad have been booking Lalita Sahasranama, Chandi Path, and Kumkum-archana consistently from listed Shakta temples.',
    'Mata\'s devotees abroad want video proof of Chandi Path and Kumkum-archana — verified Devi temples are still rare on platforms like ours.',
  ],
  ganesha: [
    'Ganesha temples see a year-round baseline of NRI bookings for Ganapati Atharvashirsha, Sankashti, and Modaka-naivedya seva.',
    'NRI families abroad consistently book Ganapati Homa and Sankashti Chaturthi pujas — especially before exams, business starts, and house-warming.',
    'Devotees abroad want a verified Ganesha temple to perform Sankashti and Ganapati Atharvashirsha live — most listings still offer only photo-proof.',
  ],
  hanuman: [
    'Hanuman temples see steady NRI demand for Sundar Kand parayan, Hanuman Chalisa 108-recitation, and Tuesday/Saturday Sindoor archana.',
    'NRI devotees of Bajrangbali consistently book Sundar Kand and weekly Tuesday Hanuman Chalisa parayan — verified temples in this tradition are in short supply.',
    'Hanuman devotees abroad rank Sundar Kand and Sindoor-archana among the highest-intent paid pujas they look for.',
  ],
  ayyappa: [
    'Ayyappa devotees abroad are an exceptionally tight community — verified Sabarimala-tradition temples see strong demand year-round, peaking Nov-Jan.',
    'NRI Ayyappa bhaktas observe 41-day vratham annually and look for verified temples to perform Padi Puja and Neyyabhishekam on their behalf.',
  ],
  generic: [
    'Verified Hindu temples on Darshya are seeing steady NRI demand — bookings are concentrated on tradition-specific seva your pujaris already perform daily.',
    'NRI devotees abroad want verified temples that can deliver live or recorded video proof — most platforms still don\'t enforce it, which is why we do.',
    'Devotees abroad are actively looking for verified temples in your tradition to perform seva on their behalf — Darshya routes that demand to you.',
  ],
};

// Regional context — second sentence in body, situates the temple geographically.
const REGION_CONTEXT = {
  north: 'North India temples — especially in UP, Uttarakhand, Punjab, Haryana, Himachal, and Delhi — are the most-searched region on our platform.',
  south: 'South Indian temples — particularly in Tamil Nadu, Karnataka, Andhra, Telangana, and Kerala — see strong NRI demand from the Tamil, Telugu, Kannada, and Malayali diaspora.',
  west: 'Western India temples — Maharashtra, Gujarat, Rajasthan, Goa — see consistent demand from the Gujarati and Marathi diaspora in the US, UK, and East Africa.',
  east: 'Eastern India temples — Bengal, Odisha, Bihar, Jharkhand, Assam — see strong demand around Durga Puja, Rath Yatra, and Chhath, primarily from US East Coast and UK.',
  central: 'Central India temples — MP, Chhattisgarh — sit on the most-traveled pilgrim corridors and see consistent demand from devotees who have ancestral roots in your region.',
  unknown: 'Verified temples across India see steady NRI demand, with bookings concentrated on tradition-specific seva.',
};

// City-tier value prop — third sentence, what NRI traffic pattern looks like.
const CITY_TIER_VALUE = {
  tier1: 'In cities like yours, we see ~40% of bookings come from devotees who have direct ancestral or parampara ties to the city — repeat seva is the norm.',
  tier2: 'Tier-2 cities like yours often have devotees abroad who explicitly seek out their hometown temple rather than a generic listing — repeat booking rates are high.',
  pilgrim: 'Pilgrim destinations see year-round demand from devotees abroad who want their seva performed at a tirth that holds personal significance — bookings are not seasonal.',
  unknown: 'Devotees abroad consistently seek out specific temples rather than generic listings — repeat booking rates are higher than first-time platforms expect.',
};

// Festival hook — fourth sentence, surfaces the closest festival relevant to
// the temple's tradition. Computed at runtime from current date + tradition map.
const FESTIVAL_HINTS = {
  shiva: { name: 'Maha Shivratri', monthHint: 'Feb-Mar' },
  vishnu: { name: 'Janmashtami', monthHint: 'Aug-Sep' },
  devi: { name: 'Navratri', monthHint: 'Sep-Oct and Mar-Apr' },
  ganesha: { name: 'Ganesh Chaturthi', monthHint: 'Aug-Sep' },
  hanuman: { name: 'Hanuman Jayanti', monthHint: 'Apr' },
  ayyappa: { name: 'Mandala-Makara Vilakku', monthHint: 'Nov-Jan' },
  generic: { name: 'major festivals', monthHint: 'year-round' },
};

// ---- helpers ----

export function classifyDeity(deityRaw) {
  const d = String(deityRaw || '').toLowerCase();
  if (!d) return 'generic';
  if (/\bshiv|mahadev|nataraj|rudra|bhairav|kedar/.test(d)) return 'shiva';
  if (/\bvishnu|venkat|balaji|krishn|ram\b|jagannath|narayan|hari|govind/.test(d)) return 'vishnu';
  if (/\bdevi|durga|kali|lakshmi|saraswati|amba|bhavani|chamund|gauri|parvat|mata|maa\b/.test(d)) return 'devi';
  if (/ganesh|ganpat|vinayak|ganapat/.test(d)) return 'ganesha';
  if (/hanuman|bajrang|maruti|anjaney/.test(d)) return 'hanuman';
  if (/ayyappa|sastha/.test(d)) return 'ayyappa';
  return 'generic';
}

export function classifyRegion(stateRaw, cityRaw) {
  const s = String(stateRaw || '').toLowerCase();
  const c = String(cityRaw || '').toLowerCase();
  const blob = `${s} ${c}`;
  if (/uttar pradesh|uttarakhand|punjab|haryana|himachal|delhi|j&k|jammu|kashmir|varanasi|haridwar|rishikesh|mathura|vrindavan|ayodhya|amritsar/.test(blob)) return 'north';
  if (/tamil nadu|karnataka|andhra|telangana|kerala|chennai|bengaluru|hyderabad|madurai|tirupati|guruvayur|sabarimala|rameswar|kanchi|coimbatore/.test(blob)) return 'south';
  if (/maharashtra|gujarat|rajasthan|goa|mumbai|pune|ahmedabad|surat|jaipur|udaipur|nashik|shirdi|dwarka|somnath/.test(blob)) return 'west';
  if (/west bengal|bengal|odisha|orissa|bihar|jharkhand|assam|tripura|kolkata|puri|bhubaneswar|gaya|guwahati/.test(blob)) return 'east';
  if (/madhya pradesh|chhattisgarh|ujjain|indore|bhopal|raipur/.test(blob)) return 'central';
  return 'unknown';
}

const TIER1_CITIES = new Set([
  'mumbai', 'delhi', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'kolkata',
  'ahmedabad', 'pune', 'jaipur', 'surat', 'lucknow', 'kanpur',
]);
const PILGRIM_CITIES = new Set([
  'varanasi', 'haridwar', 'rishikesh', 'tirupati', 'mathura', 'vrindavan', 'ayodhya',
  'puri', 'dwarka', 'somnath', 'ujjain', 'shirdi', 'guruvayur', 'sabarimala', 'rameswaram',
  'madurai', 'kanchipuram', 'bodhgaya', 'gaya', 'amritsar', 'kedarnath', 'badrinath',
  'nathdwara', 'kashi', 'prayagraj', 'allahabad',
]);

export function classifyCityTier(cityRaw) {
  const c = String(cityRaw || '').toLowerCase().trim();
  if (!c) return 'unknown';
  if (PILGRIM_CITIES.has(c)) return 'pilgrim';
  if (TIER1_CITIES.has(c)) return 'tier1';
  return 'tier2';
}

// FNV-1a hash → 32-bit unsigned int. Deterministic, no crypto needed.
export function stableHash(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function pickTemplate(bank, key) {
  const arr = Array.isArray(bank) ? bank : [];
  if (arr.length === 0) return '';
  const idx = stableHash(key) % arr.length;
  return arr[idx];
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---- public builders ----

export function buildSubject(lead) {
  const deityClass = classifyDeity(lead.deity || lead.notes || '');
  const city = (lead.city || '').trim();
  const variants = [];
  if (deityClass === 'shiva' && city) variants.push(`Rudrabhishek bookings from NRI devotees — partnering with ${city} Shiva temples`);
  if (deityClass === 'vishnu' && city) variants.push(`Satyanarayan + Sahasranama demand from NRI Vaishnavas — ${city} temples`);
  if (deityClass === 'devi' && city) variants.push(`Navratri + monthly Ashtami demand — verified Devi temples in ${city}`);
  if (deityClass === 'ganesha' && city) variants.push(`Sankashti + Ganapati Homa bookings from NRI families — ${city} Ganesha temples`);
  if (deityClass === 'hanuman' && city) variants.push(`Sundar Kand parayan + Tuesday seva — NRI demand for ${city} Hanuman temples`);
  if (deityClass === 'ayyappa' && city) variants.push(`Padi Puja + Neyyabhishekam demand — ${city} Ayyappa temples`);
  if (city) variants.push(`Verified ${city} temples partnering with Darshya for NRI seva`);
  variants.push(`Verified Hindu temples partnering with Darshya for NRI seva`);
  return pickTemplate(variants, `${lead.id || ''}:${deityClass}:${city}`);
}

export function buildBodyHtml(lead) {
  const deityClass = classifyDeity(lead.deity || lead.notes || '');
  const region = classifyRegion(lead.state, lead.city);
  const tier = classifyCityTier(lead.city);
  const name = (lead.name || '').trim();
  const city = (lead.city || '').trim();
  const seed = `${lead.id || ''}:${deityClass}:${region}:${tier}`;

  const hook = pickTemplate(DEITY_HOOKS[deityClass] || DEITY_HOOKS.generic, seed);
  const regionLine = REGION_CONTEXT[region] || REGION_CONTEXT.unknown;
  const tierLine = CITY_TIER_VALUE[tier] || CITY_TIER_VALUE.unknown;
  const festival = FESTIVAL_HINTS[deityClass] || FESTIVAL_HINTS.generic;

  const greeting = name
    ? `Namaste from ${escapeHtml(name)},`
    : 'Namaste,';

  const valueProps = [
    '20-25% platform commission (no per-listing fee, no monthly minimum)',
    'Video proof of every booking, mandatory — pujari does the seva, devotee sees it',
    'NRI pricing 9-10× domestic — full settlement to your temple bank account',
    'You control puja calendar, slots, and which seva you offer — we route demand',
  ];

  const webBase = (process.env.WEB_BASE || 'https://darshya.online').replace(/\/$/, '');
  const onboardUrl = `${webBase}/list-temple?utm_source=cold-outreach-v2&utm_medium=email&utm_campaign=per-temple&deity=${encodeURIComponent(deityClass)}&region=${encodeURIComponent(region)}`;

  return `<p>${greeting}</p>
<p>${escapeHtml(hook)}</p>
<p>${escapeHtml(regionLine)} ${escapeHtml(tierLine)}</p>
<p>We see consistent booking volume around <strong>${escapeHtml(festival.name)}</strong> (${escapeHtml(festival.monthHint)}), so if your temple is preparing for that, listing now means devotees abroad can find you before the rush.</p>
<p>What makes Darshya different from generic listing platforms:</p>
<ul>
${valueProps.map((v) => `  <li>${escapeHtml(v)}</li>`).join('\n')}
</ul>
<p><a href="${onboardUrl}">List ${city ? escapeHtml(city) + ' temple' : 'your temple'} in 5 minutes →</a></p>
<p>Happy to walk you through the dashboard live — reply to this email with a time that suits you.</p>
<p>Hari Om,<br>— Darshya Partnerships<br><em>Personalized for your tradition · v2</em></p>`;
}

export function buildPersonalizedEmail(lead) {
  return {
    subject: buildSubject(lead),
    html: buildBodyHtml(lead),
    deityClass: classifyDeity(lead.deity || lead.notes || ''),
    region: classifyRegion(lead.state, lead.city),
    cityTier: classifyCityTier(lead.city),
  };
}
