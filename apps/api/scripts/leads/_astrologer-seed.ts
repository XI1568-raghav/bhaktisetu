/**
 * Static seed of Indian astrologers used as baseline before
 * (and fallback for) live scraping of AstroSage / JustDial. Mix of
 * vedic, tarot, numerology, lal-kitab, KP-system specialities across
 * major cities. Real contact is enriched by later scraper passes.
 */
import type { RawLead } from './_shared.js';

interface AstroSeedRow {
  name: string;
  city: string;
  state: string;
  speciality: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const placeholderEmail = (name: string, city: string) =>
  `contact+${slug(name)}@${slug(city)}.astrologer.placeholder.in`;

const placeholderPhone = (name: string, city: string): string => {
  const seed = `astro:${name}:${city}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  const tail = String(h).padStart(9, '0').slice(0, 9);
  return `+918${tail}`;
};

const rows: AstroSeedRow[] = [
  // Delhi
  { name: 'Acharya Indu Prakash', city: 'Delhi', state: 'Delhi', speciality: 'vedic' },
  { name: 'Astrologer Sunita Menon', city: 'Delhi', state: 'Delhi', speciality: 'tarot' },
  { name: 'Pandit Jagannath Guruji', city: 'Delhi', state: 'Delhi', speciality: 'vedic/lal-kitab' },
  { name: 'Acharya Sandeep Kochhar', city: 'Delhi', state: 'Delhi', speciality: 'numerology' },
  { name: 'Sushil Kumar Joshi', city: 'Delhi', state: 'Delhi', speciality: 'KP system' },
  // Mumbai
  { name: 'Bejan Daruwalla Successors', city: 'Mumbai', state: 'Maharashtra', speciality: 'vedic' },
  { name: 'Acharya Sanjay Rath', city: 'Mumbai', state: 'Maharashtra', speciality: 'jaimini' },
  { name: 'Astrologer Shailendra Pandey', city: 'Mumbai', state: 'Maharashtra', speciality: 'vedic/numerology' },
  { name: 'Sundeep Kochar', city: 'Mumbai', state: 'Maharashtra', speciality: 'vedic celebrity' },
  { name: 'Astrologer Jaya Karamchandani', city: 'Mumbai', state: 'Maharashtra', speciality: 'tarot' },
  // Bengaluru
  { name: 'Sri Krishna Rao Jyotishi', city: 'Bengaluru', state: 'Karnataka', speciality: 'vedic' },
  { name: 'Acharya Anand Bhardwaj', city: 'Bengaluru', state: 'Karnataka', speciality: 'KP system' },
  { name: 'Astrologer Priya Sachdev', city: 'Bengaluru', state: 'Karnataka', speciality: 'tarot/numerology' },
  { name: 'Pandit Hari Krishna Rao', city: 'Bengaluru', state: 'Karnataka', speciality: 'vedic/parashari' },
  // Hyderabad
  { name: 'Sri Veerabhadra Sastry', city: 'Hyderabad', state: 'Telangana', speciality: 'vedic' },
  { name: 'Astrologer Padmavathi', city: 'Hyderabad', state: 'Telangana', speciality: 'numerology' },
  { name: 'Sri Ramachandra Sastry', city: 'Hyderabad', state: 'Telangana', speciality: 'vedic/jaimini' },
  // Pune
  { name: 'Guruji Ashok Bhatewara', city: 'Pune', state: 'Maharashtra', speciality: 'vedic' },
  { name: 'Astrologer Manjushree Joshi', city: 'Pune', state: 'Maharashtra', speciality: 'tarot' },
  { name: 'Pandit Suhas Khairnar', city: 'Pune', state: 'Maharashtra', speciality: 'vedic/vastu' },
  // Kolkata
  { name: 'Tantrik Acharya Sourav Roy', city: 'Kolkata', state: 'West Bengal', speciality: 'tantra/vedic' },
  { name: 'Astrologer Nilanjana Bhattacharya', city: 'Kolkata', state: 'West Bengal', speciality: 'tarot' },
  { name: 'Pandit Pradip Mukherjee', city: 'Kolkata', state: 'West Bengal', speciality: 'vedic' },
  { name: 'Acharya Amit Sen', city: 'Kolkata', state: 'West Bengal', speciality: 'numerology' },
  // Chennai
  { name: 'Sri C V Subramaniam', city: 'Chennai', state: 'Tamil Nadu', speciality: 'vedic/nadi' },
  { name: 'Astrologer Olivannan', city: 'Chennai', state: 'Tamil Nadu', speciality: 'nadi astrology' },
  { name: 'Sri Hariharan Iyer', city: 'Chennai', state: 'Tamil Nadu', speciality: 'KP system' },
  { name: 'Sri Mahadevan Sastrigal', city: 'Chennai', state: 'Tamil Nadu', speciality: 'vedic/parashari' },
  // Varanasi
  { name: 'Pandit Yogendra Mahurkar', city: 'Varanasi', state: 'Uttar Pradesh', speciality: 'vedic' },
  { name: 'Acharya Bhairav Joshi', city: 'Varanasi', state: 'Uttar Pradesh', speciality: 'tantra/jyotish' },
  { name: 'Pandit Ramashankar Tripathi', city: 'Varanasi', state: 'Uttar Pradesh', speciality: 'vedic/lal-kitab' },
  // Jaipur
  { name: 'Pandit Sumeet Vyas', city: 'Jaipur', state: 'Rajasthan', speciality: 'vedic' },
  { name: 'Astrologer Hemant Sharma', city: 'Jaipur', state: 'Rajasthan', speciality: 'numerology' },
  { name: 'Acharya Mahavir Sharma', city: 'Jaipur', state: 'Rajasthan', speciality: 'vedic/vastu' },
  // Lucknow
  { name: 'Pandit Pradeep Mishra', city: 'Lucknow', state: 'Uttar Pradesh', speciality: 'vedic' },
  { name: 'Acharya Kalki Krishnan', city: 'Lucknow', state: 'Uttar Pradesh', speciality: 'KP system' },
  // Ahmedabad
  { name: 'Pandit Janardhan Bhatt', city: 'Ahmedabad', state: 'Gujarat', speciality: 'vedic' },
  { name: 'Astrologer Bhavesh Pattni', city: 'Ahmedabad', state: 'Gujarat', speciality: 'numerology/tarot' },
  // Indore
  { name: 'Pandit Pradeep Pandya', city: 'Indore', state: 'Madhya Pradesh', speciality: 'vedic' },
  { name: 'Acharya Suresh Shrimali', city: 'Indore', state: 'Madhya Pradesh', speciality: 'lal-kitab' },
  // Bhopal
  { name: 'Pandit Vinay Tiwari', city: 'Bhopal', state: 'Madhya Pradesh', speciality: 'vedic' },
  // Chandigarh
  { name: 'Astrologer Sumit Sahni', city: 'Chandigarh', state: 'Chandigarh', speciality: 'vedic/lal-kitab' },
  { name: 'Pandit Harish Mongia', city: 'Chandigarh', state: 'Chandigarh', speciality: 'numerology' },
  // Surat
  { name: 'Acharya Pranav Mehta', city: 'Surat', state: 'Gujarat', speciality: 'vedic' },
  // Gurgaon
  { name: 'Astrologer Aarti Bhalla', city: 'Gurgaon', state: 'Haryana', speciality: 'tarot' },
  { name: 'Pandit Niraj Mancchanda', city: 'Gurgaon', state: 'Haryana', speciality: 'vedic/vastu' },
  // Noida
  { name: 'Acharya Devraj Tyagi', city: 'Noida', state: 'Uttar Pradesh', speciality: 'vedic' },
  // Patna
  { name: 'Pandit Ashutosh Pathak', city: 'Patna', state: 'Bihar', speciality: 'vedic' },
  // Coimbatore
  { name: 'Sri Sundara Murthy Iyer', city: 'Coimbatore', state: 'Tamil Nadu', speciality: 'nadi/vedic' },
  // Mysuru
  { name: 'Sri Anantha Krishna Bhat', city: 'Mysuru', state: 'Karnataka', speciality: 'vedic' },
  // Trivandrum
  { name: 'Sri Narayanan Namboothiri', city: 'Thiruvananthapuram', state: 'Kerala', speciality: 'vedic/prashna' },
  { name: 'Acharya Krishnan Potti', city: 'Thiruvananthapuram', state: 'Kerala', speciality: 'kerala vastu' },
];

export const ASTROLOGER_SEED: RawLead[] = rows.map((r) => ({
  name: r.name,
  city: r.city,
  state: r.state,
  country: 'India',
  email: placeholderEmail(r.name, r.city),
  phone: placeholderPhone(r.name, r.city),
  source: 'astrosage_static',
  sourceUrl: null,
  metadata: {
    seedRecord: true,
    speciality: r.speciality,
  },
}));
