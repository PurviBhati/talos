import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
//fileService.js - handles saving files to temp directory and generating public URLs via ngrok
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '../temp_media');

// Create temp dir if not exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Save buffer to temp file, return public ngrok URL
 */
export function saveTempFile(buffer, filename) {
  const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(TEMP_DIR, safeName);
  fs.writeFileSync(filePath, buffer);

  const ngrokUrl = process.env.NGROK_URL; // e.g. https://nonallegiance-comfortedly-brandon.ngrok-free.app
  const publicUrl = `${ngrokUrl}/temp/${safeName}`;

  // Auto-delete after 5 minutes
  setTimeout(() => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Temp file deleted: ${safeName}`);
    }
  }, 5 * 60 * 1000);

  return publicUrl;
}

export { TEMP_DIR };