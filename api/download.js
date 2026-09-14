import crypto from 'node:crypto';

const CLOUDINARY_HOST = 'res.cloudinary.com';

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeFilename(value, fallback) {
  const filename = String(value || fallback)
    .replace(/[\\/"']/g, '_')
    .replace(/[^a-zA-Z0-9._() -]/g, '_')
    .slice(0, 180)
    .trim();
  return filename || fallback;
}

function getCloudinaryDownloadUrl(sourceUrl) {
  const parsed = new URL(sourceUrl);
  if (parsed.hostname !== CLOUDINARY_HOST) return parsed;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const deliveryIndex = segments.findIndex((segment) => segment === 'upload');
  if (deliveryIndex === -1) return parsed;

  const suffix = segments.slice(deliveryIndex + 1);
  const versionIndex = suffix.findIndex((segment) => /^v\d+$/.test(segment));
  if (versionIndex === -1) return parsed;

  const transformations = suffix.slice(0, versionIndex).filter((segment) => !/^s--[^-]+--$/.test(segment));
  if (!transformations.includes('fl_attachment')) transformations.push('fl_attachment');

  const publicPath = suffix.slice(versionIndex + 1).join('/');
  const version = suffix[versionIndex];
  const secret = process.env.CLOUDINARY_API_SECRET;
  const signature = secret
    ? crypto.createHash('sha1')
        .update(transformations.join('/') + '/' + publicPath + secret)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
        .slice(0, 8)
    : '';

  const rebuilt = [
    ...segments.slice(0, deliveryIndex + 1),
    ...(signature ? ['s--' + signature + '--'] : []),
    ...transformations,
    version,
    ...publicPath.split('/'),
  ];
  parsed.pathname = '/' + rebuilt.join('/');
  return parsed;
}

function getContentType(sourceUrl, filename, upstreamType) {
  if (/\.pdf(?:$|[?#])/i.test(sourceUrl) || /\.pdf$/i.test(filename)) return 'application/pdf';
  if (/\.epub(?:$|[?#])/i.test(sourceUrl) || /\.epub$/i.test(filename)) return 'application/epub+zip';
  return upstreamType || 'application/octet-stream';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sourceUrl = getQueryValue(req.query.url);
  if (!sourceUrl) return res.status(400).json({ error: 'URL required' });

  let parsedSource;
  try {
    parsedSource = new URL(sourceUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid download URL' });
  }

  if (parsedSource.protocol !== 'https:' || parsedSource.hostname !== CLOUDINARY_HOST) {
    return res.status(400).json({ error: 'Only Cloudinary book files are supported' });
  }

  const requestedFilename = getQueryValue(req.query.filename);
  const sourceFilename = decodeURIComponent(parsedSource.pathname.split('/').pop() || 'book');
  const filename = getSafeFilename(requestedFilename, sourceFilename);
  const downloadUrl = getCloudinaryDownloadUrl(parsedSource);

  try {
    const response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers: {
        Accept: 'application/pdf, application/epub+zip, application/octet-stream, */*',
        'User-Agent': 'Grace Book download service',
      },
    });

    if (!response.ok) {
      console.error('Cloudinary download failed', response.status, response.headers.get('x-cld-error'));
      return res.status(502).json({ error: 'Book file is not available for download' });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', getContentType(sourceUrl, filename, response.headers.get('content-type')));
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error('Book download proxy failed', error);
    return res.status(502).json({ error: 'Book download failed' });
  }
}
