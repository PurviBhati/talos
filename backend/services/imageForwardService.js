import { uploadTeamsFileToSupabase } from './storageService.js';
import { query } from '../db/index.js';
import whatsappBot from './whatsappBot.js';
import { getAccessToken } from './graphservice.js';

//imageForwardService.js

export async function forwardTeamsFilesToWhatsApp(savedId, files, sender, text) {
  const updatedFiles = [];

  try {
    const msgRes = await query(
      `SELECT source_id, chat_name, message_id FROM teams_messages WHERE id = $1`,
      [savedId]
    );
    const msg = msgRes.rows[0];
    if (!msg) {
      console.warn(`⚠️ No message found for id ${savedId}`);
      return updatedFiles;
    }

    // ─── 1. Upload all files to Supabase, collect publicUrls ─────────────
    const token = await getAccessToken();
    for (const file of files) {
      if (!file.url || !file.name) continue;

      const publicUrl = await uploadTeamsFileToSupabase(
        file.url, file.name, msg.source_id, msg.message_id, token
      );

      updatedFiles.push({ ...file, publicUrl: publicUrl || null });

      if (publicUrl) {
        console.log(`📦 Uploaded to Supabase: ${publicUrl}`);
      } else {
        console.warn(`⚠️ Upload failed for: ${file.name}`);
      }
    }

    // ─── 2. Update DB with publicUrls ────────────────────────────────────
    if (updatedFiles.length > 0) {
      await query(
        `UPDATE teams_messages SET files = $1::jsonb WHERE id = $2`,
        [JSON.stringify(updatedFiles), savedId]
      );
      console.log(`✅ DB updated: ${updatedFiles.length} file(s) for message ${savedId}`);
    }

    // ─── 3. Get WhatsApp group from channel_mappings ──────────────────────
    const mappingRes = await query(
      `SELECT whatsapp_group_name FROM channel_mappings 
       WHERE teams_chat_id = $1 AND active = true AND whatsapp_group_name IS NOT NULL
       LIMIT 1`,
      [msg.source_id]
    );
    const mapping = mappingRes.rows[0];
    const groupName = mapping?.whatsapp_group_name;

    if (!groupName) {
      console.warn(`⚠️ No WhatsApp group mapped for chat ${msg.source_id} — skipping WA forward`);
      return updatedFiles;
    }

    // ─── 4. Forward each image file to WhatsApp group ────────────────────
    for (const file of updatedFiles) {
      const mediaUrl = file.publicUrl;
      if (!mediaUrl) {
        console.warn(`⚠️ Skipping WA send for ${file.name} — no publicUrl`);
        continue;
      }

      const isImage = /\.(png|jpe?g|gif|webp)$/i.test(file.name);
      if (!isImage) {
        console.log(`⏭️ Skipping non-image file for WA: ${file.name}`);
        continue;
      }

      const caption = `*From Appsrow*\n${text || ''}`.trim();
      try {
        await whatsappBot.sendToGroup(groupName, caption, mediaUrl);
        console.log(`✅ Sent ${file.name} to WhatsApp group: ${groupName}`);
      } catch (err) {
        console.error(`❌ WA send failed for group ${groupName}: ${err.message}`);
      }
    }

  } catch (err) {
    console.error(`❌ forwardTeamsFilesToWhatsApp error:`, err.message);
  }

  return updatedFiles;
}