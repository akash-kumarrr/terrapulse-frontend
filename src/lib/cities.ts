import type { City } from './types'

/**
 * Delhi is precomputed on the API and always responds. The others are
 * composited on demand through Earth Engine: usually they work, but the
 * server's Earth Engine session can be unavailable, in which case the
 * request fails with an auth error rather than returning data. `precomputed`
 * marks which of the two a city is, so the picker can say so honestly.
 */
export const CITIES: City[] = [
  {
    id: 'delhi',
    name: 'Delhi',
    state: 'Delhi',
    query: { city: 'delhi', state: 'delhi' },
    center: [28.6139, 77.209],
    precomputed: true,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    query: { city: 'mumbai', state: 'maharashtra' },
    center: [19.076, 72.8777],
    precomputed: false,
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    query: { city: 'bengaluru', state: 'karnataka' },
    center: [12.9716, 77.5946],
    precomputed: false,
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    query: { city: 'hyderabad', state: 'telangana' },
    center: [17.385, 78.4867],
    precomputed: false,
  },
  {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    query: { city: 'chennai', state: 'tamil nadu' },
    center: [13.0827, 80.2707],
    precomputed: false,
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    query: { city: 'kolkata', state: 'west bengal' },
    center: [22.5726, 88.3639],
    precomputed: false,
  },
  {
    id: 'ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    query: { city: 'ahmedabad', state: 'gujarat' },
    center: [23.0225, 72.5714],
    precomputed: false,
  },
  {
    id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    query: { city: 'pune', state: 'maharashtra' },
    center: [18.5204, 73.8567],
    precomputed: false,
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    query: { city: 'jaipur', state: 'rajasthan' },
    center: [26.9124, 75.7873],
    precomputed: false,
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    query: { city: 'lucknow', state: 'uttar pradesh' },
    center: [26.8467, 80.9462],
    precomputed: false,
  },
  {
    id: 'nagpur',
    name: 'Nagpur',
    state: 'Maharashtra',
    query: { city: 'nagpur', state: 'maharashtra' },
    center: [21.1458, 79.0882],
    precomputed: false,
  },
  {
    id: 'surat',
    name: 'Surat',
    state: 'Gujarat',
    query: { city: 'surat', state: 'gujarat' },
    center: [21.1702, 72.8311],
    precomputed: false,
  },
]

export const DEFAULT_CITY = CITIES[0]
