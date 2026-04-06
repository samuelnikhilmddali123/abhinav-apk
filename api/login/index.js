export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { username, password } = req.body;
    
    // Simple mock authentication for your convenience
    if (username === 'admin' && (password === 'admin' || password === 'admin123')) {
      return res.status(200).json({ success: true, user: { role: 'admin' } });
    }
    
    return res.status(401).json({ success: false, error: 'Invalid Credentials' });
  }
}
