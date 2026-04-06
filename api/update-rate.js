import dbConnect from './_lib/db';
import { Rate } from './_lib/models';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  await dbConnect();
  
  const { metal, change, current } = req.body;
  if (!metal) return res.status(400).json({ error: 'Missing metal type' });

  try {
    let rate = await Rate.findOne({ metal });
    if (!rate) {
      rate = new Rate({ metal, current: current || 0 });
    }

    if (change !== undefined) {
      // Global Update Logic: 15000 + 3000 = 18000
      rate.current = (rate.current || 0) + Number(change);
    } else if (current !== undefined) {
      rate.current = Number(current);
    }

    rate.updatedAt = Date.now();
    await rate.save();

    return res.status(200).json({ 
      success: true, 
      metal, 
      newRate: rate.current,
      updatedAt: rate.updatedAt 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Database update failed' });
  }
}
