export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const isPdf = url.toLowerCase().includes('.pdf');

  const headers = {
    'User-Agent': 'Mozilla/5.0',
  };
  if (isPdf) {
    headers['Accept'] = 'application/pdf';
  } else {
    headers['Accept'] = '*/*';
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers,
    });

    if (!response.ok) {
      // Fallback: redirect to Cloudinary directly
      return res.redirect(url);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || (isPdf ? 'application/pdf' : 'application/octet-stream');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.send(Buffer.from(buffer));
  } catch (error) {
    // Fallback: redirect to Cloudinary directly
    return res.redirect(url);
  }
}
