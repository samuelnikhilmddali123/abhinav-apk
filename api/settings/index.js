import dbConnect from '../_lib/db';
import { Setting } from '../_lib/models';

export default async function handler(req, res) {
  // CORS Support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Ensure devices always get latest global settings.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await dbConnect();
  } catch (error) {
    return res.status(500).json({ error: 'DB Connection Failed' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await Setting.findOne({ key: 'global_settings' });
      if (!settings) {
        const initial = new Setting({ key: 'global_settings' });
        await initial.save();
        return res.status(200).json(initial);
      }
      return res.status(200).json(settings);
    } catch (error) {
       return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  if (req.method === 'POST') {
    const { settings: newSettings } = req.body;
    try {
      const updated = await Setting.findOneAndUpdate(
        { key: 'global_settings' },
        { ...newSettings, updatedAt: Date.now() },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true, settings: updated });
    } catch (error) {
       return res.status(500).json({ error: 'Failed to save settings globally' });
    }
  }
}
