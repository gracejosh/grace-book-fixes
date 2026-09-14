export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Download failed' });
    }

    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ error: 'Download failed' });
  }
}
