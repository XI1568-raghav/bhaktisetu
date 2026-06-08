export interface CityRecord {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lng: number;
  tzOffsetMin: number;
}

export const CITIES: CityRecord[] = [
  // Tier-1 metros
  { name: 'Mumbai', state: 'Maharashtra', country: 'IN', lat: 19.0760, lng: 72.8777, tzOffsetMin: 330 },
  { name: 'Delhi', state: 'Delhi', country: 'IN', lat: 28.7041, lng: 77.1025, tzOffsetMin: 330 },
  { name: 'New Delhi', state: 'Delhi', country: 'IN', lat: 28.6139, lng: 77.2090, tzOffsetMin: 330 },
  { name: 'Bengaluru', state: 'Karnataka', country: 'IN', lat: 12.9716, lng: 77.5946, tzOffsetMin: 330 },
  { name: 'Hyderabad', state: 'Telangana', country: 'IN', lat: 17.3850, lng: 78.4867, tzOffsetMin: 330 },
  { name: 'Chennai', state: 'Tamil Nadu', country: 'IN', lat: 13.0827, lng: 80.2707, tzOffsetMin: 330 },
  { name: 'Kolkata', state: 'West Bengal', country: 'IN', lat: 22.5726, lng: 88.3639, tzOffsetMin: 330 },
  { name: 'Pune', state: 'Maharashtra', country: 'IN', lat: 18.5204, lng: 73.8567, tzOffsetMin: 330 },
  { name: 'Ahmedabad', state: 'Gujarat', country: 'IN', lat: 23.0225, lng: 72.5714, tzOffsetMin: 330 },
  { name: 'Jaipur', state: 'Rajasthan', country: 'IN', lat: 26.9124, lng: 75.7873, tzOffsetMin: 330 },
  { name: 'Lucknow', state: 'Uttar Pradesh', country: 'IN', lat: 26.8467, lng: 80.9462, tzOffsetMin: 330 },
  { name: 'Kanpur', state: 'Uttar Pradesh', country: 'IN', lat: 26.4499, lng: 80.3319, tzOffsetMin: 330 },
  { name: 'Nagpur', state: 'Maharashtra', country: 'IN', lat: 21.1458, lng: 79.0882, tzOffsetMin: 330 },
  { name: 'Indore', state: 'Madhya Pradesh', country: 'IN', lat: 22.7196, lng: 75.8577, tzOffsetMin: 330 },
  { name: 'Thane', state: 'Maharashtra', country: 'IN', lat: 19.2183, lng: 72.9781, tzOffsetMin: 330 },
  { name: 'Bhopal', state: 'Madhya Pradesh', country: 'IN', lat: 23.2599, lng: 77.4126, tzOffsetMin: 330 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'IN', lat: 17.6868, lng: 83.2185, tzOffsetMin: 330 },
  { name: 'Patna', state: 'Bihar', country: 'IN', lat: 25.6093, lng: 85.1376, tzOffsetMin: 330 },
  { name: 'Ludhiana', state: 'Punjab', country: 'IN', lat: 30.9010, lng: 75.8573, tzOffsetMin: 330 },
  { name: 'Agra', state: 'Uttar Pradesh', country: 'IN', lat: 27.1767, lng: 78.0081, tzOffsetMin: 330 },
  { name: 'Nashik', state: 'Maharashtra', country: 'IN', lat: 20.0063, lng: 73.7900, tzOffsetMin: 330 },
  { name: 'Faridabad', state: 'Haryana', country: 'IN', lat: 28.4089, lng: 77.3178, tzOffsetMin: 330 },
  { name: 'Meerut', state: 'Uttar Pradesh', country: 'IN', lat: 28.9845, lng: 77.7064, tzOffsetMin: 330 },
  { name: 'Rajkot', state: 'Gujarat', country: 'IN', lat: 22.3039, lng: 70.8022, tzOffsetMin: 330 },
  { name: 'Srinagar', state: 'J&K', country: 'IN', lat: 34.0837, lng: 74.7973, tzOffsetMin: 330 },
  { name: 'Coimbatore', state: 'Tamil Nadu', country: 'IN', lat: 11.0168, lng: 76.9558, tzOffsetMin: 330 },
  { name: 'Jabalpur', state: 'Madhya Pradesh', country: 'IN', lat: 23.1815, lng: 79.9864, tzOffsetMin: 330 },
  { name: 'Gwalior', state: 'Madhya Pradesh', country: 'IN', lat: 26.2183, lng: 78.1828, tzOffsetMin: 330 },
  { name: 'Vijayawada', state: 'Andhra Pradesh', country: 'IN', lat: 16.5062, lng: 80.6480, tzOffsetMin: 330 },
  { name: 'Jodhpur', state: 'Rajasthan', country: 'IN', lat: 26.2389, lng: 73.0243, tzOffsetMin: 330 },
  { name: 'Madurai', state: 'Tamil Nadu', country: 'IN', lat: 9.9252, lng: 78.1198, tzOffsetMin: 330 },
  { name: 'Raipur', state: 'Chhattisgarh', country: 'IN', lat: 21.2514, lng: 81.6296, tzOffsetMin: 330 },
  { name: 'Kota', state: 'Rajasthan', country: 'IN', lat: 25.2138, lng: 75.8648, tzOffsetMin: 330 },
  { name: 'Chandigarh', state: 'Chandigarh', country: 'IN', lat: 30.7333, lng: 76.7794, tzOffsetMin: 330 },
  { name: 'Gurgaon', state: 'Haryana', country: 'IN', lat: 28.4595, lng: 77.0266, tzOffsetMin: 330 },
  { name: 'Noida', state: 'Uttar Pradesh', country: 'IN', lat: 28.5355, lng: 77.3910, tzOffsetMin: 330 },
  { name: 'Dehradun', state: 'Uttarakhand', country: 'IN', lat: 30.3165, lng: 78.0322, tzOffsetMin: 330 },
  { name: 'Ranchi', state: 'Jharkhand', country: 'IN', lat: 23.3441, lng: 85.3096, tzOffsetMin: 330 },
  // Sacred cities / pilgrimage hubs
  { name: 'Varanasi', state: 'Uttar Pradesh', country: 'IN', lat: 25.3176, lng: 82.9739, tzOffsetMin: 330 },
  { name: 'Haridwar', state: 'Uttarakhand', country: 'IN', lat: 29.9457, lng: 78.1642, tzOffsetMin: 330 },
  { name: 'Rishikesh', state: 'Uttarakhand', country: 'IN', lat: 30.0869, lng: 78.2676, tzOffsetMin: 330 },
  { name: 'Ujjain', state: 'Madhya Pradesh', country: 'IN', lat: 23.1765, lng: 75.7885, tzOffsetMin: 330 },
  { name: 'Mathura', state: 'Uttar Pradesh', country: 'IN', lat: 27.4924, lng: 77.6737, tzOffsetMin: 330 },
  { name: 'Vrindavan', state: 'Uttar Pradesh', country: 'IN', lat: 27.5771, lng: 77.6987, tzOffsetMin: 330 },
  { name: 'Ayodhya', state: 'Uttar Pradesh', country: 'IN', lat: 26.7922, lng: 82.1998, tzOffsetMin: 330 },
  { name: 'Dwarka', state: 'Gujarat', country: 'IN', lat: 22.2394, lng: 68.9678, tzOffsetMin: 330 },
  { name: 'Puri', state: 'Odisha', country: 'IN', lat: 19.8135, lng: 85.8312, tzOffsetMin: 330 },
  { name: 'Tirupati', state: 'Andhra Pradesh', country: 'IN', lat: 13.6288, lng: 79.4192, tzOffsetMin: 330 },
  { name: 'Amritsar', state: 'Punjab', country: 'IN', lat: 31.6340, lng: 74.8723, tzOffsetMin: 330 },
  { name: 'Shirdi', state: 'Maharashtra', country: 'IN', lat: 19.7668, lng: 74.4771, tzOffsetMin: 330 },
  { name: 'Pushkar', state: 'Rajasthan', country: 'IN', lat: 26.4898, lng: 74.5511, tzOffsetMin: 330 },
  { name: 'Bodh Gaya', state: 'Bihar', country: 'IN', lat: 24.6961, lng: 84.9869, tzOffsetMin: 330 },
  { name: 'Rameswaram', state: 'Tamil Nadu', country: 'IN', lat: 9.2876, lng: 79.3129, tzOffsetMin: 330 },
  { name: 'Kanchipuram', state: 'Tamil Nadu', country: 'IN', lat: 12.8342, lng: 79.7036, tzOffsetMin: 330 },
  { name: 'Palani', state: 'Tamil Nadu', country: 'IN', lat: 10.4505, lng: 77.5163, tzOffsetMin: 330 },
  { name: 'Guruvayur', state: 'Kerala', country: 'IN', lat: 10.5926, lng: 76.0418, tzOffsetMin: 330 },
  { name: 'Panipat', state: 'Haryana', country: 'IN', lat: 29.3909, lng: 76.9635, tzOffsetMin: 330 },
  { name: 'Somnath', state: 'Gujarat', country: 'IN', lat: 20.8880, lng: 70.4013, tzOffsetMin: 330 },
  { name: 'Kedarnath', state: 'Uttarakhand', country: 'IN', lat: 30.7346, lng: 79.0669, tzOffsetMin: 330 },
  { name: 'Badrinath', state: 'Uttarakhand', country: 'IN', lat: 30.7433, lng: 79.4938, tzOffsetMin: 330 },
  { name: 'Gangotri', state: 'Uttarakhand', country: 'IN', lat: 30.9944, lng: 78.9382, tzOffsetMin: 330 },
  { name: 'Yamunotri', state: 'Uttarakhand', country: 'IN', lat: 31.0107, lng: 78.4636, tzOffsetMin: 330 },
  // NRI cities
  { name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278, tzOffsetMin: 0 },
  { name: 'New York', country: 'US', lat: 40.7128, lng: -74.0060, tzOffsetMin: -300 },
  { name: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194, tzOffsetMin: -480 },
  { name: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298, tzOffsetMin: -360 },
  { name: 'Houston', country: 'US', lat: 29.7604, lng: -95.3698, tzOffsetMin: -360 },
  { name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832, tzOffsetMin: -300 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093, tzOffsetMin: 600 },
  { name: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631, tzOffsetMin: 600 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708, tzOffsetMin: 240 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198, tzOffsetMin: 480 },
  { name: 'Kuala Lumpur', country: 'MY', lat: 3.1390, lng: 101.6869, tzOffsetMin: 480 },
  { name: 'Kathmandu', country: 'NP', lat: 27.7172, lng: 85.3240, tzOffsetMin: 345 },
  { name: 'Colombo', country: 'LK', lat: 6.9271, lng: 79.8612, tzOffsetMin: 330 },
];

const citiesLower = CITIES.map((c) => ({
  ...c,
  searchKey: `${c.name}${c.state ? ' ' + c.state : ''} ${c.country}`.toLowerCase(),
}));

export function findCity(query: string): CityRecord[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return citiesLower
    .filter((c) => c.searchKey.includes(q))
    .sort((a, b) => {
      const aStarts = a.searchKey.startsWith(q) ? 0 : 1;
      const bStarts = b.searchKey.startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, 8);
}

export function getCityExact(name: string): CityRecord | null {
  if (!name) return null;
  const q = name.toLowerCase().trim();
  return CITIES.find((c) => c.name.toLowerCase() === q) ?? null;
}

export function formatCityLabel(city: CityRecord): string {
  const ns = city.lat >= 0 ? 'N' : 'S';
  const ew = city.lng >= 0 ? 'E' : 'W';
  const tz = city.tzOffsetMin >= 0 ? `+${Math.floor(city.tzOffsetMin / 60)}:${String(city.tzOffsetMin % 60).padStart(2, '0')}` : `-${Math.floor(-city.tzOffsetMin / 60)}:${String(-city.tzOffsetMin % 60).padStart(2, '0')}`;
  return `${city.name}${city.state ? ', ' + city.state : ''} (${Math.abs(city.lat).toFixed(2)}${ns}, ${Math.abs(city.lng).toFixed(2)}${ew}) UTC${tz}`;
}
