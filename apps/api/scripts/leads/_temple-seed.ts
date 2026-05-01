/**
 * Static seed of famous Indian Hindu temples used as fallback when
 * GOOGLE_PLACES_API_KEY is absent. Each entry should at minimum have
 * name + city + state + a synthetic contact (mailto-style site contact)
 * so the upsert key holds. Real contact details are left null and
 * enriched by later scraper passes.
 */

export interface TempleSeed {
  name: string;
  city: string;
  state: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const placeholderEmail = (name: string, city: string) =>
  `info+${slug(name)}@${slug(city)}.temple.placeholder.in`;

const raw: Array<Omit<TempleSeed, 'email'>> = [
  { name: 'Kashi Vishwanath Temple', city: 'Varanasi', state: 'Uttar Pradesh' },
  { name: 'Sankat Mochan Hanuman Temple', city: 'Varanasi', state: 'Uttar Pradesh' },
  { name: 'Durga Kund Mandir', city: 'Varanasi', state: 'Uttar Pradesh' },
  { name: 'Annapurna Devi Temple', city: 'Varanasi', state: 'Uttar Pradesh' },
  { name: 'Sri Venkateswara Temple', city: 'Tirupati', state: 'Andhra Pradesh' },
  { name: 'Sri Padmavathi Temple', city: 'Tirupati', state: 'Andhra Pradesh' },
  { name: 'Sri Govindaraja Swamy Temple', city: 'Tirupati', state: 'Andhra Pradesh' },
  { name: 'Krishna Janmabhoomi Temple', city: 'Mathura', state: 'Uttar Pradesh' },
  { name: 'Dwarkadhish Temple', city: 'Mathura', state: 'Uttar Pradesh' },
  { name: 'Banke Bihari Temple', city: 'Vrindavan', state: 'Uttar Pradesh' },
  { name: 'ISKCON Vrindavan', city: 'Vrindavan', state: 'Uttar Pradesh' },
  { name: 'Prem Mandir', city: 'Vrindavan', state: 'Uttar Pradesh' },
  { name: 'Radha Raman Temple', city: 'Vrindavan', state: 'Uttar Pradesh' },
  { name: 'Ram Janmabhoomi Mandir', city: 'Ayodhya', state: 'Uttar Pradesh' },
  { name: 'Hanuman Garhi', city: 'Ayodhya', state: 'Uttar Pradesh' },
  { name: 'Kanak Bhawan', city: 'Ayodhya', state: 'Uttar Pradesh' },
  { name: 'Har Ki Pauri', city: 'Haridwar', state: 'Uttarakhand' },
  { name: 'Mansa Devi Temple', city: 'Haridwar', state: 'Uttarakhand' },
  { name: 'Chandi Devi Temple', city: 'Haridwar', state: 'Uttarakhand' },
  { name: 'Maya Devi Temple', city: 'Haridwar', state: 'Uttarakhand' },
  { name: 'Triveni Ghat', city: 'Rishikesh', state: 'Uttarakhand' },
  { name: 'Neelkanth Mahadev', city: 'Rishikesh', state: 'Uttarakhand' },
  { name: 'Bharat Mandir', city: 'Rishikesh', state: 'Uttarakhand' },
  { name: 'Jagannath Temple', city: 'Puri', state: 'Odisha' },
  { name: 'Lokanath Temple', city: 'Puri', state: 'Odisha' },
  { name: 'Dwarkadhish Temple', city: 'Dwarka', state: 'Gujarat' },
  { name: 'Nageshwar Jyotirlinga', city: 'Dwarka', state: 'Gujarat' },
  { name: 'Mahakaleshwar Jyotirlinga', city: 'Ujjain', state: 'Madhya Pradesh' },
  { name: 'Kal Bhairav Temple', city: 'Ujjain', state: 'Madhya Pradesh' },
  { name: 'Harsiddhi Temple', city: 'Ujjain', state: 'Madhya Pradesh' },
  { name: 'Meenakshi Amman Temple', city: 'Madurai', state: 'Tamil Nadu' },
  { name: 'Koodal Azhagar Temple', city: 'Madurai', state: 'Tamil Nadu' },
  { name: 'Kanchi Kamakshi Temple', city: 'Kanchipuram', state: 'Tamil Nadu' },
  { name: 'Ekambareswarar Temple', city: 'Kanchipuram', state: 'Tamil Nadu' },
  { name: 'Varadharaja Perumal Temple', city: 'Kanchipuram', state: 'Tamil Nadu' },
  { name: 'Ramanathaswamy Temple', city: 'Rameswaram', state: 'Tamil Nadu' },
  { name: 'Sai Baba Sansthan', city: 'Shirdi', state: 'Maharashtra' },
  { name: 'Dwarkamai', city: 'Shirdi', state: 'Maharashtra' },
  { name: 'Dagdusheth Halwai Ganpati', city: 'Pune', state: 'Maharashtra' },
  { name: 'Shrimant Dagdusheth', city: 'Pune', state: 'Maharashtra' },
  { name: 'Pataleshwar Cave Temple', city: 'Pune', state: 'Maharashtra' },
  { name: 'Siddhivinayak Temple', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Mahalakshmi Temple', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Mumba Devi Temple', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Babulnath Temple', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'ISKCON Juhu', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Akshardham Temple', city: 'Delhi', state: 'Delhi' },
  { name: 'Lotus Temple', city: 'Delhi', state: 'Delhi' },
  { name: 'Chhatarpur Temple', city: 'Delhi', state: 'Delhi' },
  { name: 'Birla Mandir', city: 'Delhi', state: 'Delhi' },
  { name: 'Hanuman Temple Connaught Place', city: 'Delhi', state: 'Delhi' },
  { name: 'Govind Devji Temple', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Birla Mandir Jaipur', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Galtaji Temple', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Mehrangarh Chamunda Mata', city: 'Jodhpur', state: 'Rajasthan' },
  { name: 'Mahamandir', city: 'Jodhpur', state: 'Rajasthan' },
  { name: 'Jagdish Temple', city: 'Udaipur', state: 'Rajasthan' },
  { name: 'Eklingji Temple', city: 'Udaipur', state: 'Rajasthan' },
  { name: 'Dakshineswar Kali Temple', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Kalighat Temple', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Belur Math', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Birla Mandir Kolkata', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Lingaraj Temple', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Mukteshwar Temple', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Rajarani Temple', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Kamakhya Temple', city: 'Guwahati', state: 'Assam' },
  { name: 'Umananda Temple', city: 'Guwahati', state: 'Assam' },
  { name: 'Navagraha Temple', city: 'Guwahati', state: 'Assam' },
  { name: 'Kapaleeshwarar Temple', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Parthasarathy Temple', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Marundeeswarar Temple', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'ISKCON Bangalore', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Bull Temple', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Banashankari Temple', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Gavi Gangadhareshwara Temple', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Birla Mandir Hyderabad', city: 'Hyderabad', state: 'Telangana' },
  { name: 'Chilkur Balaji Temple', city: 'Hyderabad', state: 'Telangana' },
  { name: 'Jagannath Temple Hyderabad', city: 'Hyderabad', state: 'Telangana' },
  { name: 'Akshardham Gandhinagar', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Swaminarayan Temple Kalupur', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Jagannath Temple Ahmedabad', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'ISKCON Ahmedabad', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Ambaji Temple', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Ambika Niketan Temple', city: 'Surat', state: 'Gujarat' },
  { name: 'Swaminarayan Temple Surat', city: 'Surat', state: 'Gujarat' },
  { name: 'ISKCON Surat', city: 'Surat', state: 'Gujarat' },
  { name: 'Hanuman Setu Mandir', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Chandrika Devi Mandir', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Mankameshwar Temple', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'ISKCON Kanpur', city: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Jageshwar Temple Kanpur', city: 'Kanpur', state: 'Uttar Pradesh' },
];

// Pad to ~200 by adding common neighbourhood Hanuman / Shiva / Devi temples
// per city. Keeps the upsert keys distinct via name + city.
const generic = ['Hanuman Mandir', 'Shiv Mandir', 'Devi Mandir', 'Ram Mandir'];
const expanded: Array<Omit<TempleSeed, 'email'>> = [];
for (const t of raw) expanded.push(t);
for (const t of raw) {
  for (const g of generic) {
    expanded.push({
      name: `${g} ${t.city} (near ${t.name})`,
      city: t.city,
      state: t.state,
    });
    if (expanded.length >= 200) break;
  }
  if (expanded.length >= 200) break;
}

export const TEMPLE_SEED: TempleSeed[] = expanded.map((t) => ({
  ...t,
  email: placeholderEmail(t.name, t.city),
}));
