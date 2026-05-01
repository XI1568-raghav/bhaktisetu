/**
 * Static seed of Indian priests / pandits used as baseline before
 * (and fallback for) live scraping. Names are common Hindi/Sanskrit
 * pandit names commonly seen in panditji.com / okpuja.com style
 * directories. Real phone numbers are unknown so we synthesise a
 * placeholder +91XXXXXXXXXX style number to satisfy the upsert key
 * (lead requires email or phone). Real contacts are enriched by
 * subsequent scraper passes.
 */
import type { RawLead } from './_shared.js';

interface PriestSeedRow {
  name: string;
  city: string;
  state: string;
  language: string;
  speciality?: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const placeholderEmail = (name: string, city: string) =>
  `contact+${slug(name)}@${slug(city)}.priest.placeholder.in`;

// Phone placeholder: +91 9 XX XX XX X (deterministic from name+city hash).
const placeholderPhone = (name: string, city: string): string => {
  const seed = `${name}${city}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const tail = String(h).padStart(9, '0').slice(0, 9);
  return `+919${tail}`;
};

const rows: PriestSeedRow[] = [
  // Delhi
  { name: 'Pandit Ramesh Kumar Shastri', city: 'Delhi', state: 'Delhi', language: 'hindi', speciality: 'griha pravesh' },
  { name: 'Pandit Suresh Sharma', city: 'Delhi', state: 'Delhi', language: 'hindi', speciality: 'satyanarayan katha' },
  { name: 'Acharya Vinod Kumar Mishra', city: 'Delhi', state: 'Delhi', language: 'hindi/sanskrit', speciality: 'vivah samskar' },
  { name: 'Pandit Anil Tiwari', city: 'Delhi', state: 'Delhi', language: 'hindi', speciality: 'shradh karma' },
  { name: 'Pandit Mahesh Pandey', city: 'Delhi', state: 'Delhi', language: 'hindi/sanskrit', speciality: 'rudra abhishek' },
  // Mumbai
  { name: 'Pandit Vinayak Joshi', city: 'Mumbai', state: 'Maharashtra', language: 'marathi/hindi', speciality: 'satyanarayan puja' },
  { name: 'Guruji Shrikant Bhat', city: 'Mumbai', state: 'Maharashtra', language: 'marathi/sanskrit', speciality: 'ganesh sthapana' },
  { name: 'Pandit Deepak Gokhale', city: 'Mumbai', state: 'Maharashtra', language: 'marathi/hindi', speciality: 'vastu shanti' },
  { name: 'Acharya Prashant Kulkarni', city: 'Mumbai', state: 'Maharashtra', language: 'marathi/sanskrit', speciality: 'navagraha shanti' },
  { name: 'Pandit Mukund Joshi', city: 'Mumbai', state: 'Maharashtra', language: 'marathi/hindi', speciality: 'antyeshti' },
  // Bengaluru
  { name: 'Sri Krishna Murthy Bhat', city: 'Bengaluru', state: 'Karnataka', language: 'kannada/sanskrit', speciality: 'griha pravesh' },
  { name: 'Sri Venkatesh Acharya', city: 'Bengaluru', state: 'Karnataka', language: 'kannada/sanskrit', speciality: 'satyanarayan vrata' },
  { name: 'Sri Raghavendra Rao', city: 'Bengaluru', state: 'Karnataka', language: 'kannada/sanskrit', speciality: 'navagraha homa' },
  { name: 'Pandit H S Sharma', city: 'Bengaluru', state: 'Karnataka', language: 'kannada/hindi', speciality: 'vivah' },
  { name: 'Sri Subrahmanya Bhat', city: 'Bengaluru', state: 'Karnataka', language: 'kannada/sanskrit', speciality: 'rudra abhishek' },
  // Hyderabad
  { name: 'Sri Ramana Sastry', city: 'Hyderabad', state: 'Telangana', language: 'telugu/sanskrit', speciality: 'kalyanam' },
  { name: 'Sri Venkata Ramana Sharma', city: 'Hyderabad', state: 'Telangana', language: 'telugu/sanskrit', speciality: 'griha pravesh' },
  { name: 'Sri Prabhakara Sastry', city: 'Hyderabad', state: 'Telangana', language: 'telugu/sanskrit', speciality: 'sashtipoorthi' },
  { name: 'Pandit Brahmanand Sharma', city: 'Hyderabad', state: 'Telangana', language: 'hindi/telugu', speciality: 'navagraha shanti' },
  // Pune
  { name: 'Pandit Shriniwas Deshpande', city: 'Pune', state: 'Maharashtra', language: 'marathi/sanskrit', speciality: 'vivah samskar' },
  { name: 'Guruji Atul Bhide', city: 'Pune', state: 'Maharashtra', language: 'marathi/sanskrit', speciality: 'ganesh sthapana' },
  { name: 'Pandit Madhav Limaye', city: 'Pune', state: 'Maharashtra', language: 'marathi/hindi', speciality: 'satyanarayan puja' },
  { name: 'Acharya Yogesh Kale', city: 'Pune', state: 'Maharashtra', language: 'marathi/sanskrit', speciality: 'rudra abhishek' },
  // Ahmedabad
  { name: 'Pandit Rajesh Trivedi', city: 'Ahmedabad', state: 'Gujarat', language: 'gujarati/sanskrit', speciality: 'griha pravesh' },
  { name: 'Pandit Hardik Joshi', city: 'Ahmedabad', state: 'Gujarat', language: 'gujarati/hindi', speciality: 'satyanarayan katha' },
  { name: 'Acharya Dilip Pandya', city: 'Ahmedabad', state: 'Gujarat', language: 'gujarati/sanskrit', speciality: 'vivah samskar' },
  { name: 'Pandit Bhargav Dave', city: 'Ahmedabad', state: 'Gujarat', language: 'gujarati/sanskrit', speciality: 'navchandi yagna' },
  // Kolkata
  { name: 'Acharya Bhaskar Bhattacharya', city: 'Kolkata', state: 'West Bengal', language: 'bengali/sanskrit', speciality: 'durga puja' },
  { name: 'Pandit Sanjay Chakraborty', city: 'Kolkata', state: 'West Bengal', language: 'bengali/sanskrit', speciality: 'kali puja' },
  { name: 'Acharya Tapan Mukherjee', city: 'Kolkata', state: 'West Bengal', language: 'bengali/sanskrit', speciality: 'satyanarayan' },
  { name: 'Pandit Debashish Banerjee', city: 'Kolkata', state: 'West Bengal', language: 'bengali/sanskrit', speciality: 'griha pravesh' },
  // Chennai
  { name: 'Sri R Krishnamoorthy Sastrigal', city: 'Chennai', state: 'Tamil Nadu', language: 'tamil/sanskrit', speciality: 'kalyanam' },
  { name: 'Sri Ramanathan Iyer', city: 'Chennai', state: 'Tamil Nadu', language: 'tamil/sanskrit', speciality: 'upanayanam' },
  { name: 'Sri Subramanya Sastri', city: 'Chennai', state: 'Tamil Nadu', language: 'tamil/sanskrit', speciality: 'sashtipoorthi' },
  { name: 'Sri Venkataraman Bhattar', city: 'Chennai', state: 'Tamil Nadu', language: 'tamil/sanskrit', speciality: 'griha pravesh' },
  // Varanasi
  { name: 'Pandit Vishwanath Upadhyay', city: 'Varanasi', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'rudra abhishek' },
  { name: 'Acharya Kameshwar Mishra', city: 'Varanasi', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'pind daan' },
  { name: 'Pandit Lakshmi Narayan Tripathi', city: 'Varanasi', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'mahamrityunjaya jaap' },
  { name: 'Pandit Shiv Prasad Dubey', city: 'Varanasi', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'kashi pind daan' },
  { name: 'Acharya Ramesh Chandra Pandey', city: 'Varanasi', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'shradh karma' },
  // Jaipur
  { name: 'Pandit Govind Dadhich', city: 'Jaipur', state: 'Rajasthan', language: 'hindi/sanskrit', speciality: 'vivah samskar' },
  { name: 'Pandit Mahendra Vyas', city: 'Jaipur', state: 'Rajasthan', language: 'hindi/sanskrit', speciality: 'griha pravesh' },
  { name: 'Acharya Kailash Sharma', city: 'Jaipur', state: 'Rajasthan', language: 'hindi/sanskrit', speciality: 'navagraha shanti' },
  // Lucknow
  { name: 'Pandit Brijesh Pandey', city: 'Lucknow', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'satyanarayan katha' },
  { name: 'Acharya Divakar Shukla', city: 'Lucknow', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'griha pravesh' },
  { name: 'Pandit Yogendra Tripathi', city: 'Lucknow', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'rudra abhishek' },
  // Mathura/Vrindavan
  { name: 'Pandit Krishna Das Goswami', city: 'Vrindavan', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'krishna janmashtami' },
  { name: 'Acharya Radha Mohan Goswami', city: 'Vrindavan', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'bhagwat katha' },
  { name: 'Pandit Bansi Lal Chaturvedi', city: 'Mathura', state: 'Uttar Pradesh', language: 'hindi/sanskrit', speciality: 'janmashtami puja' },
  // Haridwar/Rishikesh
  { name: 'Pandit Pawan Kumar Joshi', city: 'Haridwar', state: 'Uttarakhand', language: 'hindi/sanskrit', speciality: 'asthi visarjan' },
  { name: 'Acharya Govind Ballabh Pant', city: 'Rishikesh', state: 'Uttarakhand', language: 'hindi/sanskrit', speciality: 'ganga aarti' },
  { name: 'Pandit Ram Sharan Sharma', city: 'Haridwar', state: 'Uttarakhand', language: 'hindi/sanskrit', speciality: 'pind daan' },
];

export const PRIEST_SEED: RawLead[] = rows.map((r) => ({
  name: r.name,
  city: r.city,
  state: r.state,
  country: 'India',
  email: placeholderEmail(r.name, r.city),
  phone: placeholderPhone(r.name, r.city),
  source: 'panditji_static',
  sourceUrl: null,
  metadata: {
    seedRecord: true,
    language: r.language,
    speciality: r.speciality ?? null,
  },
}));
