import dbConnect from '../_lib/db';
import { Alert } from '../_lib/models';

export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await dbConnect();
  } catch (error) {
    return res.status(500).json({ error: 'DB Connection Failed' });
  }

  if (req.method === 'GET') {
    try {
      const alerts = await Alert.find({}).sort({ createdAt: -1 }).limit(10);
      return res.status(200).json(alerts);
    } catch (error) {
       return res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  }

  if (req.method === 'POST') {
    const { alerts } = req.body;
    try {
      if (Array.isArray(alerts)) {
        await Alert.deleteMany({});
        const result = await Alert.insertMany(alerts);
         return res.status(200).json({ success: true, alerts: result });
      }
      return res.status(400).json({ error: 'Invalid alerts data' });
    } catch (error) {
       return res.status(500).json({ error: 'Failed' });
    }
  }
}
