export const BASE_URL = 'https://www.abhinavgoldandsilver.com/api';

export const API_ENDPOINTS = {
  /** Legacy Mongo snapshot — not used for live display (see liveRates fetch pipeline). */
  RATES: `${BASE_URL}/rates`,
  /** Same persisted raw feed as abhanav-website (`/api/rates/live`). */
  RATES_LIVE: `${BASE_URL}/rates/live`,
  /** Same rate/ticker/stock settings document as the website admin (`RateContext`). */
  RATE_SETTINGS: `${BASE_URL}/rates/settings`,
  SETTINGS: `${BASE_URL}/settings`,
  VIDEOS: `${BASE_URL}/videos`,
  ALERTS: `${BASE_URL}/alerts`,
};
