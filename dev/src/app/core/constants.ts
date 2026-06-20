// src/app/core/constants.ts
// Major Indian cities & Tamil Nadu districts for location autocomplete.
export const DISTRICTS: string[] = [
  // Tamil Nadu
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
  'Vellore', 'Erode', 'Tiruppur', 'Thanjavur', 'Kanchipuram', 'Chengalpattu',
  'Dindigul', 'Karur', 'Nagapattinam', 'Namakkal', 'Theni', 'Villupuram',
  'Cuddalore', 'Kanyakumari', 'Thoothukudi', 'Tiruvallur', 'Virudhunagar',
  // Other major Indian cities
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad',
  'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
  'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Amritsar', 'Allahabad',
  'Chandigarh', 'Vijayawada', 'Vishakapatnam', 'Kochi', 'Thiruvananthapuram',
  'Thrissur', 'Kozhikode', 'Mysuru', 'Mangaluru', 'Hubli', 'Belagavi',
  'Guwahati', 'Bhubaneswar', 'Cuttack', 'Raipur', 'Dehradun', 'Jodhpur',
  'Udaipur', 'Kota', 'Ranchi', 'Jabalpur', 'Gwalior', 'Amravati',
];

// Provider-selectable highlight badges. A provider picks up to MAX_HIGHLIGHTS of
// these during profile setup; they render as the coloured badges on the browse
// card and public profile. Keep `value` in sync with the server's HIGHLIGHT_VALUES.
export interface ProviderHighlight { value: string; label: string; icon: string; }
export const PROVIDER_HIGHLIGHTS: ProviderHighlight[] = [
  { value: 'quick_response',    label: 'Quick Response',     icon: 'bi-lightning-charge-fill' },
  { value: 'free_consultation', label: 'Free Consultation',  icon: 'bi-chat-heart-fill' },
  { value: 'home_visits',       label: 'Home Visits',        icon: 'bi-house-door-fill' },
  { value: 'emergency_24x7',    label: '24×7 / Emergency',   icon: 'bi-clock-history' },
  { value: 'affordable',        label: 'Affordable Pricing', icon: 'bi-cash-coin' },
  { value: 'experienced',       label: 'Experienced Pro',    icon: 'bi-award-fill' },
];
export const MAX_HIGHLIGHTS = 3;
