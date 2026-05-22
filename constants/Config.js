export const BASE_URL = 'https://api.abhinavgoldandsilver.com/api/';
export const FILE_ROOT = 'https://api.abhinavgoldandsilver.com';
export const WEBSITE_URL = 'https://www.abhinavgoldandsilver.com';


export const API_ENDPOINTS = {
  /** Legacy Mongo snapshot — not used for live display (see liveRates fetch pipeline). */
  RATES: BASE_URL ? `${BASE_URL}rates` : '',
  /** Same persisted raw feed as abhanav-website (`/api/rates/live`). */
  RATES_LIVE: BASE_URL ? `${BASE_URL}rates/live` : '',
  /** Same rate/ticker/stock settings document as the website admin (`RateContext`). */
  RATE_SETTINGS: BASE_URL ? `${BASE_URL}rates/settings` : '',
  SETTINGS: BASE_URL ? `${BASE_URL}settings` : '',
  VIDEOS: BASE_URL ? `${BASE_URL}videos` : '',
  ALERTS: BASE_URL ? `${BASE_URL}alerts` : '',
  MUSIC: BASE_URL ? `${BASE_URL}music` : '',
};
