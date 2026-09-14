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

  // For PDFs, add fl_attachment to Cloudinary URL to force download
  let downloadUrl = url;
  if (isPdf && downloadUrl.includes('cloudinary.com') && !downloadUrl.includes('fl_attachment')) {
    const sep = downloadUrl.includes('?') ? '&' : '?';
    downloadUrl = downloadUrl + sep + 'fl_attachment=true';
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0',
  };
  if (isPdf) {
    headers['Accept'] = 'application/pdf,application/octet-stream,*/*';
  } else {
    headers['Accept'] = '*/*';
  }

  try {
    const response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers,
    });

    if (!response.ok) {
      // Fallback: redirect to Cloudinary directly
      return res.redirect(downloadUrl);
    }

    const buffer = await response.arrayBuffer();

    // Force correct content-type for PDFs regardless of what Cloudinary returns
    const contentType = isPdf
      ? 'application/pdf'
      : (response.headers.get('content-type') || 'application/octet-stream');

    // Build Content-Disposition with filename for PDFs
    let disposition = 'attachment';
    if (isPdf) {
      const urlPath = new URL(downloadUrl).pathname;
      const filename = decodeURIComponent(urlPath.split('/').pop()) || 'download.pdf';
      disposition = `attachment; filename="${filename}"`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.send(Buffer.from(buffer));
  } catch (error) {
    // Fallback: redirect to Cloudinary directly
    return res.redirect(downloadUrl);
  }
}
