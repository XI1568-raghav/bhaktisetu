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
  // Haryana tier-2/3
  { name: 'Karnal', state: 'Haryana', country: 'IN', lat: 29.6857, lng: 76.9905, tzOffsetMin: 330 },
  { name: 'Hisar', state: 'Haryana', country: 'IN', lat: 29.1492, lng: 75.7217, tzOffsetMin: 330 },
  { name: 'Rohtak', state: 'Haryana', country: 'IN', lat: 28.8955, lng: 76.6066, tzOffsetMin: 330 },
  { name: 'Ambala', state: 'Haryana', country: 'IN', lat: 30.3782, lng: 76.7767, tzOffsetMin: 330 },
  { name: 'Sonipat', state: 'Haryana', country: 'IN', lat: 28.9931, lng: 77.0151, tzOffsetMin: 330 },
  { name: 'Yamunanagar', state: 'Haryana', country: 'IN', lat: 30.1290, lng: 77.2674, tzOffsetMin: 330 },
  { name: 'Kurukshetra', state: 'Haryana', country: 'IN', lat: 29.9695, lng: 76.8783, tzOffsetMin: 330 },
  { name: 'Rewari', state: 'Haryana', country: 'IN', lat: 28.1972, lng: 76.6195, tzOffsetMin: 330 },
  { name: 'Bahadurgarh', state: 'Haryana', country: 'IN', lat: 28.6925, lng: 76.9341, tzOffsetMin: 330 },
  { name: 'Bhiwani', state: 'Haryana', country: 'IN', lat: 28.7975, lng: 76.1322, tzOffsetMin: 330 },
  { name: 'Sirsa', state: 'Haryana', country: 'IN', lat: 29.5346, lng: 75.0150, tzOffsetMin: 330 },
  { name: 'Jind', state: 'Haryana', country: 'IN', lat: 29.3159, lng: 76.3142, tzOffsetMin: 330 },
  { name: 'Palwal', state: 'Haryana', country: 'IN', lat: 28.1487, lng: 77.3320, tzOffsetMin: 330 },
  { name: 'Hansi', state: 'Haryana', country: 'IN', lat: 29.1100, lng: 75.9663, tzOffsetMin: 330 },
  { name: 'Pinjore', state: 'Haryana', country: 'IN', lat: 30.7975, lng: 76.9156, tzOffsetMin: 330 },
  { name: 'Mahendragarh', state: 'Haryana', country: 'IN', lat: 28.2761, lng: 76.1492, tzOffsetMin: 330 },
  { name: 'Fatehabad', state: 'Haryana', country: 'IN', lat: 29.5152, lng: 75.4444, tzOffsetMin: 330 },
  { name: 'Jhajjar', state: 'Haryana', country: 'IN', lat: 28.6072, lng: 76.6566, tzOffsetMin: 330 },
  // UP tier-2/3
  { name: 'Aligarh', state: 'Uttar Pradesh', country: 'IN', lat: 27.8974, lng: 78.0880, tzOffsetMin: 330 },
  { name: 'Moradabad', state: 'Uttar Pradesh', country: 'IN', lat: 28.8386, lng: 78.7733, tzOffsetMin: 330 },
  { name: 'Saharanpur', state: 'Uttar Pradesh', country: 'IN', lat: 29.9680, lng: 77.5510, tzOffsetMin: 330 },
  { name: 'Bareilly', state: 'Uttar Pradesh', country: 'IN', lat: 28.3670, lng: 79.4304, tzOffsetMin: 330 },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', country: 'IN', lat: 26.7606, lng: 83.3732, tzOffsetMin: 330 },
  { name: 'Firozabad', state: 'Uttar Pradesh', country: 'IN', lat: 27.1591, lng: 78.3957, tzOffsetMin: 330 },
  { name: 'Jhansi', state: 'Uttar Pradesh', country: 'IN', lat: 25.4484, lng: 78.5685, tzOffsetMin: 330 },
  { name: 'Muzaffarnagar', state: 'Uttar Pradesh', country: 'IN', lat: 29.4727, lng: 77.7085, tzOffsetMin: 330 },
  { name: 'Mathura Vrindavan', state: 'Uttar Pradesh', country: 'IN', lat: 27.5371, lng: 77.6868, tzOffsetMin: 330 },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', country: 'IN', lat: 28.6692, lng: 77.4538, tzOffsetMin: 330 },
  { name: 'Allahabad', state: 'Uttar Pradesh', country: 'IN', lat: 25.4358, lng: 81.8463, tzOffsetMin: 330 },
  { name: 'Prayagraj', state: 'Uttar Pradesh', country: 'IN', lat: 25.4358, lng: 81.8463, tzOffsetMin: 330 },
  { name: 'Rampur', state: 'Uttar Pradesh', country: 'IN', lat: 28.8155, lng: 79.0277, tzOffsetMin: 330 },
  { name: 'Shahjahanpur', state: 'Uttar Pradesh', country: 'IN', lat: 27.8800, lng: 79.9100, tzOffsetMin: 330 },
  { name: 'Etawah', state: 'Uttar Pradesh', country: 'IN', lat: 26.7855, lng: 79.0150, tzOffsetMin: 330 },
  { name: 'Hapur', state: 'Uttar Pradesh', country: 'IN', lat: 28.7300, lng: 77.7800, tzOffsetMin: 330 },
  { name: 'Bulandshahr', state: 'Uttar Pradesh', country: 'IN', lat: 28.4070, lng: 77.8498, tzOffsetMin: 330 },
  { name: 'Sambhal', state: 'Uttar Pradesh', country: 'IN', lat: 28.5851, lng: 78.5687, tzOffsetMin: 330 },
  { name: 'Mirzapur', state: 'Uttar Pradesh', country: 'IN', lat: 25.1462, lng: 82.5697, tzOffsetMin: 330 },
  // Punjab tier-2/3
  { name: 'Patiala', state: 'Punjab', country: 'IN', lat: 30.3398, lng: 76.3869, tzOffsetMin: 330 },
  { name: 'Jalandhar', state: 'Punjab', country: 'IN', lat: 31.3260, lng: 75.5762, tzOffsetMin: 330 },
  { name: 'Bathinda', state: 'Punjab', country: 'IN', lat: 30.2110, lng: 74.9455, tzOffsetMin: 330 },
  { name: 'Mohali', state: 'Punjab', country: 'IN', lat: 30.7046, lng: 76.7179, tzOffsetMin: 330 },
  { name: 'Pathankot', state: 'Punjab', country: 'IN', lat: 32.2746, lng: 75.6521, tzOffsetMin: 330 },
  { name: 'Hoshiarpur', state: 'Punjab', country: 'IN', lat: 31.5320, lng: 75.9118, tzOffsetMin: 330 },
  { name: 'Moga', state: 'Punjab', country: 'IN', lat: 30.8138, lng: 75.1716, tzOffsetMin: 330 },
  { name: 'Firozpur', state: 'Punjab', country: 'IN', lat: 30.9259, lng: 74.6111, tzOffsetMin: 330 },
  // Rajasthan tier-2/3
  { name: 'Udaipur', state: 'Rajasthan', country: 'IN', lat: 24.5854, lng: 73.7125, tzOffsetMin: 330 },
  { name: 'Ajmer', state: 'Rajasthan', country: 'IN', lat: 26.4499, lng: 74.6399, tzOffsetMin: 330 },
  { name: 'Bikaner', state: 'Rajasthan', country: 'IN', lat: 28.0229, lng: 73.3119, tzOffsetMin: 330 },
  { name: 'Alwar', state: 'Rajasthan', country: 'IN', lat: 27.5530, lng: 76.6346, tzOffsetMin: 330 },
  { name: 'Bharatpur', state: 'Rajasthan', country: 'IN', lat: 27.2152, lng: 77.4977, tzOffsetMin: 330 },
  { name: 'Sikar', state: 'Rajasthan', country: 'IN', lat: 27.6094, lng: 75.1399, tzOffsetMin: 330 },
  { name: 'Mount Abu', state: 'Rajasthan', country: 'IN', lat: 24.5926, lng: 72.7156, tzOffsetMin: 330 },
  { name: 'Chittorgarh', state: 'Rajasthan', country: 'IN', lat: 24.8887, lng: 74.6269, tzOffsetMin: 330 },
  // Gujarat tier-2/3
  { name: 'Vadodara', state: 'Gujarat', country: 'IN', lat: 22.3072, lng: 73.1812, tzOffsetMin: 330 },
  { name: 'Surat', state: 'Gujarat', country: 'IN', lat: 21.1702, lng: 72.8311, tzOffsetMin: 330 },
  { name: 'Gandhinagar', state: 'Gujarat', country: 'IN', lat: 23.2156, lng: 72.6369, tzOffsetMin: 330 },
  { name: 'Bhavnagar', state: 'Gujarat', country: 'IN', lat: 21.7645, lng: 72.1519, tzOffsetMin: 330 },
  { name: 'Jamnagar', state: 'Gujarat', country: 'IN', lat: 22.4707, lng: 70.0577, tzOffsetMin: 330 },
  { name: 'Junagadh', state: 'Gujarat', country: 'IN', lat: 21.5222, lng: 70.4579, tzOffsetMin: 330 },
  { name: 'Anand', state: 'Gujarat', country: 'IN', lat: 22.5645, lng: 72.9289, tzOffsetMin: 330 },
  { name: 'Nadiad', state: 'Gujarat', country: 'IN', lat: 22.6916, lng: 72.8634, tzOffsetMin: 330 },
  // Maharashtra tier-2/3
  { name: 'Aurangabad', state: 'Maharashtra', country: 'IN', lat: 19.8762, lng: 75.3433, tzOffsetMin: 330 },
  { name: 'Solapur', state: 'Maharashtra', country: 'IN', lat: 17.6599, lng: 75.9064, tzOffsetMin: 330 },
  { name: 'Kolhapur', state: 'Maharashtra', country: 'IN', lat: 16.7050, lng: 74.2433, tzOffsetMin: 330 },
  { name: 'Amravati', state: 'Maharashtra', country: 'IN', lat: 20.9374, lng: 77.7796, tzOffsetMin: 330 },
  { name: 'Akola', state: 'Maharashtra', country: 'IN', lat: 20.7059, lng: 77.0219, tzOffsetMin: 330 },
  { name: 'Sangli', state: 'Maharashtra', country: 'IN', lat: 16.8524, lng: 74.5815, tzOffsetMin: 330 },
  { name: 'Latur', state: 'Maharashtra', country: 'IN', lat: 18.4088, lng: 76.5604, tzOffsetMin: 330 },
  { name: 'Dhule', state: 'Maharashtra', country: 'IN', lat: 20.9042, lng: 74.7749, tzOffsetMin: 330 },
  { name: 'Ahmednagar', state: 'Maharashtra', country: 'IN', lat: 19.0948, lng: 74.7480, tzOffsetMin: 330 },
  { name: 'Pandharpur', state: 'Maharashtra', country: 'IN', lat: 17.6789, lng: 75.3327, tzOffsetMin: 330 },
  { name: 'Trimbakeshwar', state: 'Maharashtra', country: 'IN', lat: 19.9333, lng: 73.5333, tzOffsetMin: 330 },
  // Karnataka tier-2/3
  { name: 'Mysuru', state: 'Karnataka', country: 'IN', lat: 12.2958, lng: 76.6394, tzOffsetMin: 330 },
  { name: 'Mysore', state: 'Karnataka', country: 'IN', lat: 12.2958, lng: 76.6394, tzOffsetMin: 330 },
  { name: 'Mangaluru', state: 'Karnataka', country: 'IN', lat: 12.9141, lng: 74.8560, tzOffsetMin: 330 },
  { name: 'Hubli', state: 'Karnataka', country: 'IN', lat: 15.3647, lng: 75.1240, tzOffsetMin: 330 },
  { name: 'Belgaum', state: 'Karnataka', country: 'IN', lat: 15.8497, lng: 74.4977, tzOffsetMin: 330 },
  { name: 'Davanagere', state: 'Karnataka', country: 'IN', lat: 14.4644, lng: 75.9218, tzOffsetMin: 330 },
  { name: 'Udupi', state: 'Karnataka', country: 'IN', lat: 13.3409, lng: 74.7421, tzOffsetMin: 330 },
  { name: 'Hampi', state: 'Karnataka', country: 'IN', lat: 15.3350, lng: 76.4600, tzOffsetMin: 330 },
  { name: 'Sringeri', state: 'Karnataka', country: 'IN', lat: 13.4181, lng: 75.2569, tzOffsetMin: 330 },
  { name: 'Dharwad', state: 'Karnataka', country: 'IN', lat: 15.4589, lng: 75.0078, tzOffsetMin: 330 },
  // Tamil Nadu tier-2/3
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'IN', lat: 10.7905, lng: 78.7047, tzOffsetMin: 330 },
  { name: 'Trichy', state: 'Tamil Nadu', country: 'IN', lat: 10.7905, lng: 78.7047, tzOffsetMin: 330 },
  { name: 'Salem', state: 'Tamil Nadu', country: 'IN', lat: 11.6643, lng: 78.1460, tzOffsetMin: 330 },
  { name: 'Tirunelveli', state: 'Tamil Nadu', country: 'IN', lat: 8.7139, lng: 77.7567, tzOffsetMin: 330 },
  { name: 'Vellore', state: 'Tamil Nadu', country: 'IN', lat: 12.9165, lng: 79.1325, tzOffsetMin: 330 },
  { name: 'Erode', state: 'Tamil Nadu', country: 'IN', lat: 11.3410, lng: 77.7172, tzOffsetMin: 330 },
  { name: 'Thanjavur', state: 'Tamil Nadu', country: 'IN', lat: 10.7870, lng: 79.1378, tzOffsetMin: 330 },
  { name: 'Dindigul', state: 'Tamil Nadu', country: 'IN', lat: 10.3673, lng: 77.9803, tzOffsetMin: 330 },
  { name: 'Tuticorin', state: 'Tamil Nadu', country: 'IN', lat: 8.7642, lng: 78.1348, tzOffsetMin: 330 },
  { name: 'Chidambaram', state: 'Tamil Nadu', country: 'IN', lat: 11.4070, lng: 79.6932, tzOffsetMin: 330 },
  { name: 'Tiruvannamalai', state: 'Tamil Nadu', country: 'IN', lat: 12.2253, lng: 79.0747, tzOffsetMin: 330 },
  // Andhra/Telangana tier-2/3
  { name: 'Tirupati', state: 'Andhra Pradesh', country: 'IN', lat: 13.6288, lng: 79.4192, tzOffsetMin: 330 },
  { name: 'Guntur', state: 'Andhra Pradesh', country: 'IN', lat: 16.3067, lng: 80.4365, tzOffsetMin: 330 },
  { name: 'Nellore', state: 'Andhra Pradesh', country: 'IN', lat: 14.4426, lng: 79.9865, tzOffsetMin: 330 },
  { name: 'Kurnool', state: 'Andhra Pradesh', country: 'IN', lat: 15.8281, lng: 78.0373, tzOffsetMin: 330 },
  { name: 'Kakinada', state: 'Andhra Pradesh', country: 'IN', lat: 16.9891, lng: 82.2475, tzOffsetMin: 330 },
  { name: 'Rajahmundry', state: 'Andhra Pradesh', country: 'IN', lat: 17.0005, lng: 81.8040, tzOffsetMin: 330 },
  { name: 'Warangal', state: 'Telangana', country: 'IN', lat: 17.9689, lng: 79.5941, tzOffsetMin: 330 },
  { name: 'Nizamabad', state: 'Telangana', country: 'IN', lat: 18.6725, lng: 78.0941, tzOffsetMin: 330 },
  { name: 'Karimnagar', state: 'Telangana', country: 'IN', lat: 18.4386, lng: 79.1288, tzOffsetMin: 330 },
  { name: 'Khammam', state: 'Telangana', country: 'IN', lat: 17.2473, lng: 80.1514, tzOffsetMin: 330 },
  // Kerala tier-2/3
  { name: 'Thiruvananthapuram', state: 'Kerala', country: 'IN', lat: 8.5241, lng: 76.9366, tzOffsetMin: 330 },
  { name: 'Trivandrum', state: 'Kerala', country: 'IN', lat: 8.5241, lng: 76.9366, tzOffsetMin: 330 },
  { name: 'Kochi', state: 'Kerala', country: 'IN', lat: 9.9312, lng: 76.2673, tzOffsetMin: 330 },
  { name: 'Ernakulam', state: 'Kerala', country: 'IN', lat: 9.9816, lng: 76.2999, tzOffsetMin: 330 },
  { name: 'Kozhikode', state: 'Kerala', country: 'IN', lat: 11.2588, lng: 75.7804, tzOffsetMin: 330 },
  { name: 'Calicut', state: 'Kerala', country: 'IN', lat: 11.2588, lng: 75.7804, tzOffsetMin: 330 },
  { name: 'Thrissur', state: 'Kerala', country: 'IN', lat: 10.5276, lng: 76.2144, tzOffsetMin: 330 },
  { name: 'Kollam', state: 'Kerala', country: 'IN', lat: 8.8932, lng: 76.6141, tzOffsetMin: 330 },
  { name: 'Alappuzha', state: 'Kerala', country: 'IN', lat: 9.4981, lng: 76.3388, tzOffsetMin: 330 },
  { name: 'Palakkad', state: 'Kerala', country: 'IN', lat: 10.7867, lng: 76.6548, tzOffsetMin: 330 },
  { name: 'Kannur', state: 'Kerala', country: 'IN', lat: 11.8745, lng: 75.3704, tzOffsetMin: 330 },
  { name: 'Sabarimala', state: 'Kerala', country: 'IN', lat: 9.4368, lng: 77.0810, tzOffsetMin: 330 },
  // West Bengal tier-2/3
  { name: 'Howrah', state: 'West Bengal', country: 'IN', lat: 22.5958, lng: 88.2636, tzOffsetMin: 330 },
  { name: 'Durgapur', state: 'West Bengal', country: 'IN', lat: 23.5204, lng: 87.3119, tzOffsetMin: 330 },
  { name: 'Asansol', state: 'West Bengal', country: 'IN', lat: 23.6889, lng: 86.9661, tzOffsetMin: 330 },
  { name: 'Siliguri', state: 'West Bengal', country: 'IN', lat: 26.7271, lng: 88.3953, tzOffsetMin: 330 },
  { name: 'Darjeeling', state: 'West Bengal', country: 'IN', lat: 27.0410, lng: 88.2663, tzOffsetMin: 330 },
  { name: 'Malda', state: 'West Bengal', country: 'IN', lat: 25.0096, lng: 88.1393, tzOffsetMin: 330 },
  { name: 'Kharagpur', state: 'West Bengal', country: 'IN', lat: 22.3460, lng: 87.2320, tzOffsetMin: 330 },
  { name: 'Bardhaman', state: 'West Bengal', country: 'IN', lat: 23.2324, lng: 87.8615, tzOffsetMin: 330 },
  // Bihar tier-2/3
  { name: 'Gaya', state: 'Bihar', country: 'IN', lat: 24.7914, lng: 85.0002, tzOffsetMin: 330 },
  { name: 'Muzaffarpur', state: 'Bihar', country: 'IN', lat: 26.1209, lng: 85.3647, tzOffsetMin: 330 },
  { name: 'Bhagalpur', state: 'Bihar', country: 'IN', lat: 25.2425, lng: 86.9842, tzOffsetMin: 330 },
  { name: 'Darbhanga', state: 'Bihar', country: 'IN', lat: 26.1542, lng: 85.8918, tzOffsetMin: 330 },
  { name: 'Bihar Sharif', state: 'Bihar', country: 'IN', lat: 25.1979, lng: 85.5161, tzOffsetMin: 330 },
  { name: 'Sitamarhi', state: 'Bihar', country: 'IN', lat: 26.5950, lng: 85.4924, tzOffsetMin: 330 },
  // Odisha tier-2/3
  { name: 'Bhubaneswar', state: 'Odisha', country: 'IN', lat: 20.2961, lng: 85.8245, tzOffsetMin: 330 },
  { name: 'Cuttack', state: 'Odisha', country: 'IN', lat: 20.4625, lng: 85.8830, tzOffsetMin: 330 },
  { name: 'Rourkela', state: 'Odisha', country: 'IN', lat: 22.2604, lng: 84.8536, tzOffsetMin: 330 },
  { name: 'Sambalpur', state: 'Odisha', country: 'IN', lat: 21.4669, lng: 83.9756, tzOffsetMin: 330 },
  { name: 'Berhampur', state: 'Odisha', country: 'IN', lat: 19.3149, lng: 84.7941, tzOffsetMin: 330 },
  { name: 'Konark', state: 'Odisha', country: 'IN', lat: 19.8876, lng: 86.0945, tzOffsetMin: 330 },
  // Jharkhand tier-2/3
  { name: 'Jamshedpur', state: 'Jharkhand', country: 'IN', lat: 22.8046, lng: 86.2029, tzOffsetMin: 330 },
  { name: 'Dhanbad', state: 'Jharkhand', country: 'IN', lat: 23.7957, lng: 86.4304, tzOffsetMin: 330 },
  { name: 'Bokaro', state: 'Jharkhand', country: 'IN', lat: 23.6693, lng: 86.1511, tzOffsetMin: 330 },
  { name: 'Deoghar', state: 'Jharkhand', country: 'IN', lat: 24.4827, lng: 86.6973, tzOffsetMin: 330 },
  { name: 'Hazaribagh', state: 'Jharkhand', country: 'IN', lat: 23.9925, lng: 85.3585, tzOffsetMin: 330 },
  // Chhattisgarh tier-2/3
  { name: 'Bilaspur', state: 'Chhattisgarh', country: 'IN', lat: 22.0797, lng: 82.1391, tzOffsetMin: 330 },
  { name: 'Bhilai', state: 'Chhattisgarh', country: 'IN', lat: 21.2090, lng: 81.3279, tzOffsetMin: 330 },
  { name: 'Korba', state: 'Chhattisgarh', country: 'IN', lat: 22.3458, lng: 82.6963, tzOffsetMin: 330 },
  { name: 'Durg', state: 'Chhattisgarh', country: 'IN', lat: 21.1904, lng: 81.2849, tzOffsetMin: 330 },
  // MP tier-2/3
  { name: 'Sagar', state: 'Madhya Pradesh', country: 'IN', lat: 23.8388, lng: 78.7378, tzOffsetMin: 330 },
  { name: 'Rewa', state: 'Madhya Pradesh', country: 'IN', lat: 24.5364, lng: 81.3037, tzOffsetMin: 330 },
  { name: 'Satna', state: 'Madhya Pradesh', country: 'IN', lat: 24.5704, lng: 80.8333, tzOffsetMin: 330 },
  { name: 'Ratlam', state: 'Madhya Pradesh', country: 'IN', lat: 23.3315, lng: 75.0367, tzOffsetMin: 330 },
  { name: 'Chhindwara', state: 'Madhya Pradesh', country: 'IN', lat: 22.0574, lng: 78.9382, tzOffsetMin: 330 },
  { name: 'Omkareshwar', state: 'Madhya Pradesh', country: 'IN', lat: 22.2455, lng: 76.1457, tzOffsetMin: 330 },
  { name: 'Maheshwar', state: 'Madhya Pradesh', country: 'IN', lat: 22.1758, lng: 75.5859, tzOffsetMin: 330 },
  // North-East
  { name: 'Guwahati', state: 'Assam', country: 'IN', lat: 26.1445, lng: 91.7362, tzOffsetMin: 330 },
  { name: 'Silchar', state: 'Assam', country: 'IN', lat: 24.8333, lng: 92.7789, tzOffsetMin: 330 },
  { name: 'Dibrugarh', state: 'Assam', country: 'IN', lat: 27.4728, lng: 94.9120, tzOffsetMin: 330 },
  { name: 'Imphal', state: 'Manipur', country: 'IN', lat: 24.8170, lng: 93.9368, tzOffsetMin: 330 },
  { name: 'Shillong', state: 'Meghalaya', country: 'IN', lat: 25.5788, lng: 91.8933, tzOffsetMin: 330 },
  { name: 'Aizawl', state: 'Mizoram', country: 'IN', lat: 23.7307, lng: 92.7173, tzOffsetMin: 330 },
  { name: 'Kohima', state: 'Nagaland', country: 'IN', lat: 25.6701, lng: 94.1077, tzOffsetMin: 330 },
  { name: 'Agartala', state: 'Tripura', country: 'IN', lat: 23.8315, lng: 91.2868, tzOffsetMin: 330 },
  { name: 'Gangtok', state: 'Sikkim', country: 'IN', lat: 27.3389, lng: 88.6065, tzOffsetMin: 330 },
  { name: 'Itanagar', state: 'Arunachal Pradesh', country: 'IN', lat: 27.0844, lng: 93.6053, tzOffsetMin: 330 },
  // Uttarakhand tier-2/3
  { name: 'Haldwani', state: 'Uttarakhand', country: 'IN', lat: 29.2183, lng: 79.5130, tzOffsetMin: 330 },
  { name: 'Roorkee', state: 'Uttarakhand', country: 'IN', lat: 29.8543, lng: 77.8880, tzOffsetMin: 330 },
  { name: 'Nainital', state: 'Uttarakhand', country: 'IN', lat: 29.3919, lng: 79.4542, tzOffsetMin: 330 },
  { name: 'Mussoorie', state: 'Uttarakhand', country: 'IN', lat: 30.4598, lng: 78.0644, tzOffsetMin: 330 },
  // J&K + Ladakh + HP
  { name: 'Jammu', state: 'J&K', country: 'IN', lat: 32.7266, lng: 74.8570, tzOffsetMin: 330 },
  { name: 'Katra', state: 'J&K', country: 'IN', lat: 32.9914, lng: 74.9329, tzOffsetMin: 330 },
  { name: 'Leh', state: 'Ladakh', country: 'IN', lat: 34.1526, lng: 77.5770, tzOffsetMin: 330 },
  { name: 'Shimla', state: 'Himachal Pradesh', country: 'IN', lat: 31.1048, lng: 77.1734, tzOffsetMin: 330 },
  { name: 'Manali', state: 'Himachal Pradesh', country: 'IN', lat: 32.2396, lng: 77.1887, tzOffsetMin: 330 },
  { name: 'Dharamshala', state: 'Himachal Pradesh', country: 'IN', lat: 32.2190, lng: 76.3234, tzOffsetMin: 330 },
  { name: 'Kullu', state: 'Himachal Pradesh', country: 'IN', lat: 31.9579, lng: 77.1095, tzOffsetMin: 330 },
  { name: 'Solan', state: 'Himachal Pradesh', country: 'IN', lat: 30.9045, lng: 77.0967, tzOffsetMin: 330 },
  { name: 'Bilaspur HP', state: 'Himachal Pradesh', country: 'IN', lat: 31.3503, lng: 76.7635, tzOffsetMin: 330 },
  { name: 'Mandi', state: 'Himachal Pradesh', country: 'IN', lat: 31.7081, lng: 76.9319, tzOffsetMin: 330 },
  // Goa
  { name: 'Panaji', state: 'Goa', country: 'IN', lat: 15.4909, lng: 73.8278, tzOffsetMin: 330 },
  { name: 'Margao', state: 'Goa', country: 'IN', lat: 15.2832, lng: 73.9862, tzOffsetMin: 330 },
  { name: 'Vasco da Gama', state: 'Goa', country: 'IN', lat: 15.3960, lng: 73.8157, tzOffsetMin: 330 },
  // Pondicherry
  { name: 'Pondicherry', state: 'Puducherry', country: 'IN', lat: 11.9416, lng: 79.8083, tzOffsetMin: 330 },
  { name: 'Puducherry', state: 'Puducherry', country: 'IN', lat: 11.9416, lng: 79.8083, tzOffsetMin: 330 },
  // Andaman
  { name: 'Port Blair', state: 'Andaman', country: 'IN', lat: 11.6234, lng: 92.7265, tzOffsetMin: 330 },
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
