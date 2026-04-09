import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    // Run WhatsApp messages table migration
    const sqlFile1 = path.join(__dirname, 'migrations', 'create_whatsapp_messages_table.sql');
    const sql1 = fs.readFileSync(sqlFile1, 'utf8');
    console.log('🔄 Running WhatsApp messages table migration...');
    await query(sql1);
    console.log('✅ WhatsApp messages table created!');
    
    // Run WhatsApp mappings migration
    const sqlFile2 = path.join(__dirname, 'migrations', 'add_whatsapp_to_mappings.sql');
    const sql2 = fs.readFileSync(sqlFile2, 'utf8');
    console.log('🔄 Adding WhatsApp support to channel_mappings...');
    await pool.query(sql2);
    console.log('✅ WhatsApp mappings added!');
    
    // Run dismissed column migration
    const sqlFile3 = path.join(__dirname, 'migrations', 'add_dismissed_column.sql');
    const sql3 = fs.readFileSync(sqlFile3, 'utf8');
    console.log('🔄 Adding dismissed column to messages tables...');
    await pool.query(sql3);
    console.log('✅ Dismissed column added!');
    
    // Run group name migration
    const sqlFile4 = path.join(__dirname, 'migrations', 'add_group_name_to_whatsapp.sql');
    const sql4 = fs.readFileSync(sqlFile4, 'utf8');
    console.log('🔄 Adding group_name column to whatsapp_messages...');
    await pool.query(sql4);
    console.log('✅ Group name column added!');
    
    // Run dismissed column and group filtering migration
    const sqlFile5 = path.join(__dirname, 'migrations', 'add_dismissed_column_whatsapp.sql');
    const sql5 = fs.readFileSync(sqlFile5, 'utf8');
    console.log('🔄 Adding dismissed column and filtering groups...');
    await pool.query(sql5);
    console.log('✅ Dismissed column and group filtering completed!');
    
    // Run WhatsApp filtering fix migration
    const sqlFile6 = path.join(__dirname, 'migrations', 'fix_whatsapp_filtering.sql');
    const sql6 = fs.readFileSync(sqlFile6, 'utf8');
    console.log('🔄 Fixing WhatsApp group filtering...');
    await pool.query(sql6);
    console.log('✅ WhatsApp filtering fixed!');
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
