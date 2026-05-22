import dbConnect from '../_lib/db';
import { Rate } from '../_lib/models';

export default async function handler(req, res) {
  // Add CORS headers for web deployment
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Fallback defaults in case DB is not yet setup or fails
  const defaults = {
    gold: 152000,
    silver: 238000,
    '945': { ask: 152000, bid: 152000, high: 152000, low: 152000 },
    '2966': { ask: 238000, bid: 238000, high: 238000, low: 238000 },
    '2987': { ask: 238000, bid: 238000, high: 238000, low: 238000 },
    lastUpdated: new Date().toISOString(),
    isFallback: true
  };

  try {
    await dbConnect();
  } catch (error) {
    console.error('DB Connection Error:', error);
    if (req.method === 'GET') return res.status(200).json(defaults);
    return res.status(500).json({ error: 'DB Connection Failed' });
  }
  
  if (req.method === 'GET') {
    try {
      const ratesList = await Rate.find({});
      if (!ratesList || ratesList.length === 0) {
        return res.status(200).json(defaults);
      }

      const result = { lastUpdated: new Date().toISOString() };
      ratesList.forEach(r => {
        result[r.metal] = r.current || 0;
        if (r.metal === 'gold') result['945'] = { ask: r.current, bid: r.current, high: r.current, low: r.current };
        if (r.metal === 'silver') {
          result['2966'] = { ask: r.current, bid: r.current, high: r.current, low: r.current };
          result['2987'] = { ask: r.current, bid: r.current, high: r.current, low: r.current };
        }
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(200).json(defaults);
    }
  }

  if (req.method === 'POST') {
    const { metal, change, current } = req.body;
    try {
      let rate = await Rate.findOne({ metal });
      if (!rate) {
        rate = new Rate({ metal, current: current || 0 });
      }
      if (change !== undefined) {
        rate.current = rate.current + Number(change);
      } else if (current !== undefined) {
        rate.current = Number(current);
      }
      rate.updatedAt = Date.now();
      await rate.save();
      return res.status(200).json({ success: true, rate });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update rate globally' });
    }
  }
}
