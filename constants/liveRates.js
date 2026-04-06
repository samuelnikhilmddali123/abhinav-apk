/** Same XML feed used by admin, home, and rates — keep parsing in one place. */
export const LIVE_RATES_XML_URL =
  'https://bcast.rbgoldspot.com:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/rbgold';

export function parseLiveRatesXml(text) {
  const newRates = {};
  const clean = (v) => (typeof v === 'string' ? v.trim() : v);

  const lines = (text || '').trim().split('\n');
  lines.forEach((rawLine) => {
    const line = (rawLine || '').trim();
    if (!line) return;

    // Endpoint usually returns tab-separated rows. Some responses may include
    // leading empty column(s), so we normalize before destructuring.
    const parts = line.split('\t').map(clean);
    if (parts.length < 7) return;

    // If the first column is empty, shift left by 1.
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
