import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Main proxy route ─────────────────────────────────────────────────────────
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    // ── Supabase URLs: use SDK with service key (bypasses RLS entirely) ────────
    if (url.includes('supabase.co')) {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');

      // Handle both:
      //   /storage/v1/object/public/bucket/path
      //   /functions/v1/serve-media?bucket=X&path=Y  (old edge function URLs)
      let bucket, filePath;

      if (url.includes('functions/v1/serve-media')) {
        bucket = urlObj.searchParams.get('bucket') || process.env.SUPABASE_BUCKET || 'openclaw-media';
        filePath = decodeURIComponent(urlObj.searchParams.get('path') || '');
      } else {
        const publicIndex = parts.indexOf('public');
        if (publicIndex === -1) return res.status(400).json({ error: 'Invalid Supabase URL' });
        bucket = parts[publicIndex + 1];
        filePath = parts.slice(publicIndex + 2).join('/');
      }

      console.log(`📁 Supabase proxy: ${bucket}/${filePath}`);

      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) {
        console.error('❌ Supabase download error:', error.message);
        return res.status(500).json({ error: error.message });
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const ext = filePath.split('.').pop()?.toLowerCase();
      const contentType =
        ext === 'png'  ? 'image/png'  :
        ext === 'gif'  ? 'image/gif'  :
        ext === 'webp' ? 'image/webp' :
        ext === 'svg'  ? 'image/svg+xml' :
        'image/jpeg';

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      return res.send(buffer);
    }

    // ── Non-Supabase URLs (Teams, SharePoint, etc.) ───────────────────────────
    const fileUrl = new URL(url);
    const allowedDomains = [
      'graph.microsoft.com',
      'sharepoint.com',
      'onedrive.com',
      'office.com',
      'microsoftonline.com',
      'slack.com',
      'localhost',
      'ngrok-free.dev',
    ];
    const isAllowed = allowedDomains.some(d =>
      fileUrl.hostname.endsWith(d) || fileUrl.hostname === d
    );
    if (!isAllowed) return res.status(403).json({ error: 'Domain not allowed' });

    console.log(`📁 Proxying non-Supabase URL: ${url}`);
    const headers = {};
    if (fileUrl.hostname.endsWith('slack.com')) {
      headers.Authorization = `Bearer ${process.env.SLACK_BOT_TOKEN}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) return res.status(response.status).json({ error: response.statusText });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    return res.send(buffer);

  } catch (error) {
    console.error('❌ File proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Info/health check route ──────────────────────────────────────────────────
router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    const response = await fetch(url, { method: 'HEAD' });
    res.json({
      accessible: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;