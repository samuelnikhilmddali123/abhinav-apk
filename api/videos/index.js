import dbConnect from '../_lib/db';
import { Video } from '../_lib/models';

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
      const videos = await Video.find({}).sort({ createdAt: -1 });
      return res.status(200).json(videos);
    } catch (error) {
       return res.status(500).json({ error: 'Failed to fetch videos' });
    }
  }

  if (req.method === 'POST') {
    const { videos: newVideos } = req.body;
    try {
      if (Array.isArray(newVideos)) {
        await Video.deleteMany({});
        const result = await Video.insertMany(newVideos);
        return res.status(200).json({ success: true, videos: result });
      }
      return res.status(400).json({ error: 'Invalid videos data' });
    } catch (error) {
       return res.status(500).json({ error: 'Failed' });
    }
  }
}
