/**
 * Static seed of Indian gaushalas (cow shelters). Heavy on Mathura,
 * Vrindavan, Pathmeda (Rajasthan — Sri Gopal Goverdhan Goshala is one
 * of Asia's largest), Ahmedabad, Pune. Used as baseline before live
 * scraping of DAHD / state mahasangh directories.
 */
import type { RawLead } from './_shared.js';

interface GaushalaSeedRow {
  name: string;
  city: string;
  state: string;
  size?: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const placeholderEmail = (name: string, city: string) =>
  `contact+${slug(name)}@${slug(city)}.gaushala.placeholder.in`;

const placeholderPhone = (name: string, city: string): string => {
  const seed = `gau:${name}:${city}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 41 + seed.charCodeAt(i)) >>> 0;
  const tail = String(h).padStart(9, '0').slice(0, 9);
  return `+916${tail}`;
};

const rows: GaushalaSeedRow[] = [
  // Pathmeda complex (Asia's largest)
  { name: 'Sri Gopal Goverdhan Pathmeda Gaushala', city: 'Pathmeda', state: 'Rajasthan', size: 'large' },
  { name: 'Pathmeda Godham Mahatirth', city: 'Pathmeda', state: 'Rajasthan', size: 'large' },
  // Mathura / Vrindavan belt
  { name: 'Sri Krishna Gaushala Mathura', city: 'Mathura', state: 'Uttar Pradesh', size: 'large' },
  { name: 'Care for Cows Vrindavan', city: 'Vrindavan', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Maa Surabhi Gaushala', city: 'Vrindavan', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Akshaya Patra Govardhan Eco Village Gaushala', city: 'Vrindavan', state: 'Uttar Pradesh', size: 'large' },
  { name: 'Radha Surabhi Gaushala', city: 'Vrindavan', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'ISKCON Goshala Vrindavan', city: 'Vrindavan', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Sri Mathuradheesh Gaushala', city: 'Mathura', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Govardhan Gaushala', city: 'Govardhan', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Barsana Gaushala Samiti', city: 'Barsana', state: 'Uttar Pradesh', size: 'small' },
  // Ahmedabad / Gujarat
  { name: 'Shree Mahuva Gopalak Mandali Gaushala', city: 'Mahuva', state: 'Gujarat', size: 'large' },
  { name: 'Ahmedabad Panjarapole Gaushala', city: 'Ahmedabad', state: 'Gujarat', size: 'large' },
  { name: 'Sri Bhagwati Gaushala', city: 'Ahmedabad', state: 'Gujarat', size: 'medium' },
  { name: 'Junagadh Panjarapole', city: 'Junagadh', state: 'Gujarat', size: 'medium' },
  { name: 'Bhavnagar Panjarapole', city: 'Bhavnagar', state: 'Gujarat', size: 'medium' },
  { name: 'Surat Panjarapole', city: 'Surat', state: 'Gujarat', size: 'medium' },
  { name: 'Vadodara Panjarapole', city: 'Vadodara', state: 'Gujarat', size: 'medium' },
  { name: 'Dwarka Gaushala', city: 'Dwarka', state: 'Gujarat', size: 'small' },
  // Pune / Maharashtra
  { name: 'Sri Sai Gomata Seva Sansthan', city: 'Pune', state: 'Maharashtra', size: 'medium' },
  { name: 'Bhagwan Mahavir Gaushala Pune', city: 'Pune', state: 'Maharashtra', size: 'medium' },
  { name: 'Akhil Bharatiya Krishi Goseva Sangh', city: 'Wardha', state: 'Maharashtra', size: 'medium' },
  { name: 'Goseva Aayog Gaushala', city: 'Nagpur', state: 'Maharashtra', size: 'medium' },
  { name: 'Devlapar Goshala', city: 'Nagpur', state: 'Maharashtra', size: 'medium' },
  { name: 'Sri Krishna Gaushala Mumbai', city: 'Mumbai', state: 'Maharashtra', size: 'medium' },
  { name: 'BSGS Goshala Sangli', city: 'Sangli', state: 'Maharashtra', size: 'medium' },
  // Rajasthan beyond Pathmeda
  { name: 'Sri Krishnayan Desi Gauraksha Evum Anusandhan Sansthan', city: 'Salumber', state: 'Rajasthan', size: 'large' },
  { name: 'Hingonia Gaushala', city: 'Jaipur', state: 'Rajasthan', size: 'large' },
  { name: 'Pinjrapole Gaushala Bikaner', city: 'Bikaner', state: 'Rajasthan', size: 'medium' },
  { name: 'Jodhpur Gaushala Sansthan', city: 'Jodhpur', state: 'Rajasthan', size: 'medium' },
  { name: 'Mahatma Gandhi Gaushala Udaipur', city: 'Udaipur', state: 'Rajasthan', size: 'medium' },
  // MP
  { name: 'Sri Surabhi Gaushala', city: 'Indore', state: 'Madhya Pradesh', size: 'medium' },
  { name: 'Adarsh Gaushala Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', size: 'medium' },
  { name: 'Sri Krishna Gaushala Ujjain', city: 'Ujjain', state: 'Madhya Pradesh', size: 'medium' },
  // Haryana
  { name: 'Sri Krishna Gaushala Bahalgarh', city: 'Sonipat', state: 'Haryana', size: 'large' },
  { name: 'Lala Lajpat Rai Gaushala', city: 'Hisar', state: 'Haryana', size: 'medium' },
  { name: 'Kurukshetra Gaushala', city: 'Kurukshetra', state: 'Haryana', size: 'medium' },
  // Delhi
  { name: 'Sri Krishna Gaushala Bawana', city: 'Delhi', state: 'Delhi', size: 'large' },
  { name: 'Aggarwal Gaushala Rewari Line', city: 'Delhi', state: 'Delhi', size: 'medium' },
  // UP beyond Mathura belt
  { name: 'Hanuman Gaushala Kanpur', city: 'Kanpur', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Sri Sankat Mochan Gaushala', city: 'Varanasi', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Ayodhya Gaushala Samiti', city: 'Ayodhya', state: 'Uttar Pradesh', size: 'medium' },
  { name: 'Lucknow Gaushala Samiti', city: 'Lucknow', state: 'Uttar Pradesh', size: 'medium' },
  // Karnataka
  { name: 'Sri Ramachandrapura Math Gaushala', city: 'Hosanagara', state: 'Karnataka', size: 'large' },
  { name: 'Bengaluru Gaushala Trust', city: 'Bengaluru', state: 'Karnataka', size: 'medium' },
  // Andhra / Telangana
  { name: 'Sri Venkateswara Gosamrakshana Sala TTD', city: 'Tirupati', state: 'Andhra Pradesh', size: 'large' },
  { name: 'Hyderabad Goshala', city: 'Hyderabad', state: 'Telangana', size: 'medium' },
  // Bihar / Odisha
  { name: 'Patna Gaushala', city: 'Patna', state: 'Bihar', size: 'medium' },
  { name: 'Sri Jagannath Gaushala', city: 'Puri', state: 'Odisha', size: 'medium' },
  // Punjab
  { name: 'Sri Krishna Gaushala Ludhiana', city: 'Ludhiana', state: 'Punjab', size: 'medium' },
  { name: 'Amritsar Gaushala', city: 'Amritsar', state: 'Punjab', size: 'medium' },
  // West Bengal
  { name: 'Mayapur ISKCON Goshala', city: 'Mayapur', state: 'West Bengal', size: 'medium' },
];

export const GAUSHALA_SEED: RawLead[] = rows.map((r) => ({
  name: r.name,
  city: r.city,
  state: r.state,
  country: 'India',
  email: placeholderEmail(r.name, r.city),
  phone: placeholderPhone(r.name, r.city),
  source: 'gaushala_static',
  sourceUrl: null,
  metadata: {
    seedRecord: true,
    size: r.size ?? null,
  },
}));
