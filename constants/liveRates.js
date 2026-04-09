/**
 * Live rate feed — aligned with abhanav-website `src/context/RateContext.jsx`:
 * same bcast URL, same whitespace row parser, same `/api/rates/live` fallback.
 */

export const LIVE_RATES_XML_URL =
  'https://bcast.rbgoldspot.com:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/rbgold';

/** Same IDs/order as website INITIAL_SPOT_CONFIG / INITIAL_RTGS_CONFIG */
const INITIAL_SPOT_CONFIG = [
  { id: '3101', name: 'GOLD ($)' },
  { id: '3107', name: 'SILVER ($)' },
  { id: '3103', name: 'USD-INR (₹)' },
];

const INITIAL_RTGS_CONFIG = [
  { id: '945', name: 'Gold 999 (100 grams)', factor: 10 },
  { id: '2966', name: 'Silver 999 (30 KGS)', factor: 1 },
  { id: '2987', name: 'Silver 999 (5 KGS)', factor: 1 },
];

function strVal(v) {
  if (v === undefined || v === null || v === '-') return '-';
  return typeof v === 'number' ? String(v) : String(v);
}

/**
 * Legacy tab-separated parser (kept as fallback if feed is tab-delimited).
 */
export function parseLiveRatesXml(text) {
  const newRates = {};
  const clean = (v) => (typeof v === 'string' ? v.trim() : v);

  const lines = (text || '').trim().split('\n');
  lines.forEach((rawLine) => {
    const line = (rawLine || '').trim();
    if (!line) return;

    const parts = line.split('\t').map(clean);
    if (parts.length < 7) return;

    if (parts[0] === '' && parts.length >= 8) {
      const [, id, symbol, bid, ask, high, low, status] = parts;
      if (id) newRates[id] = { symbol, bid, ask, high, low, status };
      return;
    }

    const [id, symbol, bid, ask, high, low, status] = parts;
    if (id) newRates[id] = { symbol, bid, ask, high, low, status };
  });
  return newRates;
}

/**
 * Website-identical row parser: whitespace-separated tokens (see RateContext.parseRateText).
 */
export function parseLiveRateText(text) {
  if (!text || typeof text !== 'string') {
    return { spot: [], rtgs: [], dataMap: {} };
  }

  const cleanText = text.replace(/\r/g, '').trim();
  const rows = cleanText.split('\n');
  const dataMap = {};

  rows.forEach((rawRow) => {
    const trimmed = rawRow.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) return;

    const id = parts[0];
    let stockStr = '';
    let low = '-';
    let high = '-';
    let ask = '-';
    let bid = '-';
    let nameEndIdx = parts.length;

    const lastPart = parts[parts.length - 1].toLowerCase();
    const hasStock = lastPart.includes('stock');

    if (hasStock) {
      stockStr = parts[parts.length - 1];
      low = parts[parts.length - 2];
      high = parts[parts.length - 3];
      ask = parts[parts.length - 4];
      bid = parts[parts.length - 5];
      nameEndIdx = parts.length - 5;
    } else {
      low = parts[parts.length - 1];
      high = parts[parts.length - 2];
      ask = parts[parts.length - 3];
      bid = parts[parts.length - 4];
      nameEndIdx = parts.length - 4;
    }

    const name = parts.slice(1, nameEndIdx).join(' ');

    const parseVal = (v) => {
      if (!v || v === '-') return '-';
      const num = parseFloat(String(v).replace(/,/g, ''));
      return Number.isNaN(num) ? '-' : num;
    };

    const pBid = parseVal(bid);
    const pAsk = parseVal(ask);

    const row = {
      id,
      name,
      bid: pBid !== '-' ? pBid : pAsk,
      ask: pAsk,
      high: parseVal(high),
      low: parseVal(low),
      stock: hasStock ? stockStr.toLowerCase().includes('instock') : true,
    };

    dataMap[id] = row;
    if (name) dataMap[name.toLowerCase()] = row;
  });

  const spot = INITIAL_SPOT_CONFIG.map((conf) => {
    const it = dataMap[conf.id] || dataMap[conf.name.toLowerCase()];
    return it
      ? { ...it }
      : { ...conf, bid: '-', ask: '-', high: '-', low: '-', stock: false };
  });

  const rtgs = INITIAL_RTGS_CONFIG.map((conf) => {
    const it = dataMap[conf.id] || (conf.name && dataMap[conf.name.toLowerCase()]);
    if (!it) return { ...conf, buy: '-', sell: '-', stock: false };

    return {
      id: it.id,
      name: conf.name,
      buy: it.bid,
      sell: it.ask,
      stock: it.stock,
      low: it.low,
      high: it.high,
      factor: conf.factor || 1,
    };
  });

  return { spot, rtgs, dataMap };
}

/** Map used by app screens: id -> { bid, ask, high, low, symbol, status } */
export function parseLiveRateTextToIdMap(text) {
  const { spot, rtgs } = parseLiveRateText(text);
  const map = {};

  spot.forEach((s) => {
    if (!s.id) return;
    map[s.id] = {
      symbol: '',
      bid: strVal(s.bid),
      ask: strVal(s.ask),
      high: strVal(s.high),
      low: strVal(s.low),
      status: '',
    };
  });

  rtgs.forEach((r) => {
    if (!r.id) return;
    map[r.id] = {
      symbol: '',
      bid: strVal(r.buy),
      ask: strVal(r.sell),
      high: strVal(r.high),
      low: strVal(r.low),
      status: '',
    };
  });

  return map;
}

/**
 * Fetch raw text the same way as the website: direct bcast, then `/api/rates/live`.
 */
export async function fetchLiveRatesRawText(ratesLiveUrl) {
  const ts = Date.now();
  try {
    const r = await fetch(`${LIVE_RATES_XML_URL}?_=${ts}`, { cache: 'no-store' });
    if (r.ok) {
      const t = await r.text();
      if (t && t.length > 50) return t;
    }
  } catch (e) {
    /* ignore */
  }

  if (ratesLiveUrl) {
    try {
      const r = await fetch(`${ratesLiveUrl}?_=${ts}`, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (j.text && String(j.text).length > 50) return j.text;
      }
    } catch (e) {
      /* ignore */
    }
  }

  return null;
}

/**
 * Single source of truth for displayed rates: website parser + tab fallback for odd feeds.
 */
export async function fetchRatesIdMap(ratesLiveUrl) {
  const raw = await fetchLiveRatesRawText(ratesLiveUrl);
  if (!raw) return {};

  let map = parseLiveRateTextToIdMap(raw);

  const hasCore = map['945'] && map['945'].ask && map['945'].ask !== '-';
  if (!hasCore) {
    const tabMap = parseLiveRatesXml(raw);
    map = { ...tabMap, ...map };
  }

  return map;
}
