import supabase from '../db/supabaseClient.js';
import { getAccessToken } from './graphservice.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
//storageService.js - handles uploading files to Supabase Storage and generating public URLs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET = process.env.SUPABASE_BUCKET || 'openclaw-media';

// ─── Get permanent public URL from Supabase Storage ──────────────────────────
function getPublicUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function getContentType(ext) {
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
  };
  return map[ext?.toLowerCase()] || 'application/octet-stream';
}

// ─── Convert SharePoint URL to Graph API shares download URL ─────────────────
// SharePoint URLs return 401 with direct Bearer token fetch.
// The correct approach is to encode the URL as base64 and use the shares API.
function toGraphSharesUrl(sharePointUrl) {
  const encoded = Buffer.from(sharePointUrl).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `https://graph.microsoft.com/v1.0/shares/u!${encoded}/driveItem/content`;
}

// ─── Download Teams file with multiple fallback methods ───────────────────────
async function downloadTeamsFile(url, token) {
  // Method 1: Graph API hosted contents URL (already authenticated)
  if (url.includes('graph.microsoft.com')) {
    console.log(`📥 Downloading via Graph API: ${url.slice(0, 80)}...`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 0) return buffer;
    }
    console.warn(`⚠️ Graph API direct fetch failed: ${res.status}`);
  }

  // Method 2: SharePoint URL via Graph shares API
  if (url.includes('sharepoint.com') || url.includes('onedrive.com')) {
    console.log(`📥 Trying Graph shares API for SharePoint URL...`);
    try {
      const sharesUrl = toGraphSharesUrl(url);
      const res = await fetch(sharesUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 0) {
          console.log(`✅ Downloaded via Graph shares API`);
          return buffer;
        }
      }
      console.warn(`⚠️ Graph shares API failed: ${res.status}`);
    } catch (err) {
      console.warn(`⚠️ Graph shares API error: ${err.message}`);
    }
  }

  // Method 3: Direct fetch (for public/temp URLs like localhost or Supabase)
  console.log(`📥 Trying direct fetch: ${url.slice(0, 80)}...`);
  const res = await fetch(url);
  if (res.ok) {
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 0) return buffer;
  }

  throw new Error(`All download methods failed for: ${url.slice(0, 80)}`);
}

// ─── Upload Teams file to Supabase ───────────────────────────────────────────
export async function uploadTeamsFileToSupabase(url, name, sourceId, messageId, token = null) {
  try {
    const authToken = token || await getAccessToken();
    const buffer = await downloadTeamsFile(url, authToken);

    const ext = name.split('.').pop()?.toLowerCase() || 'bin';
    const safeName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `teams-media/${safeName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: getContentType(ext),
        upsert: true,
      });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const publicUrl = getPublicUrl(storagePath);
    console.log(`✅ Teams file uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`❌ uploadTeamsFileToSupabase error:`, err.message);
    return null;
  }
}

// ─── Upload raw image buffer to Supabase ─────────────────────────────────────
export async function uploadImageBuffer(buffer, filename, contentType = 'application/octet-stream') {
  try {
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `message-images/${safeName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const publicUrl = getPublicUrl(storagePath);
    console.log(`✅ Image public URL: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`❌ uploadImageBuffer error:`, err.message);
    return null;
  }
}

// ─── Upload Slack file to Supabase ────────────────────────────────────────────
export async function uploadSlackFileToSupabase(fileUrl, filename, contentType) {
  try {
    console.log(`📥 Downloading Slack file: ${filename}`);

    const response = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }
    });

    if (!response.ok) throw new Error(`Slack download failed: ${response.status}`);

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('text/html') || ct.includes('application/json')) {
      throw new Error(`Slack returned non-binary response (${ct}) — check SLACK_BOT_TOKEN and files:read scope`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw new Error('Slack returned empty file');

    console.log(`📦 Downloaded ${(buffer.length / 1024).toFixed(1)} KB`);

    const resolvedContentType = ct.startsWith('image/') ? ct.split(';')[0] : (contentType || 'image/png');
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // ─── Save local copy for dashboard preview ────────────────────────────
    const tempDir = path.join(__dirname, '..', 'public', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, safeName), buffer);
    const localUrl = `http://localhost:${process.env.PORT || 5000}/temp/${safeName}`;

    // ─── Upload to Supabase ───────────────────────────────────────────────
    const storagePath = `slack-media/${safeName}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: resolvedContentType, upsert: false });

    if (error) {
      console.warn(`⚠️ Supabase upload failed: ${error.message} — using localhost URL`);
      return localUrl;
    }

    const publicUrl = getPublicUrl(storagePath);
    console.log(`✅ Slack file public URL: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error(`❌ uploadSlackFileToSupabase error:`, err.message);
    return null;
  }
}