
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await pool.query(
      "SELECT id, sender, body, timestamp, source_id, approval_status, ai_reasoning FROM teams_messages WHERE (timestamp AT TIME ZONE 'Asia/Kolkata')::date = $1 ORDER BY timestamp DESC LIMIT 10;",
      [today]
    );
    console.log(`Total messages today (${today}): ${res.rows.length}`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
